import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import shareRoutes from './routes/share.routes';
import { errorHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';
import { authMiddleware } from './middleware/auth';
import { env } from './config/env';

export function createApp() {
  const app = express();

  app.use(helmet({
    frameguard: { action: 'sameorigin' },
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
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

  app.use('/api/v1', apiLimiter);
  app.use('/api/v1', routes);
  app.use(errorHandler);

  if (env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
