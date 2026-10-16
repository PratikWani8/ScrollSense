import express, { Express } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalApiLimiter } from './middleware/rateLimiter.js';

// Route imports
import authRoutes from './routes/auth.js';
import devicesRoutes from './routes/devices.js';
import sessionsRoutes from './routes/sessions.js';
import eventsRoutes from './routes/events.js';
import analyticsRoutes from './routes/analytics.js';
import goalsRoutes from './routes/goals.js';
import doomscrollRoutes from './routes/doomscroll.js';
import privacyRoutes from './routes/privacy.js';
import insightsRoutes from './routes/insights.js';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS configuration
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or background workers)
        // or browser extensions (chrome-extension://, moz-extension://)
        if (
          !origin ||
          allowedOrigins.includes(origin) ||
          allowedOrigins.includes('*') ||
          origin.startsWith('chrome-extension://') ||
          origin.startsWith('moz-extension://')
        ) {
          callback(null, true);
        } else {
          callback(new Error('Blocked by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Token'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // General rate limiter
  app.use(generalApiLimiter);

  // Health & Readiness endpoint with database connection check
  const getHealth = () => {
    const dbState = mongoose.connection.readyState;
    const dbStatusMap: Record<number, string> = {
      0: 'DISCONNECTED',
      1: 'CONNECTED',
      2: 'CONNECTING',
      3: 'DISCONNECTING',
    };
    const isHealthy = dbState === 1 || process.env.NODE_ENV === 'test';
    return {
      status: isHealthy ? 'HEALTHY' : 'DEGRADED',
      database: dbStatusMap[dbState] || 'UNKNOWN',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  };

  app.get('/health', (req, res) => {
    const health = getHealth();
    res.status(health.status === 'HEALTHY' ? 200 : 503).json(health);
  });

  app.get(`${env.API_PREFIX}/health`, (req, res) => {
    const health = getHealth();
    res.status(health.status === 'HEALTHY' ? 200 : 503).json(health);
  });

  // Mount API v1 Routers
  app.use(`${env.API_PREFIX}/auth`, authRoutes);
  app.use(`${env.API_PREFIX}/devices`, devicesRoutes);
  app.use(`${env.API_PREFIX}/sessions`, sessionsRoutes);
  app.use(`${env.API_PREFIX}/events`, eventsRoutes);
  app.use(`${env.API_PREFIX}/analytics`, analyticsRoutes);
  app.use(`${env.API_PREFIX}/goals`, goalsRoutes);
  app.use(`${env.API_PREFIX}/doomscroll`, doomscrollRoutes);
  app.use(`${env.API_PREFIX}/privacy`, privacyRoutes);
  app.use(`${env.API_PREFIX}/insights`, insightsRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
