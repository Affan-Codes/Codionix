import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { db } from './config/database.js';
import routes from './routes/index.routes.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// HTTP request logging
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Health check (no rate limit)
app.get('/health', async (_req, res) => {
  const healthcheck = await db.healthCheck();
  const poolStats = db.getPoolStats();

  const status = healthcheck.healthy ? 200 : 503;

  res.status(status).json({
    success: healthcheck.healthy,
    data: {
      status: healthcheck.healthy ? 'ok' : 'degraded',
      message: healthcheck.healthy
        ? 'Codionix API is running'
        : 'Database connection issues',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: {
        connected: healthcheck.healthy,
        pool: {
          total: healthcheck.pool.total,
          idle: healthcheck.pool.idle,
          waiting: healthcheck.pool.waiting,
          max: healthcheck.pool.max,
          utilization: poolStats.utilization,
        },
      },
    },
  });
});

// Database test
app.get('/db-test', async (_req, res) => {
  const healthcheck = await db.healthCheck();
  const poolStats = db.getPoolStats();

  if (healthcheck.healthy) {
    res.json({
      success: true,
      data: {
        status: 'ok',
        message: 'Database connected successfully',
        pool: {
          total: poolStats.totalCount,
          idle: poolStats.idleCount,
          waiting: poolStats.waitingCount,
          max: poolStats.maxConnections,
          min: poolStats.minConnections,
          utilization: poolStats.utilization,
        },
      },
    });
  } else {
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database connection failed',
        pool: {
          total: poolStats.totalCount,
          idle: poolStats.idleCount,
          waiting: poolStats.waitingCount,
          max: poolStats.maxConnections,
        },
      },
    });
  }
});

// API routes
app.use(`/api/${env.API_VERSION}`, routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
