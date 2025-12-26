import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { randomUUID } from 'crypto';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Generate unique error ID for this specific error instance
  const errorId = randomUUID();
  const correlationId = req.correlationId || 'unknown';
  const duration = req.startTime ? Date.now() - req.startTime : 0;

  // Build error context
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

  // Log error with full context
  logger.error(`Error: ${err.message}`, errorContext);

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
    ApiResponse.error(
      res,
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      details
    );
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
        // Unique constraint violation
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
        // Record not found
        logger.warn('Database record not found', errorContext);
        ApiResponse.error(res, 'Record not found', 404, 'NOT_FOUND', {
          errorId,
          correlationId,
        });
        return;

      case 'P2024':
        // Connection pool timeout
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

/**
 * Sanitize request body for logging
 * CRITICAL: Never log sensitive fields like passwords, tokens, credit cards
 */
const sanitizeBody = (body: any): any => {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'creditCard',
    'ssn',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
};
