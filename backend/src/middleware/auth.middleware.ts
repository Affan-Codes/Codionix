import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors.js';
import {
  createDeviceFingerprint,
  verifyAccessToken,
  verifyDeviceFingerprint,
} from '../utils/jwt.js';
import { prisma } from '../config/database.js';
import { getAccessTokenFromCookies } from '../utils/cookieUtils.js';
import { logger } from '../utils/logger.js';
import { isTokenRevoked } from '../services/tokenRevocation.service.js';

/**
 * Extract device fingerprint from request
 */
function getDeviceFingerprint(req: Request) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return createDeviceFingerprint(ip, userAgent);
}

/**
 * Authenticate user via JWT token
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | null = null;

    token = getAccessTokenFromCookies(req);

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      logger.debug('Authentication failed: No token provided', {
        path: req.path,
        method: req.method,
        hasCookie: !!req.signedCookies?.access_token,
        hasAuthHeader: !!req.headers.authorization,
        operation: 'auth.authenticate',
      });

      throw new UnauthorizedError('Authentication required');
    }

    // Verify token
    const payload = verifyAccessToken(token);

    // Verify device fingerprint if present
    if (payload.fingerprint) {
      const currentFingerprint = getDeviceFingerprint(req);

      const isValid = verifyDeviceFingerprint(
        payload.fingerprint,
        currentFingerprint
      );

      if (!isValid) {
        logger.error('Device fingerprint mismatch', {
          userId: payload.userId,
          jti: payload.jti,
          path: req.path,
          operation: 'auth.authenticate',
          severity: 'high',
        });

        throw new UnauthorizedError(
          'Device fingerprint mismatch. Please log in again.'
        );
      }
    }

    // Check if token is revoked
    if (payload.jti) {
      const revoked = await isTokenRevoked(payload.jti);
      if (revoked) {
        logger.warn('Revoked token used', {
          userId: payload.userId,
          jti: payload.jti,
          path: req.path,
          operation: 'auth.authenticate',
        });

        throw new UnauthorizedError(
          'Token has been revoked. Please log in again.'
        );
      }
    }

    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isEmailVerified: true },
    });

    if (!user) {
      logger.error('Token for non-existent user', {
        userId: payload.userId,
        operation: 'auth.authenticate',
      });

      throw new UnauthorizedError('User not found');
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    logger.debug('Authentication successful', {
      userId: user.id,
      email: user.email,
      operation: 'auth.authenticate',
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require email verification
 * CRITICAL: Use this middleware for sensitive operations
 *
 * @example
 * router.post('/projects', authenticate, requireVerifiedEmail, createProject);
 */
export const requireVerifiedEmail = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if email is verified
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isEmailVerified: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isEmailVerified) {
      logger.warn('Unverified email access attempt', {
        userId: req.user.userId,
        path: req.path,
        operation: 'auth.requireVerifiedEmail',
      });

      throw new UnauthorizedError(
        'Email verification required. Please check your email for verification link.'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | null = null;

    // Try cookie first
    token = getAccessTokenFromCookies(req);

    // Fallback to header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // No token = continue without user
    if (!token) {
      next();
      return;
    }

    // Verify token
    const payload = verifyAccessToken(token);

    // Verify fingerprint if present
    if (payload.fingerprint) {
      const currentFingerprint = getDeviceFingerprint(req);
      const isValid = verifyDeviceFingerprint(
        payload.fingerprint,
        currentFingerprint
      );

      if (!isValid) {
        next();
        return;
      }
    }

    // Check revocation
    if (payload.jti) {
      const revoked = await isTokenRevoked(payload.jti);
      if (revoked) {
        // Silently skip - don't attach user
        next();
        return;
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true },
    });

    if (user) {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };
    }

    next();
  } catch (error) {
    // Silently fail - token invalid but route continues
    next();
  }
};
