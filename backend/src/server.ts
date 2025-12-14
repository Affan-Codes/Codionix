import 'dotenv/config';
import express from 'express';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from './config/env.js';
import { ApiResponse } from './utils/apiResponse.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = env.PORT;

// Create PostgreSQL pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with adapter
const prisma = new PrismaClient({ adapter });

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  ApiResponse.success(res, {
    status: 'ok',
    message: 'Codionix API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Database test
app.get('/db-test', async (req, res) => {
  try {
    await prisma.$connect();
    ApiResponse.success(res, {
      status: 'ok',
      message: 'Database connected successfully',
    });
  } catch (error) {
    logger.error('Database connection failed:', error);
    ApiResponse.error(res, 'Database connection failed', 500, 'DATABASE_ERROR');
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`✅ Server running on http://localhost:${PORT}`);
  logger.info(`✅ Environment: ${env.NODE_ENV}`);
  logger.info(`✅ Health check: http://localhost:${PORT}/health`);
  logger.info(`✅ DB test: http://localhost:${PORT}/db-test`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});
