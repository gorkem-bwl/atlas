/**
 * Optimistic concurrency control types shared between client and server.
 * When a client PATCH sends If-Unmodified-Since with a stale timestamp,
 * the server responds with 409 and this body shape.
 */

export const IF_UNMODIFIED_SINCE_HEADER = 'If-Unmodified-Since';
export const STALE_RESOURCE_CODE = 'STALE_RESOURCE';
export const CONFLICT_CANCELLED = 'CONFLICT_CANCELLED';
export const CONFLICT_REFRESHED = 'CONFLICT_REFRESHED';
export const CONFLICT_DISMISSED = 'CONFLICT_DISMISSED';

export interface ConflictResponse {
  success: false;
  error: 'conflict';
  code: typeof STALE_RESOURCE_CODE;
  /** App scope so the client can target invalidation (e.g. 'crm', 'projects'). */
  app?: string;
  current: {
    updatedAt: string;
  };
}

/** Helper type for mutation inputs that carry a version for optimistic concurrency. */
export type WithVersion<T> = T & { updatedAt?: string };
