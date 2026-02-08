import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AppError, UnauthorizedError } from '../utils/errors.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { randomUUID } from 'crypto';
import { sanitizeBody } from '../utils/sanitize.js';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const errorId = randomUUID();
  const correlationId = req.correlationId || 'unknown';
  const duration = req.startTime ? Date.now() - req.startTime : 0;

  const errorContext = {
    errorId,
    correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    body: sanitizeBody(req.body),
    userId: req.user?.userId,
    userEmail: req.user?.email,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.socket.remoteAddress,
    duration: `${duration}ms`,
    stack: err.stack,
  };

  logger.error(`Error: ${err.message}`, errorContext);

  // Token errors
  if (err instanceof UnauthorizedError) {
    const message = err.message.toLowerCase();

    // Token theft detection
    if (message.includes('reuse') || message.includes('theft')) {
      logger.error('🚨 TOKEN THEFT DETECTED', {
        ...errorContext,
        severity: 'critical',
        category: 'security',
        threat: 'token_theft',
      });

      ApiResponse.error(
        res,
        'Token reuse detected. All your sessions have been invalidated for security. Please log in again.',
        401,
        'TOKEN_THEFT_DETECTED',
        {
          errorId,
          correlationId,
          action: 'all_sessions_revoked',
          recommendation:
            'Change your password immediately if you did not trigger this.',
        }
      );
      return;
    }

    // Token expiration
    if (message.includes('expired')) {
      ApiResponse.error(
        res,
        'Your session has expired. Please log in again.',
        401,
        'TOKEN_EXPIRED',
        {
          errorId,
          correlationId,
          action: 'reauthenticate',
        }
      );
      return;
    }

    // Token revocation
    if (message.includes('revoked')) {
      ApiResponse.error(
        res,
        'This session has been revoked. Please log in again.',
        401,
        'TOKEN_REVOKED',
        {
          errorId,
          correlationId,
          action: 'reauthenticate',
        }
      );
      return;
    }

    // CSRF validation failure
    if (message.includes('csrf')) {
      logger.warn('CSRF validation failed', {
        ...errorContext,
        category: 'security',
        threat: 'csrf_attack',
      });

      ApiResponse.error(
        res,
        'Invalid security token. Please refresh the page and try again.',
        401,
        'CSRF_VALIDATION_FAILED',
        {
          errorId,
          correlationId,
          action: 'refresh_page',
        }
      );
      return;
    }

    // PKCE validation failure (OAuth)
    if (message.includes('pkce')) {
      logger.error('PKCE validation failed - possible attack', {
        ...errorContext,
        severity: 'high',
        category: 'security',
        threat: 'oauth_pkce_attack',
      });

      ApiResponse.error(
        res,
        'OAuth security validation failed. Please try signing in again.',
        401,
        'PKCE_VALIDATION_FAILED',
        {
          errorId,
          correlationId,
          action: 'retry_oauth',
        }
      );
      return;
    }

    // Generic unauthorized
    ApiResponse.error(res, err.message, 401, 'UNAUTHORIZED', {
      errorId,
      correlationId,
    });
    return;
  }

  // Handle known AppError
  if (err instanceof AppError) {
    ApiResponse.error(res, err.message, err.statusCode, err.code, {
      errorId,
      correlationId,
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    logger.warn('Validation error', {
      ...errorContext,
      validationErrors: details,
    });

    ApiResponse.error(res, 'Validation failed', 400, 'VALIDATION_ERROR', {
      errorId,
      correlationId,
      errors: details,
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        const field = err.meta?.target as string[];
        logger.warn('Database constraint violation', {
          ...errorContext,
          constraint: 'unique',
          field,
        });
        ApiResponse.error(
          res,
          `${field?.join(', ')} already exists`,
          409,
          'CONFLICT',
          { errorId, correlationId }
        );
        return;

      case 'P2025':
        logger.warn('Database record not found', errorContext);
        ApiResponse.error(res, 'Record not found', 404, 'NOT_FOUND', {
          errorId,
          correlationId,
        });
        return;

      case 'P2024':
        logger.error('Database pool timeout', {
          ...errorContext,
          prismaCode: err.code,
          critical: true,
        });
        ApiResponse.error(
          res,
          'Database connection timeout. Please try again.',
          503,
          'DATABASE_TIMEOUT',
          { errorId, correlationId }
        );
        return;

      default:
        logger.error('Database error', {
          ...errorContext,
          prismaCode: err.code,
          prismaMessage: err.message,
        });
        ApiResponse.error(res, 'Database error', 500, 'DATABASE_ERROR', {
          errorId,
          correlationId,
        });
        return;
    }
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma validation error', {
      ...errorContext,
      prismaError: err.message,
    });
    ApiResponse.error(res, 'Invalid data provided', 400, 'VALIDATION_ERROR', {
      errorId,
      correlationId,
    });
    return;
  }

  // Handle unknown errors
  logger.error('Unhandled error', {
    ...errorContext,
    errorType: err.constructor.name,
    critical: true,
  });

  ApiResponse.error(
    res,
    'An unexpected error occurred',
    500,
    'INTERNAL_ERROR',
    {
      errorId,
      correlationId,
    }
  );
};
