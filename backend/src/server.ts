import 'dotenv/config';
import express from 'express';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const app = express();
const PORT = process.env.PORT || 5000;

// Create PostgreSQL pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with adapter
const prisma = new PrismaClient({ adapter });

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Codionix API is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/db-test', async (req, res) => {
  try {
    await prisma.$connect();
    res.json({
      status: 'ok',
      message: 'Database connected successfully',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ DB test: http://localhost:${PORT}/db-test`);
});
