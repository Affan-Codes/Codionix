import { getRedisClient } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const redis = getRedisClient();
const FAMILY_PREFIX = `${env.REDIS_PREFIX}:token:family`;
const FAMILY_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days (match refresh token expiry)

interface TokenFamily {
  familyId: string;
  userId: string;
  createdAt: number;
  tokens: string[]; // All tokens in this family
}

/**
 * Create new token family
 *
 * Called during initial authentication (login/register)
 */
export async function createTokenFamily(
  userId: string,
  refreshToken: string
): Promise<string> {
  const familyId = `${userId}:${Date.now()}`;
  const key = `${FAMILY_PREFIX}:${familyId}`;

  const family: TokenFamily = {
    familyId,
    userId,
    createdAt: Date.now(),
    tokens: [refreshToken],
  };

  try {
    await redis.setex(key, FAMILY_TTL_SECONDS, JSON.stringify(family));

    // Map token → familyId for fast lookup
    await redis.setex(
      `${FAMILY_PREFIX}:lookup:${refreshToken}`,
      FAMILY_TTL_SECONDS,
      familyId
    );

    logger.debug('Token family created', {
      familyId,
      userId,
      operation: 'token.createFamily',
    });

    return familyId;
  } catch (error) {
    logger.error('Failed to create token family', {
      error: error instanceof Error ? error.message : 'Unknown',
      userId,
    });
    throw error;
  }
}

/**
 * Add token to existing family
 *
 * Called during refresh token rotation
 */
export async function addTokenToFamily(
  oldToken: string,
  newToken: string
): Promise<void> {
  try {
    // Find family by old token
    const familyId = await redis.get(`${FAMILY_PREFIX}:lookup:${oldToken}`);

    if (!familyId) {
      logger.warn('Token family not found for rotation', {
        operation: 'token.addToFamily',
        outcome: 'family_not_found',
      });
      return;
    }

    const key = `${FAMILY_PREFIX}:${familyId}`;
    const data = await redis.get(key);

    if (!data) {
      logger.warn('Token family data missing', {
        familyId,
        operation: 'token.addToFamily',
      });
      return;
    }

    const family: TokenFamily = JSON.parse(data);
    family.tokens.push(newToken);

    // Update family
    await redis.setex(key, FAMILY_TTL_SECONDS, JSON.stringify(family));

    // Map new token → familyId
    await redis.setex(
      `${FAMILY_PREFIX}:lookup:${newToken}`,
      FAMILY_TTL_SECONDS,
      familyId
    );

    // Delete old token lookup (it's revoked)
    await redis.del(`${FAMILY_PREFIX}:lookup:${oldToken}`);

    logger.debug('Token added to family', {
      familyId,
      tokenCount: family.tokens.length,
      operation: 'token.addToFamily',
    });
  } catch (error) {
    logger.error('Failed to add token to family', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    throw error;
  }
}

/**
 * Check if token reuse detected (SECURITY CRITICAL)
 *
 * Returns true if token was already used (revoked)
 * Triggers family revocation if true
 */
export async function detectTokenReuse(token: string): Promise<boolean> {
  try {
    // Check if token is in a family
    const familyId = await redis.get(`${FAMILY_PREFIX}:lookup:${token}`);

    if (!familyId) {
      // Token not in any active family = already revoked or expired
      logger.warn('Token reuse detected - no active family', {
        operation: 'token.detectReuse',
        outcome: 'reuse_detected',
      });
      return true;
    }

    // Token is in active family = legitimate use
    return false;
  } catch (error) {
    logger.error('Failed to detect token reuse', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    // Fail closed: assume reuse for security
    return true;
  }
}

/**
 * Revoke entire token family (THEFT RESPONSE)
 *
 * Called when token reuse is detected
 * Revokes ALL tokens in the family
 */
export async function revokeTokenFamily(token: string): Promise<string[]> {
  try {
    const familyId = await redis.get(`${FAMILY_PREFIX}:lookup:${token}`);

    if (!familyId) {
      logger.warn('Cannot revoke family - family not found', {
        operation: 'token.revokeFamily',
      });
      return [];
    }

    const key = `${FAMILY_PREFIX}:${familyId}`;
    const data = await redis.get(key);

    if (!data) {
      logger.warn('Cannot revoke family - data missing', {
        familyId,
        operation: 'token.revokeFamily',
      });
      return [];
    }

    const family: TokenFamily = JSON.parse(data);

    // Delete family
    await redis.del(key);

    // Delete all token lookups
    const pipeline = redis.pipeline();
    for (const t of family.tokens) {
      pipeline.del(`${FAMILY_PREFIX}:lookup:${t}`);
    }
    await pipeline.exec();

    logger.warn('🚨 TOKEN THEFT DETECTED - Family revoked', {
      familyId,
      userId: family.userId,
      tokenCount: family.tokens.length,
      operation: 'token.revokeFamily',
      severity: 'high',
    });

    return family.tokens;
  } catch (error) {
    logger.error('Failed to revoke token family', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return [];
  }
}

/**
 * Clean up family when user logs out
 */
export async function deleteTokenFamily(token: string): Promise<void> {
  try {
    const familyId = await redis.get(`${FAMILY_PREFIX}:lookup:${token}`);
    if (!familyId) return;

    const key = `${FAMILY_PREFIX}:${familyId}`;
    const data = await redis.get(key);
    if (!data) return;

    const family: TokenFamily = JSON.parse(data);

    // Delete family
    await redis.del(key);

    // Delete all lookups
    const pipeline = redis.pipeline();
    for (const t of family.tokens) {
      pipeline.del(`${FAMILY_PREFIX}:lookup:${t}`);
    }
    await pipeline.exec();

    logger.debug('Token family deleted', {
      familyId,
      tokenCount: family.tokens.length,
      operation: 'token.deleteFamily',
    });
  } catch (error) {
    logger.error('Failed to delete token family', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}
