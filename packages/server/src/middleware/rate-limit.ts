import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

// Raised from 120 to 600/min. The old cap was easy to hit in normal dev
// (TanStack Query refetches, StrictMode double-invokes, multiple tabs).
// In production, 600/min per IP is still well below abuse levels for a
// single authenticated user.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip entirely in local dev — the limiter's value is anti-abuse in
  // production, not defense against your own browser.
  skip: () => isDev,
  message: { success: false, error: 'Too many requests, please try again later' },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip in tests — integration suites repeatedly exercise /auth/setup and
  // /auth/login per-test to isolate DB state, which legitimately exceeds 10/min.
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, error: 'Too many auth attempts, please try again later' },
});

export const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: '',
});

export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many admin requests, please try again later' },
});
