import { getRedisClient } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import crypto from 'crypto';
import type { OAuthRegisterState, OAuthState } from '../types/oauth.types.js';

const redis = getRedisClient(); // Get the Redis client instance
const STATE_PREFIX = `${env.REDIS_PREFIX}:oauth:state`;
const STATE_TTL_SECONDS = Math.floor(env.OAUTH_STATE_EXPIRY_MS / 1000);

/**
 * Generate cryptographically secure state token
 */
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store OAuth state in Redis with TTL
 */
export async function storeOAuthState(
  state: Omit<OAuthState, 'createdAt' | 'expiresAt' | 'nonce'>
): Promise<string> {
  const token = generateStateToken();
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Date.now();

  let fullState: OAuthState;

  if (state.flow === 'login') {
    fullState = {
      provider: state.provider,
      flow: 'login',
      nonce,
      createdAt: now,
      expiresAt: now + env.OAUTH_STATE_EXPIRY_MS,
    };
  } else {
    const registerState = state as Omit<
      OAuthRegisterState,
      'createdAt' | 'expiresAt' | 'nonce'
    >;

    fullState = {
      provider: registerState.provider,
      flow: 'register',
      role: registerState.role,
      nonce,
      createdAt: now,
      expiresAt: now + env.OAUTH_STATE_EXPIRY_MS,
    };
  }

  const key = `${STATE_PREFIX}:${token}`;

  try {
    // Store with automatic expiration
    await redis.setex(key, STATE_TTL_SECONDS, JSON.stringify(fullState));

    logger.debug('OAuth state stored in Redis', {
      token: token.substring(0, 8) + '...',
      provider: state.provider,
      flow: state.flow,
      ttl: `${STATE_TTL_SECONDS}s`,
      operation: 'oauth.storeState',
    });

    return token;
  } catch (error) {
    logger.error('Failed to store OAuth state in Redis', {
      error: error instanceof Error ? error.message : 'Unknown',
      operation: 'oauth.storeState',
    });
    throw new Error('Failed to store OAuth state');
  }
}

/**
 * Retrieve and delete OAuth state (single-use)
 */
export async function consumeOAuthState(
  token: string
): Promise<OAuthState | null> {
  const key = `${STATE_PREFIX}:${token}`;

  try {
    // Get and delete atomically
    const data = await redis.getdel(key);

    if (!data) {
      logger.warn('OAuth state not found in Redis', {
        token: token.substring(0, 8) + '...',
        operation: 'oauth.consumeState',
        outcome: 'not_found',
      });
      return null;
    }

    const state: OAuthState = JSON.parse(data);

    // Double-check expiration (Redis TTL should handle this, but defense in depth)
    if (state.expiresAt < Date.now()) {
      logger.warn('OAuth state expired', {
        token: token.substring(0, 8) + '...',
        provider: state.provider,
        ageMs: Date.now() - state.createdAt,
        operation: 'oauth.consumeState',
        outcome: 'expired',
      });
      return null;
    }

    logger.debug('OAuth state consumed from Redis', {
      token: token.substring(0, 8) + '...',
      provider: state.provider,
      flow: state.flow,
      ageMs: Date.now() - state.createdAt,
      operation: 'oauth.consumeState',
    });

    return state;
  } catch (error) {
    logger.error('Failed to consume OAuth state from Redis', {
      error: error instanceof Error ? error.message : 'Unknown',
      operation: 'oauth.consumeState',
    });
    return null;
  }
}

/**
 * Get current store size (for monitoring)
 */
export async function getStoreSize(): Promise<number> {
  try {
    const keys = await redis.keys(`${STATE_PREFIX}:*`);
    return keys.length;
  } catch {
    return -1;
  }
}

/**
 * Clear all states (for testing/maintenance only)
 */
export async function clearAllStates(): Promise<number> {
  try {
    const keys = await redis.keys(`${STATE_PREFIX}:*`);
    if (keys.length === 0) return 0;

    const deleted = await redis.del(...keys);

    logger.info('OAuth state store cleared', {
      cleared: deleted,
      operation: 'oauth.clearStore',
    });

    return deleted;
  } catch (error) {
    logger.error('Failed to clear OAuth states', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return 0;
  }
}
