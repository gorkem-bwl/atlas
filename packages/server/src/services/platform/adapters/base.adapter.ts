// ─── Base Provisioning Adapter Interface ─────────────────────────────

export interface ProvisioningContext {
  installationId: string;
  appBaseUrl: string;
  adminApiToken: string;
  adminApiBasePath: string;
  userId: string;
  userEmail: string;
  userName: string;
  appRole: string; // already mapped to app-native role
}

export interface AdapterSetupContext {
  installationId: string;
  appBaseUrl: string;
  adminApiBasePath: string;
  adminEmail: string;
  adminName: string;
  envVars: Record<string, string>; // container env vars for credential extraction
}

export interface GetUserResult {
  exists: boolean;
  appUserId?: string;
  currentRole?: string;
}

export interface AppProvisioningAdapter {
  provisionUser(ctx: ProvisioningContext): Promise<{ appUserId: string }>;
  updateUserRole(ctx: ProvisioningContext): Promise<void>;
  deprovisionUser(ctx: ProvisioningContext): Promise<void>;
  getUser(ctx: ProvisioningContext): Promise<GetUserResult>;
  setupAdminToken(ctx: AdapterSetupContext): Promise<string>;
}
