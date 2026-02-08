import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function cleanupExpiredTokens(): Promise<void> {
  const startTime = Date.now();

  try {
    // Delete revoked tokens first (typically fewer records)
    const revokedResult = await prisma.refreshToken.deleteMany({
      where: {
        isRevoked: true,
      },
    });

    // Delete expired tokens
    const expiredResult = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    const totalDeleted = revokedResult.count + expiredResult.count;
    const duration = Date.now() - startTime;

    if (totalDeleted > 0) {
      logger.info('Cleaned up expired tokens', {
        tokensDeleted: totalDeleted,
        revokedTokens: revokedResult.count,
        expiredTokens: expiredResult.count,
        duration: `${duration}ms`,
        operation: 'jobs.cleanupTokens',
        category: 'background_job',
      });
    } else {
      logger.debug('No expired tokens to clean', {
        duration: `${duration}ms`,
        operation: 'jobs.cleanupTokens',
        category: 'background_job',
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to cleanup expired tokens', {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'jobs.cleanupTokens',
      category: 'background_job',
      severity: 'high',
    });

    throw error;
  }
}

/**
 * Clean up expired email verification tokens
 */
export async function cleanupExpiredVerificationTokens(): Promise<void> {
  const startTime = Date.now();

  try {
    // Clear expired verification tokens
    const result = await prisma.user.updateMany({
      where: {
        emailVerificationExpiry: {
          lt: new Date(),
        },
        isEmailVerified: false,
      },
      data: {
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    const duration = Date.now() - startTime;

    if (result.count > 0) {
      logger.info('Cleaned up expired verification tokens', {
        tokensCleared: result.count,
        duration: `${duration}ms`,
        operation: 'jobs.cleanupVerificationTokens',
        category: 'background_job',
      });
    } else {
      logger.debug('No expired verification tokens to clean', {
        duration: `${duration}ms`,
        operation: 'jobs.cleanupVerificationTokens',
        category: 'background_job',
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to cleanup verification tokens', {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'jobs.cleanupVerificationTokens',
      category: 'background_job',
      severity: 'high',
    });

    throw error;
  }
}

/**
 * Clean up expired password reset tokens
 */
export async function cleanupExpiredPasswordResetTokens(): Promise<void> {
  const startTime = Date.now();

  try {
    // Clear expired password reset tokens
    const result = await prisma.user.updateMany({
      where: {
        passwordResetExpiry: {
          lt: new Date(),
        },
      },
      data: {
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    const duration = Date.now() - startTime;

    if (result.count > 0) {
      logger.info('Cleaned up expired password reset tokens', {
        tokensCleared: result.count,
        duration: `${duration}ms`,
        operation: 'jobs.cleanupPasswordResetTokens',
        category: 'background_job',
      });
    } else {
      logger.debug('No expired password reset tokens to clean', {
        duration: `${duration}ms`,
        operation: 'jobs.cleanupPasswordResetTokens',
        category: 'background_job',
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to cleanup password reset tokens', {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'jobs.cleanupPasswordResetTokens',
      category: 'background_job',
      severity: 'high',
    });

    throw error;
  }
}
