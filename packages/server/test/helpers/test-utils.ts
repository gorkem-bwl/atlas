/**
 * Shared test utilities.
 *
 * Keep this file small and framework-agnostic. If a helper is RBAC-specific,
 * it belongs in rbac-harness.ts instead.
 */
import { vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';

export const TEST_JWT_SECRET = 'test-jwt-secret-min-32-chars-long!!';
export const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-32chars!!';

/**
 * Minimal Response mock for unit-testing controllers/middleware.
 * `status`, `json`, `setHeader`, `end` are vitest mocks that return the
 * same mock (chaining-friendly). Cast to Express `Response` at the call site.
 */
export function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

/**
 * Sign a JWT with the shared test secret. Centralises the "how we mint
 * tokens in tests" convention so test-time signing stays consistent
 * with production.
 */
export function signTestToken(
  payload: Record<string, unknown>,
  opts: { secret?: string; expiresIn?: string } = {},
): string {
  return jwt.sign(payload, opts.secret ?? TEST_JWT_SECRET, {
    expiresIn: opts.expiresIn ?? '1h',
  } as jwt.SignOptions);
}
