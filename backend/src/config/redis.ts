import { Redis, type RedisOptions } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// ===================================
// RETRY STRATEGY
// ===================================

/**
 * Custom retry strategy with exponential backoff
 * Hard stops after max retries to prevent infinite reconnection loops
 */
function retryStrategy(times: number, error?: Error): number | void {
  const maxRetries = env.REDIS_MAX_RETRIES ?? 10;
  const baseDelay = env.REDIS_RETRY_DELAY_MS ?? 100;

  // Log error if provided
  if (error) {
    logger.warn('Redis: Connection error, will retry', {
      attempt: times,
      error: error.message,
      category: 'redis',
    });
  }

  // Hard stop after max retries
  if (times > maxRetries) {
    logger.error('Redis: Max retries exceeded, stopping', {
      attempts: times,
      maxRetries,
      category: 'redis',
    });
    return undefined; // Stop retrying
  }

  // Exponential backoff with jitter: baseDelay * 2^(times-1), capped at 30s
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, times - 1), 30000);
  const jitter = Math.random() * 1000; // 0-1000ms random jitter
  const totalDelay = exponentialDelay + jitter;

  logger.debug('Redis: Scheduling retry', {
    attempt: times,
    delayMs: Math.round(totalDelay),
    category: 'redis',
  });

  return totalDelay;
}

// ===================================
// REDIS CLIENT OPTIONS (PRODUCTION-GRADE)
// ===================================

const redisOptions: RedisOptions = {
  // Connection details (explicit, no URL parsing)
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,

  // Authentication (only include if provided)
  ...(env.REDIS_USERNAME && { username: env.REDIS_USERNAME }),
  ...(env.REDIS_PASSWORD && { password: env.REDIS_PASSWORD }),

  // Timeouts (production-critical)
  connectTimeout: env.REDIS_CONNECT_TIMEOUT ?? 10000, // 10s connection timeout
  commandTimeout: env.REDIS_COMMAND_TIMEOUT ?? 5000, // 5s per command (if supported)

  // TLS for secure connections (provider-safe, secure by default)
  ...(env.REDIS_TLS_ENABLED && {
    tls: {
      rejectUnauthorized: env.REDIS_TLS_REJECT_UNAUTHORIZED !== false,
    },
  }),

  // Retry and resilience
  retryStrategy,
  enableReadyCheck: true, // Wait for READY status before accepting commands
  enableOfflineQueue: true, // Queue commands while offline
  maxRetriesPerRequest: 3, // Retry individual commands up to 3 times

  // Auto-reconnect settings
  autoResubscribe: true, // Resubscribe to channels after reconnect
  autoResendUnfulfilledCommands: true, // Resend unfulfilled commands after reconnect

  // Connection behavior
  lazyConnect: true, // Don't connect immediately (safer for startup)

  // Buffer settings
  keepAlive: 30000, // Send keepalive every 30s to maintain connection
};

// ===================================
// REDIS CLIENT (SINGLETON PATTERN)
// ===================================

let redisClient: Redis | null = null;
let isShuttingDown = false;

/**
 * Get Redis client instance (lazy singleton)
 * Creates connection on first call
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisOptions);
    setupEventHandlers(redisClient);
  }
  return redisClient;
}

/**
 * Setup comprehensive Redis event handlers
 * Production-grade event monitoring for all critical states
 */
function setupEventHandlers(client: Redis): void {
  // Connection established (low-level socket connected)
  client.on('connect', () => {
    logger.debug('Redis: Socket connected', { category: 'redis' });
  });

  // Connection ready (READY status, can accept commands)
  client.on('ready', () => {
    logger.info('Redis: Ready for commands', { category: 'redis' });
  });

  // Connection errors (critical to log with full context)
  client.on('error', (error: Error) => {
    if (!isShuttingDown) {
      logger.error('Redis: Client error', {
        error: error.message,
        code: (error as any).code,
        errno: (error as any).errno,
        category: 'redis',
      });
    }
  });

  // Attempting to reconnect
  client.on('reconnecting', (info: any) => {
    logger.warn('Redis: Attempting to reconnect', {
      attempt: info?.attempt,
      delay: info?.delay,
      category: 'redis',
    });
  });

  // Connection closed unexpectedly
  client.on('close', () => {
    if (!isShuttingDown) {
      logger.warn('Redis: Connection closed', { category: 'redis' });
    }
  });

  // Connection ended (graceful or forced)
  client.on('end', () => {
    logger.info('Redis: Connection ended', { category: 'redis' });
  });
}

/**
 * Connect to Redis with verification
 */
export async function connectRedis(): Promise<void> {
  const client = getRedisClient();

  // Already connected and ready
  if (client.status === 'ready') {
    logger.debug('Redis: Already connected and ready', { category: 'redis' });
    return;
  }

  try {
    // Connect if not already connecting/connected
    if (
      client.status === 'wait' ||
      client.status === 'close' ||
      client.status === 'end'
    ) {
      await client.connect();
    } else if (client.status === 'connecting') {
      // Wait for ongoing connection
      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          client.removeListener('error', onError);
          resolve();
        };
        const onError = (err: Error) => {
          client.removeListener('ready', onReady);
          reject(err);
        };
        client.once('ready', onReady);
        client.once('error', onError);
      });
    }

    // Verify connection with ping
    const pong = await client.ping();
    if (pong !== 'PONG') {
      throw new Error(`Redis ping returned unexpected value: ${pong}`);
    }

    logger.info('✅ Redis: Connected and verified', {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      tls: env.REDIS_TLS_ENABLED ? 'enabled' : 'disabled',
      category: 'redis',
    });
  } catch (error) {
    logger.error('❌ Redis: Connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      status: client.status,
      category: 'redis',
    });
    throw error;
  }
}

/**
 * Graceful shutdown with cleanup and process exit
 */
export async function disconnectRedis(): Promise<void> {
  if (!redisClient) {
    logger.debug('Redis: No active connection to disconnect', {
      category: 'redis',
    });
    return;
  }

  isShuttingDown = true;

  try {
    // Gracefully quit (waits for pending commands, respects timeout)
    await redisClient.quit();

    logger.info('✅ Redis: Disconnected gracefully', { category: 'redis' });
  } catch (error) {
    logger.error('❌ Redis: Graceful disconnect failed, forcing disconnect', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'redis',
    });

    // Force disconnect if graceful quit fails
    try {
      await redisClient.disconnect();
      logger.info('Redis: Forced disconnect completed', { category: 'redis' });
    } catch (forceError) {
      logger.error('Redis: Force disconnect also failed', {
        error:
          forceError instanceof Error ? forceError.message : 'Unknown error',
        category: 'redis',
      });
    }
  } finally {
    redisClient = null;
    isShuttingDown = false;
  }
}

/**
 * Health check for monitoring and Kubernetes liveness/readiness probes
 */
export async function redisHealthCheck(): Promise<{
  status: 'connected' | 'disconnected' | 'connecting';
  latency?: number;
  error?: string;
}> {
  if (!redisClient) {
    return {
      status: 'disconnected',
      error: 'Redis client not initialized',
    };
  }

  // Check current connection status
  const clientStatus = redisClient.status;
  if (clientStatus === 'connecting') {
    return { status: 'connecting' };
  }

  if (clientStatus !== 'ready') {
    return {
      status: 'disconnected',
      error: `Client status: ${clientStatus}`,
    };
  }

  try {
    // Measure round-trip latency
    const start = Date.now();
    const pong = await redisClient.ping();
    const latency = Date.now() - start;

    if (pong !== 'PONG') {
      return {
        status: 'disconnected',
        error: `Unexpected ping response: ${pong}`,
      };
    }

    return {
      status: 'connected',
      latency,
    };
  } catch (error) {
    logger.error('Redis: Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'redis',
    });

    return {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Setup graceful shutdown handlers for SIGINT/SIGTERM
 * Call this once in your application startup (server.ts or main)
 * Ensures clean disconnection and proper process exit
 */
export function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, initiating graceful shutdown...`, {
      category: 'redis',
    });

    try {
      // Give pending operations time to complete
      await disconnectRedis();
      logger.info('Redis: Shutdown complete, exiting process', {
        signal,
        category: 'redis',
      });
      process.exit(0);
    } catch (error) {
      logger.error('Error during Redis shutdown, forcing exit', {
        error: error instanceof Error ? error.message : 'Unknown error',
        signal,
        category: 'redis',
      });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.debug('Graceful shutdown handlers registered', { category: 'redis' });
}

/**
 * Export helper object for cleaner imports in services
 */
export const redis = {
  client: getRedisClient,
  connect: connectRedis,
  disconnect: disconnectRedis,
  health: redisHealthCheck,
  setupShutdown: setupGracefulShutdown,
};

/**
 * Default export for direct client access
 */
export default getRedisClient;
