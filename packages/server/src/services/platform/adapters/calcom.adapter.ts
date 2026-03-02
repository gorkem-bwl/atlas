import { logger } from '../../../utils/logger';
import type { AppProvisioningAdapter, ProvisioningContext, AdapterSetupContext, GetUserResult } from './base.adapter';

async function calFetch(baseUrl: string, path: string, token: string, options: RequestInit = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  return res;
}

export class CalcomAdapter implements AppProvisioningAdapter {

  async provisionUser(ctx: ProvisioningContext): Promise<{ appUserId: string }> {
    const res = await calFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/users`, ctx.adminApiToken, {
      method: 'POST',
      body: JSON.stringify({
        email: ctx.userEmail,
        name: ctx.userName,
        role: ctx.appRole,
      }),
    });

    if (res.status === 409) {
      logger.info({ email: ctx.userEmail }, 'Cal.com user already exists, skipping creation');
      const existing = await this.getUser(ctx);
      if (existing.exists && existing.appUserId) {
        return { appUserId: existing.appUserId };
      }
      return { appUserId: ctx.userEmail };
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Cal.com provisionUser failed (${res.status}): ${body}`);
    }

    const user = await res.json() as { user?: { id: number }; id?: number };
    return { appUserId: String(user.user?.id || user.id) };
  }

  async updateUserRole(ctx: ProvisioningContext): Promise<void> {
    const existing = await this.getUser(ctx);
    if (!existing.exists || !existing.appUserId) {
      throw new Error(`Cal.com user not found: ${ctx.userEmail}`);
    }

    const res = await calFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/users/${existing.appUserId}`, ctx.adminApiToken, {
      method: 'PATCH',
      body: JSON.stringify({
        role: ctx.appRole,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Cal.com updateUserRole failed (${res.status}): ${body}`);
    }
  }

  async deprovisionUser(ctx: ProvisioningContext): Promise<void> {
    const existing = await this.getUser(ctx);
    if (!existing.exists || !existing.appUserId) {
      logger.info({ email: ctx.userEmail }, 'Cal.com user not found during deprovision — already removed');
      return;
    }

    const res = await calFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/users/${existing.appUserId}`, ctx.adminApiToken, {
      method: 'DELETE',
    });

    if (res.status === 404) {
      logger.info({ email: ctx.userEmail }, 'Cal.com user not found during deprovision — already removed');
      return;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Cal.com deprovisionUser failed (${res.status}): ${body}`);
    }
  }

  async getUser(ctx: ProvisioningContext): Promise<GetUserResult> {
    const res = await calFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/users?email=${encodeURIComponent(ctx.userEmail)}`, ctx.adminApiToken);

    if (!res.ok) {
      if (res.status === 404) return { exists: false };
      const body = await res.text();
      throw new Error(`Cal.com getUser failed (${res.status}): ${body}`);
    }

    const data = await res.json() as { users?: any[] } | any[];
    const users = Array.isArray(data) ? data : ((data as any).users || []);

    const user = users.find((u: any) => u.email === ctx.userEmail);
    if (!user) return { exists: false };

    return {
      exists: true,
      appUserId: String(user.id),
      currentRole: user.role,
    };
  }

  async setupAdminToken(ctx: AdapterSetupContext): Promise<string> {
    // Cal.com uses platform API keys injected via CALCOM_API_KEY env var during install
    const apiKey = ctx.envVars?.CALCOM_API_KEY;
    if (!apiKey) {
      throw new Error('Cal.com API key not available — CALCOM_API_KEY env var not set');
    }
    return apiKey;
  }
}
