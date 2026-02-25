import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import * as authService from '../services/auth.service';
import { triggerInitialSync } from '../services/sync.service';
import { db } from '../config/database';
import { accounts } from '../db/schema';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export async function getAuthUrl(req: Request, res: Response) {
  const redirectUri = req.query.redirect_uri as string || `${req.protocol}://${req.get('host')}/api/v1/auth/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/calendar')}` +
    `&access_type=offline` +
    `&prompt=consent`;

  res.json({ success: true, data: { url } });
}

export async function handleCallback(req: Request, res: Response) {
  try {
    const { code, redirectUri } = req.body;
    logger.info({ hasCode: !!code, redirectUri }, 'Auth callback received');

    if (!code) {
      res.status(400).json({ success: false, error: 'Missing authorization code' });
      return;
    }

    logger.info('Exchanging code for tokens...');
    const tokens = await authService.exchangeCodeForTokens(code, redirectUri);
    logger.info({ hasAccessToken: !!tokens.access_token }, 'Tokens received');

    const userInfo = await authService.getGoogleUserInfo(tokens.access_token!);
    logger.info({ email: userInfo.email }, 'User info fetched');

    const { account, isNew } = await authService.findOrCreateAccount(userInfo, tokens);
    logger.info({ accountId: account.id, isNew }, 'Account ready');

    const jwtTokens = authService.generateTokens(account);

    // Enqueue a full sync for brand-new accounts so their mailbox is populated.
    // Existing accounts are kept up to date by the periodic incremental sync.
    if (isNew) {
      triggerInitialSync(account.id).catch((err) =>
        logger.error({ err, accountId: account.id }, 'Failed to enqueue initial sync'),
      );
    }

    res.json({
      success: true,
      data: {
        accessToken: jwtTokens.accessToken,
        refreshToken: jwtTokens.refreshToken,
        account: {
          id: account.id,
          email: account.email,
          name: account.name,
          pictureUrl: account.pictureUrl,
          provider: account.provider,
          providerId: account.providerId,
          historyId: account.historyId ?? null,
          lastSync: account.lastSync ?? null,
          syncStatus: account.syncStatus as 'idle' | 'syncing' | 'error',
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const detail = (error as any)?.response?.data || (error as any)?.code || '';
    console.error('AUTH CALLBACK ERROR:', message, detail);
    logger.error({ error, message, detail }, 'Auth callback failed');
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
    const newTokens = authService.generateTokens({ id: payload.accountId, email: payload.email });

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
      syncStatus: accounts.syncStatus,
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
