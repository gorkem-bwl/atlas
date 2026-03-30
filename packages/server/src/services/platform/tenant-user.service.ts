import { eq, and, inArray } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../../config/database';
import { tenantMembers, tenantInvitations, accounts } from '../../db/schema';
import { hashPassword } from '../../utils/password';
import * as authService from '../auth.service';
import { logger } from '../../utils/logger';
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

const PRIVILEGED_ROLES: TenantMemberRole[] = ['owner', 'admin'];

export class LastAdminError extends Error {
  readonly code = 'LAST_ADMIN' as const;
  constructor(message = 'Cannot remove or demote the last admin. Promote another user first.') {
    super(message);
  }
}

/** Single-query check: throws if userId is the last privileged member */
async function assertNotLastAdmin(tenantId: string, userId: string) {
  const admins = await db.select({ u: tenantMembers.userId })
    .from(tenantMembers)
    .where(and(
      eq(tenantMembers.tenantId, tenantId),
      inArray(tenantMembers.role, PRIVILEGED_ROLES),
    ));
  const targetIsAdmin = admins.some((r) => r.u === userId);
  if (targetIsAdmin && admins.length <= 1) {
    throw new LastAdminError();
  }
}

export async function removeTenantUser(tenantId: string, userId: string) {
  await assertNotLastAdmin(tenantId, userId);
  return db
    .delete(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)));
}

export async function updateTenantUserRole(tenantId: string, userId: string, role: TenantMemberRole) {
  if (role === 'member') {
    await assertNotLastAdmin(tenantId, userId);
  }
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

  // TODO: Send invitation email when SMTP is configured
  logger.info({ email, tenantId, token }, 'Invitation created (email sending not yet configured)');

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
