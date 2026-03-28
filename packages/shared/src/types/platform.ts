// ─── Atlas Platform Types ────────────────────────────────────────────

export type TenantPlan = 'starter' | 'pro' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'deleted';
export type TenantMemberRole = 'owner' | 'admin' | 'member';

// ─── Tenant ──────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: TenantPlan;
  status: TenantStatus;
  ownerId: string;
  k8sNamespace: string;
  quotaCpu: number;
  quotaMemoryMb: number;
  quotaStorageMb: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantInput {
  slug: string;
  name: string;
  plan?: TenantPlan;
}

export interface TenantMember {
  tenantId: string;
  userId: string;
  role: TenantMemberRole;
  createdAt: string;
}

// ─── Registration & Auth ─────────────────────────────────────────────

export interface RegisterTenantInput {
  companyName: string;
  companySlug: string;
  userName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateTenantUserInput {
  email: string;
  name: string;
  password: string;
  role?: TenantMemberRole;
}

export interface TenantInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: TenantMemberRole;
  invitedBy: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface TenantUser {
  userId: string;
  email: string;
  name: string | null;
  role: TenantMemberRole;
  createdAt: string;
}
