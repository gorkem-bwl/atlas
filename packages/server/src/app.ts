import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import shareRoutes from './routes/share.routes';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';
import { authMiddleware } from './middleware/auth';
import { auditMiddleware } from './middleware/audit';
import { env } from './config/env';

export function createApp() {
  const app = express();

  // In production, serve static client files FIRST (no CORS/auth needed)
  if (env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');
    // Hashed assets (JS/CSS) — cache forever, Vite includes content hash in filenames
    app.use('/assets', express.static(path.join(clientDist, 'assets'), { maxAge: '1y', immutable: true }));
    // index.html and other root files — never cache so updates are picked up immediately
    app.use(express.static(clientDist, { maxAge: 0, setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }}));
  }

  app.use(helmet({
    frameguard: { action: 'sameorigin' },
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    hsts: env.NODE_ENV === 'production' && env.CLIENT_PUBLIC_URL.startsWith('https')
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  }));

  const allowedOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
      version: process.env.npm_package_version ?? '0.0.0',
    });
  });

  // Public share routes — no auth required
  app.use('/api/v1/share', shareRoutes);

  // Serve uploaded files (auth via query token)
  app.use('/api/v1/uploads', authMiddleware, express.static(path.join(__dirname, '../uploads')));

  app.use('/api/v1', auditMiddleware);
  app.use('/api/v1', apiLimiter);
  app.use('/api/v1', routes);
  app.use(errorHandler);

  // SPA fallback — serve index.html for client-side routes
  if (env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
