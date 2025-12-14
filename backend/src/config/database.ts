import pg from 'pg';
import { env } from './env.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { logger } from '../utils/logger.js';

// Create PostgreSQL pool
const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Prisma Client singleton
class DatabaseClient {
  private static instance: PrismaClient | null = null;

  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({
        adapter,
        log:
          env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
      });

      // Add query logging in development
      if (env.NODE_ENV === 'development') {
        this.instance.$on('query' as never, (e: any) => {
          logger.debug(`Query: ${e.query}`);
          logger.debug(`Duration: ${e.duration}ms`);
        });
      }
    }
    return this.instance;
  }

  static async connect(): Promise<void> {
    try {
      await this.getInstance().$connect();
      logger.info('✅ Database connected successfully');
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      await pool.end();
      this.instance = null;
      logger.info('Database disconnected');
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      await this.getInstance().$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const prisma = DatabaseClient.getInstance();

// Export utilities
export const db = {
  connect: () => DatabaseClient.connect(),
  disconnect: () => DatabaseClient.disconnect(),
  healthCheck: () => DatabaseClient.healthCheck(),
};
