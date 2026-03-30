import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import * as authService from '../services/auth.service';
import { db } from '../config/database';
import { accounts, users, passwordResetTokens } from '../db/schema';
import { logger } from '../utils/logger';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../utils/password';
import * as tenantService from '../services/platform/tenant.service';
import { isGoogleConfigured, getAuthUrl, exchangeCode, createOAuth2Client } from '../services/google-auth';
import { encrypt, decrypt } from '../utils/crypto';
import { env } from '../config/env';

// ─── Setup ──────────────────────────────────────────────────────────

export async function getSetupStatus(_req: Request, res: Response) {
  try {
    const userCount = await authService.getUserCount();
    res.json({ success: true, data: { needsSetup: userCount === 0 } });
  } catch (error) {
    logger.error({ error }, 'Failed to check setup status');
    res.status(500).json({ success: false, error: 'Failed to check setup status' });
  }
}

export async function setup(req: Request, res: Response) {
  try {
    const userCount = await authService.getUserCount();
    if (userCount > 0) {
      res.status(409).json({ success: false, error: 'Atlas has already been set up' });
      return;
    }

    const { adminName, adminEmail, adminPassword, companyName } = req.body;

    if (!adminName || !adminEmail || !adminPassword || !companyName) {
      res.status(400).json({ success: false, error: 'adminName, adminEmail, adminPassword, and companyName are required' });
      return;
    }

    const strength = validatePasswordStrength(adminPassword);
    if (!strength.valid) {
      res.status(400).json({ success: false, error: strength.error });
      return;
    }

    // Generate slug from company name
    const slug = companyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 63);

    if (!slug) {
      res.status(400).json({ success: false, error: 'Company name must contain at least one alphanumeric character' });
      return;
    }

    // Create user + account
    const passwordHash = await hashPassword(adminPassword);
    const { user, account } = await authService.createPasswordAccount({
      email: adminEmail,
      name: adminName,
      passwordHash,
    });

    // Mark as super admin
    await db.update(users).set({ isSuperAdmin: true }).where(eq(users.id, user.id));

    // Create the single tenant
    const tenant = await tenantService.createTenant({ slug, name: companyName }, user.id);

    // Generate tokens (with tenant + superAdmin)
    const jwtTokens = authService.generateTokens(account, tenant.id, true);

    logger.info({ userId: user.id, tenantId: tenant.id, email: adminEmail }, 'Atlas initial setup completed');

    res.status(201).json({
      success: true,
      data: {
        accessToken: jwtTokens.accessToken,
        refreshToken: jwtTokens.refreshToken,
        account: {
          id: account.id,
          userId: account.userId,
          email: account.email,
          name: account.name,
          pictureUrl: account.pictureUrl,
          provider: account.provider,
          providerId: account.providerId,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        },
        tenant,
      },
    });
  } catch (error: any) {
    // Race condition: another request completed setup first
    if (error?.code === '23505') {
      res.status(409).json({ success: false, error: 'Atlas has already been set up' });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error, message }, 'Setup failed');
    res.status(500).json({ success: false, error: message });
  }
}

// ─── Login ──────────────────────────────────────────────────────────

export async function loginWithPassword(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const account = await authService.findAccountByEmail(email);
    if (!account || !account.passwordHash) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const isValid = await verifyPassword(password, account.passwordHash);
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    let tenantId: string | undefined;
    try {
      const tenants = await tenantService.listTenantsForUser(account.userId);
      if (tenants.length > 0) {
        tenantId = tenants[0].id;
      }
    } catch { /* proceed without tenantId */ }

    const isSuperAdmin = await authService.isUserSuperAdmin(account.userId);
    const jwtTokens = authService.generateTokens(account, tenantId, isSuperAdmin);

    res.json({
      success: true,
      data: {
        accessToken: jwtTokens.accessToken,
        refreshToken: jwtTokens.refreshToken,
        account: {
          id: account.id,
          userId: account.userId,
          email: account.email,
          name: account.name,
          pictureUrl: account.pictureUrl,
          provider: account.provider,
          providerId: account.providerId,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error, message }, 'Login failed');
    res.status(500).json({ success: false, error: message });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Missing refresh token' });
      return;
    }

    const payload = authService.verifyRefreshToken(refreshToken);

    let userId = payload.userId;
    if (!userId) {
      const [acct] = await db.select({ userId: accounts.userId })
        .from(accounts)
        .where(eq(accounts.id, payload.accountId))
        .limit(1);
      userId = acct?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Account not found' });
        return;
      }
    }

    let tenantId: string | undefined;
    try {
      const tenants = await tenantService.listTenantsForUser(userId);
      if (tenants.length > 0) {
        tenantId = tenants[0].id;
      }
    } catch { /* proceed without tenantId */ }

    const isSuperAdmin = await authService.isUserSuperAdmin(userId);

    const newTokens = authService.generateTokens({
      id: payload.accountId,
      email: payload.email,
      userId,
    }, tenantId, isSuperAdmin);

    res.json({
      success: true,
      data: { accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken },
    });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const [account] = await db.select({
      id: accounts.id,
      email: accounts.email,
      name: accounts.name,
      pictureUrl: accounts.pictureUrl,
      provider: accounts.provider,
    })
      .from(accounts)
      .where(eq(accounts.id, req.auth!.accountId))
      .limit(1);

    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }

    res.json({ success: true, data: account });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch account');
    res.status(500).json({ success: false, error: 'Failed to fetch account' });
  }
}

export async function listAccounts(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const userAccounts = await authService.listUserAccounts(userId);
    res.json({ success: true, data: userAccounts });
  } catch (error) {
    logger.error({ error }, 'Failed to list user accounts');
    res.status(500).json({ success: false, error: 'Failed to list accounts' });
  }
}

export async function getInvitationDetails(req: Request, res: Response) {
  try {
    const tenantUserService = await import('../services/platform/tenant-user.service');

    const token = req.params.token as string;
    const invitation = await tenantUserService.getInvitation(token);
    if (!invitation) {
      res.status(404).json({ success: false, error: 'Invitation not found' });
      return;
    }

    if (invitation.acceptedAt) {
      res.status(410).json({ success: false, error: 'Invitation already accepted' });
      return;
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      res.status(410).json({ success: false, error: 'Invitation expired' });
      return;
    }

    const tenant = await tenantService.getTenantById(invitation.tenantId);

    res.json({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        tenantName: tenant?.name ?? 'Unknown',
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get invitation details');
    res.status(500).json({ success: false, error: 'Failed to get invitation details' });
  }
}

export async function acceptInvitation(req: Request, res: Response) {
  try {
    const tenantUserService = await import('../services/platform/tenant-user.service');

    const token = req.params.token as string;
    const { name, password } = req.body;

    if (!name || !password) {
      res.status(400).json({ success: false, error: 'name and password are required' });
      return;
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      res.status(400).json({ success: false, error: strength.error });
      return;
    }

    const result = await tenantUserService.acceptInvitation(token, { name, password });
    const jwtTokens = authService.generateTokens(result.account, result.tenantId);

    res.json({
      success: true,
      data: {
        accessToken: jwtTokens.accessToken,
        refreshToken: jwtTokens.refreshToken,
        account: {
          id: result.account.id,
          userId: result.account.userId,
          email: result.account.email,
          name: result.account.name,
          pictureUrl: result.account.pictureUrl,
          provider: result.account.provider,
          providerId: result.account.providerId,
          createdAt: result.account.createdAt,
          updatedAt: result.account.updatedAt,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error, message }, 'Failed to accept invitation');
    res.status(400).json({ success: false, error: message });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    const account = await authService.findAccountByEmail(email);
    if (!account || !account.passwordHash) {
      res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
      return;
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokens).values({
      accountId: account.id,
      token,
      expiresAt,
    });

    // TODO: Send password reset email when SMTP is configured
    logger.info({ email, token }, 'Password reset token generated');

    res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (error) {
    logger.error({ error }, 'Forgot password failed');
    res.json({ success: true, message: 'If an account exists with that email, a reset link has been sent.' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ success: false, error: 'Token and password are required' });
      return;
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      res.status(400).json({ success: false, error: strength.error });
      return;
    }

    const [resetRecord] = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token)).limit(1);

    if (!resetRecord) {
      res.status(400).json({ success: false, error: 'Invalid or expired reset link' });
      return;
    }

    if (resetRecord.usedAt) {
      res.status(400).json({ success: false, error: 'This reset link has already been used' });
      return;
    }

    if (new Date(resetRecord.expiresAt) < new Date()) {
      res.status(400).json({ success: false, error: 'This reset link has expired' });
      return;
    }

    const newHash = await hashPassword(password);
    await db.update(accounts).set({ passwordHash: newHash }).where(eq(accounts.id, resetRecord.accountId));
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetRecord.id));

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    logger.error({ error }, 'Reset password failed');
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
}

// ─── Google OAuth (CRM email/calendar sync) ────────────────────────

export async function googleConnect(req: Request, res: Response) {
  try {
    if (!isGoogleConfigured()) {
      res.status(501).json({ success: false, error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
      return;
    }

    const state = jwt.sign(
      { userId: req.auth!.userId, accountId: req.auth!.accountId },
      env.JWT_SECRET,
      { expiresIn: '10m' },
    );

    res.json({ success: true, data: { url: getAuthUrl(state) } });
  } catch (error) {
    logger.error({ error }, 'Failed to generate Google connect URL');
    res.status(500).json({ success: false, error: 'Failed to generate Google connect URL' });
  }
}

export async function googleCallback(req: Request, res: Response) {
  try {
    const stateParam = req.query.state as string;
    const code = req.query.code as string;

    if (!stateParam || !code) {
      res.redirect(`${env.CLIENT_PUBLIC_URL}/crm?google_error=true`);
      return;
    }

    // Verify state JWT
    const payload = jwt.verify(stateParam, env.JWT_SECRET) as { userId: string; accountId: string };
    const { accountId } = payload;

    // Exchange authorization code for tokens
    const tokens = await exchangeCode(code);

    // Encrypt tokens and update account
    await db.update(accounts).set({
      accessToken: encrypt(tokens.access_token!),
      refreshToken: encrypt(tokens.refresh_token!),
      tokenExpiresAt: new Date(tokens.expiry_date!),
      provider: 'google',
      syncStatus: 'pending',
      syncError: null,
      updatedAt: new Date(),
    }).where(eq(accounts.id, accountId));

    logger.info({ accountId }, 'Google account connected successfully');
    res.redirect(`${env.CLIENT_PUBLIC_URL}/crm?google_connected=true`);
  } catch (error) {
    logger.error({ error }, 'Google OAuth callback failed');
    res.redirect(`${env.CLIENT_PUBLIC_URL}/crm?google_error=true`);
  }
}

export async function googleDisconnect(req: Request, res: Response) {
  try {
    const accountId = req.auth!.accountId;

    // Best effort: revoke the token
    try {
      const [account] = await db.select({ accessToken: accounts.accessToken })
        .from(accounts).where(eq(accounts.id, accountId)).limit(1);
      if (account) {
        const token = decrypt(account.accessToken);
        if (token && token !== 'password-placeholder') {
          const client = createOAuth2Client();
          await client.revokeToken(token);
        }
      }
    } catch (revokeErr) {
      logger.warn({ revokeErr, accountId }, 'Failed to revoke Google token (best effort)');
    }

    // Reset account to password-only state
    await db.update(accounts).set({
      accessToken: encrypt('password-placeholder'),
      refreshToken: encrypt('password-placeholder'),
      provider: 'password',
      historyId: null,
      lastFullSync: null,
      syncStatus: 'idle',
      syncError: null,
      updatedAt: new Date(),
    }).where(eq(accounts.id, accountId));

    logger.info({ accountId }, 'Google account disconnected');
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to disconnect Google account');
    res.status(500).json({ success: false, error: 'Failed to disconnect Google account' });
  }
}
