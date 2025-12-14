import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import app from './app.js';

const PORT = env.PORT;

// Create PostgreSQL pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with adapter
const prisma = new PrismaClient({ adapter });

// Database test route
app.get('/db-test', async (_req, res) => {
  try {
    await prisma.$connect();
    res.json({
      success: true,
      data: {
        status: 'ok',
        message: 'Database connected successfully',
      },
    });
  } catch (error) {
    logger.error('Database connection failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database connection failed',
      },
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`✅ Server running on http://localhost:${PORT}`);
  logger.info(`✅ Environment: ${env.NODE_ENV}`);
  logger.info(`✅ Health check: http://localhost:${PORT}/health`);
  logger.info(`✅ DB test: http://localhost:${PORT}/db-test`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received: closing HTTP server`);
  server.close(async () => {
    logger.info('HTTP server closed');
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
