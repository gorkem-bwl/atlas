import { logger } from '../../../utils/logger';
import type { AppProvisioningAdapter, ProvisioningContext, AdapterSetupContext, GetUserResult } from './base.adapter';

async function nocoFetch(baseUrl: string, path: string, token: string, options: RequestInit = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'xc-token': token,
      ...options.headers,
    },
  });
  return res;
}

export class NocoDBAdapter implements AppProvisioningAdapter {

  async provisionUser(ctx: ProvisioningContext): Promise<{ appUserId: string }> {
    const res = await nocoFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/users`, ctx.adminApiToken, {
      method: 'POST',
      body: JSON.stringify({
        email: ctx.userEmail,
        roles: ctx.appRole,
      }),
    });

    if (res.status === 409) {
      logger.info({ email: ctx.userEmail }, 'NocoDB user already exists, skipping creation');
      const existing = await this.getUser(ctx);
      if (existing.exists && existing.appUserId) {
        return { appUserId: existing.appUserId };
      }
      return { appUserId: ctx.userEmail };
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`NocoDB provisionUser failed (${res.status}): ${body}`);
    }

    const user = await res.json() as { id: number };
    return { appUserId: String(user.id) };
  }

  async updateUserRole(ctx: ProvisioningContext): Promise<void> {
    // First find the user by email
    const existing = await this.getUser(ctx);
    if (!existing.exists || !existing.appUserId) {
      throw new Error(`NocoDB user not found: ${ctx.userEmail}`);
    }

    const res = await nocoFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/users/${existing.appUserId}`, ctx.adminApiToken, {
      method: 'PATCH',
      body: JSON.stringify({
        roles: ctx.appRole,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`NocoDB updateUserRole failed (${res.status}): ${body}`);
    }
  }

  async deprovisionUser(ctx: ProvisioningContext): Promise<void> {
    const existing = await this.getUser(ctx);
    if (!existing.exists || !existing.appUserId) {
      logger.info({ email: ctx.userEmail }, 'NocoDB user not found during deprovision — already removed');
      return;
    }

    const res = await nocoFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/users/${existing.appUserId}`, ctx.adminApiToken, {
      method: 'DELETE',
    });

    if (res.status === 404) {
      logger.info({ email: ctx.userEmail }, 'NocoDB user not found during deprovision — already removed');
      return;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`NocoDB deprovisionUser failed (${res.status}): ${body}`);
    }
  }

  async getUser(ctx: ProvisioningContext): Promise<GetUserResult> {
    const res = await nocoFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/users?email=${encodeURIComponent(ctx.userEmail)}`, ctx.adminApiToken);

    if (!res.ok) {
      if (res.status === 404) return { exists: false };
      const body = await res.text();
      throw new Error(`NocoDB getUser failed (${res.status}): ${body}`);
    }

    const data = await res.json() as { list?: any[]; users?: any[] } | any[];
    const arr = Array.isArray(data) ? data : ((data as any).list || (data as any).users || []);

    const user = arr.find((u: any) => u.email === ctx.userEmail);
    if (!user) return { exists: false };

    return {
      exists: true,
      appUserId: String(user.id),
      currentRole: user.roles,
    };
  }

  async setupAdminToken(ctx: AdapterSetupContext): Promise<string> {
    // NocoDB: sign in with admin credentials and create a persistent API token
    const adminEmail = ctx.adminEmail;
    const adminPassword = ctx.envVars?.NC_ADMIN_PASSWORD || '';

    if (!adminPassword) {
      throw new Error('NocoDB admin password not available — cannot create API token');
    }

    // Sign in
    const signInRes = await fetch(`${ctx.appBaseUrl}${ctx.adminApiBasePath}/auth/user/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });

    if (!signInRes.ok) {
      const body = await signInRes.text();
      throw new Error(`NocoDB sign-in failed (${signInRes.status}): ${body}`);
    }

    const signInData = await signInRes.json() as { token: string };
    const authToken = signInData.token;

    // Create a persistent API token
    const tokenRes = await fetch(`${ctx.appBaseUrl}${ctx.adminApiBasePath}/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xc-auth': authToken,
      },
      body: JSON.stringify({
        description: `Atlas provisioning (${ctx.installationId.slice(0, 8)})`,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      throw new Error(`NocoDB token creation failed (${tokenRes.status}): ${body}`);
    }

    const tokenData = await tokenRes.json() as { token: string };
    return tokenData.token;
  }
}
