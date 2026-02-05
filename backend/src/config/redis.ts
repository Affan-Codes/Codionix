import { type RedisOptions, Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// ===================================
// REDIS OPTIONS
// ===================================

const redisOptions: RedisOptions = {
  // Retry configuration
  maxRetriesPerRequest: env.REDIS_MAX_RETRIES,
  retryStrategy: (times: number) => {
    if (times > env.REDIS_MAX_RETRIES) {
      logger.error('Redis max retries exceeded', {
        attempts: times,
        category: 'redis',
      });
      return null; // Stop retrying
    }

    const delay = Math.min(times * env.REDIS_RETRY_DELAY_MS, 3000);
    logger.warn(`Redis retry attempt ${times}/${env.REDIS_MAX_RETRIES}`, {
      delay: `${delay}ms`,
      category: 'redis',
    });
    return delay;
  },

  // Connection settings
  connectTimeout: env.REDIS_CONNECT_TIMEOUT, // Max time to connect
  commandTimeout: env.REDIS_COMMAND_TIMEOUT, // Max time per command
  lazyConnect: false, // Connect immediately
  keepAlive: 30000, // Keep connection alive
  enableOfflineQueue: true, // Queue commands when offline
  enableReadyCheck: true, // Verify connection ready

  // TLS for production (rediss://)
  ...(env.REDIS_URL.startsWith('rediss://') && {
    tls: {
      rejectUnauthorized: true,
    },
  }),
};

// ===================================
// REDIS CLIENT (SINGLETON PATTERN)
// ===================================

let redisClient: Redis | null = null;

/**
 * Get Redis client instance (creates on first call)
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, redisOptions);
    setupEventHandlers(redisClient);
  }
  return redisClient;
}

/**
 * Setup Redis event handlers
 */
function setupEventHandlers(client: Redis): void {
  client.on('connect', () => {
    logger.info('Redis: Connecting...', { category: 'redis' });
  });

  client.on('ready', () => {
    logger.info('Redis: Connected and ready', { category: 'redis' });
  });

  client.on('error', (error) => {
    logger.error('Redis error', {
      error: error.message,
      category: 'redis',
    });
  });

  client.on('close', () => {
    logger.warn('Redis: Connection closed', { category: 'redis' });
  });

  client.on('reconnecting', (delay: number) => {
    logger.info('Redis: Reconnecting...', {
      delay: `${delay}ms`,
      category: 'redis',
    });
  });

  client.on('end', () => {
    logger.warn('Redis: Connection ended', { category: 'redis' });
  });
}

/**
 * Connect to Redis with health check
 */
export async function connectRedis(): Promise<void> {
  const client = getRedisClient();

  try {
    // Test connection
    const pong = await client.ping();

    if (pong !== 'PONG') {
      throw new Error('Redis ping failed');
    }

    logger.info('✅ Redis: Connected successfully', {
      host: client.options.host || 'localhost',
      port: client.options.port || 6379,
      category: 'redis',
    });
  } catch (error) {
    logger.error('❌ Redis: Connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'redis',
    });
    throw error;
  }
}

/**
 * Disconnect from Redis gracefully
 */
export async function disconnectRedis(): Promise<void> {
  if (!redisClient) {
    logger.debug('Redis: No active connection to disconnect', {
      category: 'redis',
    });
    return;
  }

  try {
    await redisClient.quit();
    redisClient = null;

    logger.info('✅ Redis: Disconnected gracefully', {
      category: 'redis',
    });
  } catch (error) {
    logger.error('❌ Redis: Disconnect error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'redis',
    });

    // Force disconnect if graceful fails
    try {
      await redisClient?.disconnect();
      redisClient = null;
    } catch (forceError) {
      logger.error('Redis: Force disconnect failed', {
        error:
          forceError instanceof Error ? forceError.message : 'Unknown error',
        category: 'redis',
      });
    }
  }
}

/**
 * Health check for monitoring
 */
export async function redisHealthCheck(): Promise<{
  status: 'connected' | 'disconnected';
  latency?: number;
}> {
  if (!redisClient) {
    return { status: 'disconnected' };
  }

  try {
    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;

    return {
      status: 'connected',
      latency,
    };
  } catch (error) {
    logger.error('Redis health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'redis',
    });

    return { status: 'disconnected' };
  }
}

/**
 * Export helper object for cleaner imports
 */
export const redis = {
  client: getRedisClient,
  connect: connectRedis,
  disconnect: disconnectRedis,
  health: redisHealthCheck,
};

/**
 * Default export for direct client access
 */
export default getRedisClient;
