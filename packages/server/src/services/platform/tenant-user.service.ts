import { eq, and, inArray } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../../config/database';
import { tenantMembers, tenantInvitations, accounts } from '../../db/schema';
import { hashPassword } from '../../utils/password';
import * as authService from '../auth.service';
import { logger } from '../../utils/logger';
import { sendInvitationEmail } from '../email.service';
import { getTenantById } from './tenant.service';
import type { TenantMemberRole } from '@atlasmail/shared';

export async function createTenantUser(
  tenantId: string,
  input: { email: string; name: string; password: string; role?: TenantMemberRole },
) {
  const passwordHash = await hashPassword(input.password);
  const { user, account } = await authService.createPasswordAccount({
    email: input.email,
    name: input.name,
    passwordHash,
  });

  await db.insert(tenantMembers).values({
    tenantId,
    userId: user.id,
    role: input.role ?? 'member',
  });

  logger.info({ tenantId, userId: user.id, email: input.email }, 'Tenant user created');

  return {
    userId: user.id,
    email: account.email,
    name: account.name,
    role: input.role ?? 'member',
    createdAt: account.createdAt,
  };
}

export async function listTenantUsers(tenantId: string) {
  // Get all members
  const members = await db
    .select()
    .from(tenantMembers)
    .where(eq(tenantMembers.tenantId, tenantId));

  if (members.length === 0) return [];

  // Batch-query accounts for user details using inArray
  const userIds = members.map((m) => m.userId);
  const userAccounts = await db
    .select({
      userId: accounts.userId,
      email: accounts.email,
      name: accounts.name,
    })
    .from(accounts)
    .where(inArray(accounts.userId, userIds));

  // Build a lookup map
  const accountMap = new Map<string, { email: string; name: string | null }>();
  for (const acct of userAccounts) {
    accountMap.set(acct.userId, { email: acct.email, name: acct.name });
  }

  return members.map((m) => {
    const acct = accountMap.get(m.userId);
    return {
      userId: m.userId,
      email: acct?.email ?? 'unknown',
      name: acct?.name ?? null,
      role: m.role as TenantMemberRole,
      createdAt: m.createdAt.toISOString(),
    };
  });
}

export async function removeTenantUser(tenantId: string, userId: string) {
  const result = await db
    .delete(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)));
  return result;
}

export async function updateTenantUserRole(tenantId: string, userId: string, role: TenantMemberRole) {
  await db
    .update(tenantMembers)
    .set({ role })
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)));
}

export async function inviteUser(tenantId: string, email: string, role: TenantMemberRole, invitedBy: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [invitation] = await db.insert(tenantInvitations).values({
    tenantId,
    email,
    role,
    invitedBy,
    token,
    expiresAt,
  }).returning();

  logger.info({ tenantId, email, invitationId: invitation.id }, 'User invited to tenant');

  // Send invitation email
  try {
    const tenant = await getTenantById(tenantId);
    await sendInvitationEmail(email, {
      tenantName: tenant?.name ?? 'your organization',
      role,
      token,
    });
  } catch (err) {
    logger.warn({ err, email, tenantId }, 'Failed to send invitation email — invitation created but email not sent');
  }

  return invitation;
}

export async function getInvitation(token: string) {
  const [invitation] = await db
    .select()
    .from(tenantInvitations)
    .where(eq(tenantInvitations.token, token))
    .limit(1);
  return invitation ?? null;
}

export async function acceptInvitation(token: string, input: { name: string; password: string }) {
  const [invitation] = await db
    .select()
    .from(tenantInvitations)
    .where(eq(tenantInvitations.token, token))
    .limit(1);

  if (!invitation) throw new Error('Invitation not found');
  if (invitation.acceptedAt) throw new Error('Invitation already accepted');
  if (new Date(invitation.expiresAt) < new Date()) throw new Error('Invitation expired');

  // Create user + account
  const passwordHash = await hashPassword(input.password);
  const { user, account } = await authService.createPasswordAccount({
    email: invitation.email,
    name: input.name,
    passwordHash,
  });

  // Add to tenant
  await db.insert(tenantMembers).values({
    tenantId: invitation.tenantId,
    userId: user.id,
    role: invitation.role,
  });

  // Mark invitation as accepted
  await db
    .update(tenantInvitations)
    .set({ acceptedAt: new Date() })
    .where(eq(tenantInvitations.id, invitation.id));

  logger.info({ tenantId: invitation.tenantId, userId: user.id, email: invitation.email }, 'Invitation accepted');

  return { user, account, tenantId: invitation.tenantId };
}
