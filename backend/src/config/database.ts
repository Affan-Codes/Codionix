import pg from 'pg';
import { env } from './env.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { logger } from '../utils/logger.js';

// ===================================
// CONNECTION POOL CONFIGURATION
// ===================================

/**
 * Production-grade PostgreSQL connection pool
 *
 * CRITICAL DECISIONS:
 * - max: Based on (DB max_connections / number of app instances) - 10% buffer
 * - min: Keep warm connections to avoid cold start latency
 * - idleTimeoutMillis: Return idle connections to prevent exhaustion
 * - connectionTimeoutMillis: Fail fast instead of hanging forever
 * - allowExitOnIdle: Allow graceful shutdown when no work pending
 */
const poolConfig: pg.PoolConfig = {
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  min: env.DB_POOL_MIN,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  allowExitOnIdle: true,

  // SSL configuration for production databases
  ...(env.NODE_ENV === 'production' && {
    ssl: {
      rejectUnauthorized: false, // Most managed DBs use self-signed certs
    },
  }),
};

const pool = new pg.Pool(poolConfig);

// ===================================
// POOL EVENT MONITORING
// ===================================

/**
 * Track pool health metrics
 * CRITICAL: Without this, you won't know when pool is exhausted
 */
pool.on('connect', (_client) => {
  logger.debug('New client connected to pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
});

pool.on('acquire', (_client) => {
  logger.debug('Client acquired from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
});

pool.on('remove', (_client) => {
  logger.debug('Client removed from pool', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
  });
});

/**
 * CRITICAL ERROR HANDLER
 * Without this, idle connection errors will crash the process
 */
pool.on('error', (err, _client) => {
  logger.error('Unexpected error on idle client', {
    error: err.message,
    stack: err.stack,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
  // Don't crash - pool will handle reconnection
});

// ===================================
// PRISMA CLIENT WITH ADAPTER
// ===================================

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Prisma Client singleton
class DatabaseClient {
  private static instance: PrismaClient | null = null;
  private static connectionAttempts = 0;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 2000;

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

  /**
   * Connect with retry logic
   * CRITICAL: Prevents startup crashes from transient DB issues
   */
  static async connect(): Promise<void> {
    while (this.connectionAttempts < this.MAX_RETRY_ATTEMPTS) {
      try {
        await this.getInstance().$connect();
        logger.info('✅ Database connected successfully', {
          poolMax: env.DB_POOL_MAX,
          poolMin: env.DB_POOL_MIN,
          idleTimeout: `${env.DB_IDLE_TIMEOUT_MS}ms`,
          connectionTimeout: `${env.DB_CONNECTION_TIMEOUT_MS}ms`,
        });
        this.connectionAttempts = 0; // Reset on success
        return;
      } catch (error) {
        this.connectionAttempts++;
        logger.error(
          `❌ Database connection failed (attempt ${this.connectionAttempts}/${this.MAX_RETRY_ATTEMPTS})`,
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            willRetry: this.connectionAttempts < this.MAX_RETRY_ATTEMPTS,
          }
        );

        if (this.connectionAttempts >= this.MAX_RETRY_ATTEMPTS) {
          logger.error('❌ Max database connection attempts reached. Exiting.');
          throw error;
        }

        // Exponential backoff
        const delay = this.RETRY_DELAY_MS * this.connectionAttempts;
        logger.info(`⏳ Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Graceful shutdown
   * CRITICAL: Prevents data corruption and connection leaks
   */
  static async disconnect(): Promise<void> {
    if (this.instance) {
      try {
        await this.instance.$disconnect();
        await pool.end();
        this.instance = null;
        logger.info('✅ Database disconnected gracefully');
      } catch (error) {
        logger.error('❌ Error during database disconnect', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Force cleanup
        this.instance = null;
        await pool.end();
      }
    }
  }

  /**
   * Health check with pool metrics
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    pool: {
      total: number;
      idle: number;
      waiting: number;
      max: number;
    };
  }> {
    try {
      await this.getInstance().$queryRaw`SELECT 1`;
      return {
        healthy: true,
        pool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
          max: env.DB_POOL_MAX,
        },
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        healthy: false,
        pool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
          max: env.DB_POOL_MAX,
        },
      };
    }
  }

  /**
   * Get current pool statistics
   * Use this for monitoring/debugging
   */
  static getPoolStats() {
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
      maxConnections: env.DB_POOL_MAX,
      minConnections: env.DB_POOL_MIN,
      utilization: `${Math.round((pool.totalCount / env.DB_POOL_MAX) * 100)}%`,
    };
  }
}

// Export singleton instance
export const prisma = DatabaseClient.getInstance();

// Export utilities
export const db = {
  connect: () => DatabaseClient.connect(),
  disconnect: () => DatabaseClient.disconnect(),
  healthCheck: () => DatabaseClient.healthCheck(),
  getPoolStats: () => DatabaseClient.getPoolStats(),
};

// Export pool for advanced use cases
export { pool };
