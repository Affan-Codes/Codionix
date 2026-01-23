/**
 * OAuth State Store
 *
 * PRODUCTION NOTE: This uses in-memory storage for single-instance deployments.
 * For multi-instance (horizontal scaling), migrate to Redis.
 * See: docs/OAUTH_REDIS_MIGRATION.md
 *
 * SECURITY:
 * - Cryptographically random state tokens
 * - Automatic expiration (5 minutes)
 * - Single-use tokens (deleted after consumption)
 * - CSRF protection via nonce
 */

import { randomBytes } from 'crypto';
import { logger } from './logger.js';
import type { OAuthState } from '../types/oauth.types.js';

// ===================================
// IN-MEMORY STORE
// ===================================

/**
 * State storage
 * KEY: state token (random 32-byte hex)
 * VALUE: OAuth state data
 */
const stateStore = new Map<string, OAuthState>();

// ===================================
// CONFIGURATION
// ===================================

const STATE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // Clean up every 1 minute

// ===================================
// CLEANUP TASK
// ===================================

/**
 * Auto-cleanup expired states
 * Prevents memory leaks from abandoned OAuth flows
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [token, state] of stateStore.entries()) {
    if (state.expiresAt < now) {
      stateStore.delete(token);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('OAuth state cleanup', {
      cleaned,
      remaining: stateStore.size,
      operation: 'oauth.cleanup',
    });
  }
}, CLEANUP_INTERVAL_MS);

// Prevent cleanup interval from blocking process exit
cleanupInterval.unref();

// ===================================
// PUBLIC API
// ===================================

/**
 * Generate cryptographically secure state token
 */
export function generateStateToken(): string {
  return randomBytes(32).toString('hex'); // 64 character hex string
}

/**
 * Generate nonce for additional CSRF protection
 */
export function generateNonce(): string {
  return randomBytes(16).toString('hex'); // 32 character hex string
}

/**
 * Store OAuth state
 *
 * @param state - OAuth state data
 * @returns state token to include in OAuth URL
 */
export function storeOAuthState(
  state: Omit<OAuthState, 'createdAt' | 'expiresAt' | 'nonce'>
): string {
  const token = generateStateToken();
  const nonce = generateNonce();
  const now = Date.now();

  const fullState: OAuthState = {
    ...state,
    nonce,
    createdAt: now,
    expiresAt: now + STATE_EXPIRY_MS,
  };

  stateStore.set(token, fullState);

  logger.debug('OAuth state stored', {
    token: token.substring(0, 8) + '...', // Log only prefix for security
    provider: state.provider,
    role: state.role,
    expiresIn: `${STATE_EXPIRY_MS / 1000}s`,
    storeSize: stateStore.size,
    operation: 'oauth.storeState',
  });

  return token;
}

/**
 * Retrieve and consume OAuth state (single-use)
 *
 * CRITICAL: State is deleted after retrieval (prevents replay attacks)
 *
 * @param token - State token from OAuth callback
 * @returns OAuth state data or null if invalid/expired
 */
export function consumeOAuthState(token: string): OAuthState | null {
  const state = stateStore.get(token);

  if (!state) {
    logger.warn('OAuth state not found', {
      token: token.substring(0, 8) + '...',
      operation: 'oauth.consumeState',
      outcome: 'not_found',
    });
    return null;
  }

  // Check expiration
  if (state.expiresAt < Date.now()) {
    stateStore.delete(token);
    logger.warn('OAuth state expired', {
      token: token.substring(0, 8) + '...',
      provider: state.provider,
      ageMs: Date.now() - state.createdAt,
      operation: 'oauth.consumeState',
      outcome: 'expired',
    });
    return null;
  }

  // Delete state (single-use)
  stateStore.delete(token);

  logger.debug('OAuth state consumed', {
    token: token.substring(0, 8) + '...',
    provider: state.provider,
    role: state.role,
    ageMs: Date.now() - state.createdAt,
    operation: 'oauth.consumeState',
  });

  return state;
}

/**
 * Get current store size (for monitoring)
 */
export function getStoreSize(): number {
  return stateStore.size;
}

/**
 * Clear all states (for testing only)
 */
export function clearAllStates(): void {
  const size = stateStore.size;
  stateStore.clear();
  logger.info('OAuth state store cleared', {
    cleared: size,
    operation: 'oauth.clearStore',
  });
}

/**
 * Stop cleanup interval (for graceful shutdown)
 */
export function stopCleanup(): void {
  clearInterval(cleanupInterval);
  logger.debug('OAuth state cleanup stopped', {
    operation: 'oauth.stopCleanup',
  });
}

// ===================================
// REDIS MIGRATION INTERFACE
// ===================================

/**
 * FUTURE: Redis implementation will match this interface
 *
 * export interface OAuthStateStore {
 *   storeState(state: OAuthState): Promise<string>;
 *   consumeState(token: string): Promise<OAuthState | null>;
 *   getStoreSize(): Promise<number>;
 * }
 *
 * To migrate:
 * 1. Implement RedisOAuthStateStore
 * 2. Replace imports in oauth.service.ts
 * 3. No other code changes needed
 *
 * See: docs/OAUTH_REDIS_MIGRATION.md
 */
