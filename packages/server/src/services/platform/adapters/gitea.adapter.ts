import crypto from 'node:crypto';
import { logger } from '../../../utils/logger';
import type { AppProvisioningAdapter, ProvisioningContext, AdapterSetupContext, GetUserResult } from './base.adapter';

function sanitizeUsername(email: string): string {
  const prefix = email.split('@')[0];
  return prefix
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'user';
}

async function giteaFetch(baseUrl: string, path: string, token: string, options: RequestInit = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${token}`,
      ...options.headers,
    },
  });
  return res;
}

export class GiteaAdapter implements AppProvisioningAdapter {

  async provisionUser(ctx: ProvisioningContext): Promise<{ appUserId: string }> {
    const username = sanitizeUsername(ctx.userEmail);
    const password = crypto.randomBytes(24).toString('base64url');
    const isAdmin = ctx.appRole === 'admin';

    const res = await giteaFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/admin/users`, ctx.adminApiToken, {
      method: 'POST',
      body: JSON.stringify({
        email: ctx.userEmail,
        username,
        full_name: ctx.userName,
        password,
        must_change_password: false,
        visibility: 'limited',
      }),
    });

    if (res.status === 409) {
      // User already exists — treat as success
      logger.info({ username, email: ctx.userEmail }, 'Gitea user already exists, skipping creation');
      const existing = await this.getUser(ctx);
      if (existing.exists && existing.appUserId) {
        return { appUserId: existing.appUserId };
      }
      return { appUserId: username };
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gitea provisionUser failed (${res.status}): ${body}`);
    }

    const user = await res.json() as { id: number };

    // Set admin/restricted status if needed
    if (isAdmin || ctx.appRole === 'restricted') {
      await giteaFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/admin/users/${username}`, ctx.adminApiToken, {
        method: 'PATCH',
        body: JSON.stringify({
          login_name: username,
          source_id: 0,
          is_admin: isAdmin,
          restricted: ctx.appRole === 'restricted',
        }),
      });
    }

    return { appUserId: String(user.id) };
  }

  async updateUserRole(ctx: ProvisioningContext): Promise<void> {
    const username = sanitizeUsername(ctx.userEmail);

    const res = await giteaFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/admin/users/${username}`, ctx.adminApiToken, {
      method: 'PATCH',
      body: JSON.stringify({
        login_name: username,
        source_id: 0,
        is_admin: ctx.appRole === 'admin',
        restricted: ctx.appRole === 'restricted',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gitea updateUserRole failed (${res.status}): ${body}`);
    }
  }

  async deprovisionUser(ctx: ProvisioningContext): Promise<void> {
    const username = sanitizeUsername(ctx.userEmail);

    // Soft disable: prohibit login and deactivate
    const res = await giteaFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/admin/users/${username}`, ctx.adminApiToken, {
      method: 'PATCH',
      body: JSON.stringify({
        login_name: username,
        source_id: 0,
        active: false,
        prohibit_login: true,
      }),
    });

    if (res.status === 404) {
      logger.info({ username }, 'Gitea user not found during deprovision — already removed');
      return;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gitea deprovisionUser failed (${res.status}): ${body}`);
    }
  }

  async getUser(ctx: ProvisioningContext): Promise<GetUserResult> {
    const username = sanitizeUsername(ctx.userEmail);

    const res = await giteaFetch(ctx.appBaseUrl, `${ctx.adminApiBasePath}/users/${username}`, ctx.adminApiToken);

    if (res.status === 404) {
      return { exists: false };
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gitea getUser failed (${res.status}): ${body}`);
    }

    const user = await res.json() as { id: number; is_admin: boolean; restricted: boolean };
    let role = 'user';
    if (user.is_admin) role = 'admin';
    else if (user.restricted) role = 'restricted';

    return {
      exists: true,
      appUserId: String(user.id),
      currentRole: role,
    };
  }

  async setupAdminToken(ctx: AdapterSetupContext): Promise<string> {
    // Gitea admin user is pre-created via env vars during install.
    // We use the admin credentials to create an API token.
    const adminUsername = ctx.envVars?.GITEA__admin__USER || 'atlas-admin';
    const adminPassword = ctx.envVars?.GITEA__admin__PASSWORD || '';

    if (!adminPassword) {
      throw new Error('Gitea admin password not available — cannot create API token');
    }

    // Authenticate with basic auth to create an API token
    const tokenName = `atlas-provisioning-${ctx.installationId.slice(0, 8)}`;
    const res = await fetch(`${ctx.appBaseUrl}${ctx.adminApiBasePath}/users/${adminUsername}/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${adminUsername}:${adminPassword}`).toString('base64')}`,
      },
      body: JSON.stringify({
        name: tokenName,
        scopes: ['all'],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gitea setupAdminToken failed (${res.status}): ${body}`);
    }

    const token = await res.json() as { sha1: string };
    return token.sha1;
  }
}
