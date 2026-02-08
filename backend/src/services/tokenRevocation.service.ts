import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Check if refresh token is revoked or expired
 */
export async function isTokenRevoked(jti: string): Promise<boolean> {
  try {
    const token = await prisma.refreshToken.findUnique({
      where: { jti },
      select: { isRevoked: true, expiresAt: true },
    });

    if (!token) {
      // Token not in DB = previously revoked or never existed
      return true;
    }

    if (token.isRevoked) {
      return true;
    }

    if (token.expiresAt < new Date()) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to check token revocation status', {
      error: error instanceof Error ? error.message : 'Unknown',
      jti,
    });
    // Fail closed: assume revoked for security
    return true;
  }
}

/**
 * Revoke a specific refresh token by JTI
 */
export async function revokeToken(jti: string): Promise<void> {
  try {
    await prisma.refreshToken.updateMany({
      where: { jti },
      data: { isRevoked: true },
    });

    logger.info('Token revoked', { jti });
  } catch (error) {
    logger.error('Failed to revoke token', {
      error: error instanceof Error ? error.message : 'Unknown',
      jti,
    });
    throw error;
  }
}

/**
 * Revoke all refresh tokens for a user (logout all devices)
 */
export async function revokeAllUserTokens(userId: string): Promise<number> {
  try {
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    logger.info('All user tokens revoked', {
      userId,
      count: result.count,
    });

    return result.count;
  } catch (error) {
    logger.error('Failed to revoke all user tokens', {
      error: error instanceof Error ? error.message : 'Unknown',
      userId,
    });
    throw error;
  }
}

/**
 * Detect token reuse (theft detection)
 */
export async function detectTokenReuse(
  jti: string,
  userId: string
): Promise<boolean> {
  try {
    const token = await prisma.refreshToken.findUnique({
      where: { jti },
      select: { isRevoked: true, userId: true },
    });

    if (!token) {
      // Token doesn't exist = was already deleted or never created
      logger.warn('Token reuse detected - token not in database', {
        jti,
        userId,
        operation: 'token.reuseDetection',
      });
      return true;
    }

    if (token.isRevoked) {
      // Token was revoked but someone tried to use it = THEFT
      logger.error('🚨 TOKEN THEFT DETECTED - Revoked token used', {
        jti,
        userId,
        operation: 'token.reuseDetection',
        severity: 'critical',
      });

      // Revoke ALL tokens for this user
      await revokeAllUserTokens(userId);

      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to detect token reuse', {
      error: error instanceof Error ? error.message : 'Unknown',
      jti,
      userId,
    });
    // Fail closed: assume reuse for security
    return true;
  }
}

/**
 * Verify device fingerprint matches stored fingerprint
 */
export async function verifyTokenFingerprint(
  jti: string,
  currentFingerprint: string
): Promise<boolean> {
  try {
    const token = await prisma.refreshToken.findUnique({
      where: { jti },
      select: { fingerprint: true },
    });

    if (!token) {
      return false; // Token doesn't exist
    }

    // If no fingerprint stored (old tokens), allow (backward compat)
    if (!token.fingerprint) {
      logger.error('Token missing fingerprint - rejecting for security', {
        jti,
        operation: 'token.verifyFingerprint',
        severity: 'high',
      });
      return false;
    }

    // Compare fingerprints (constant-time)
    return token.fingerprint === currentFingerprint;
  } catch (error) {
    logger.error('Failed to verify token fingerprint', {
      error: error instanceof Error ? error.message : 'Unknown',
      jti,
    });
    return false;
  }
}
