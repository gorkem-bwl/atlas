import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import trackingRoutes from './routes/tracking.routes';
import pushRoutes from './routes/push.routes';
import shareRoutes from './routes/share.routes';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';
import { authMiddleware } from './middleware/auth';
import oidcRoutes from './routes/oidc.routes';
import { env } from './config/env';

export function createApp() {
  const app = express();

  app.use(helmet({
    frameguard: { action: 'sameorigin' },
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
  }));

  const allowedOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  // Health check — lightweight, no auth
  app.get('/api/v1/health', (_req, res) => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();
    res.json({
      status: 'ok',
      uptime: Math.round(uptime),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      },
      platform: !!env.OIDC_SIGNING_KEY,
      version: process.env.npm_package_version ?? '0.0.0',
    });
  });

  // Public tracking endpoints — short /t prefix, no auth
  app.use('/t', trackingRoutes);

  // Gmail push notification webhook — no auth (Pub/Sub can't send JWTs)
  app.use('/webhooks/push', pushRoutes);

  // Public share routes — no auth required
  app.use('/api/v1/share', shareRoutes);

  // OIDC discovery + auth endpoints — public (apps need to access without Atlas JWT)
  app.use('/oidc', oidcRoutes);

  // Serve uploaded files (auth via query token)
  app.use('/api/v1/uploads', authMiddleware, express.static(path.join(__dirname, '../uploads')));

  app.use('/api/v1', apiLimiter);
  app.use('/api/v1', routes);
  app.use(errorHandler);

  // ─── Serve client SPA in production ────────────────────────────
  // In production the Express server serves the Vite-built client assets.
  // All non-API routes fall through to index.html for client-side routing.
  if (env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
