import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

// Extend Express Request to include correlation data
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Request correlation middleware
 * CRITICAL: Must be the FIRST middleware in the chain
 *
 * Adds:
 * - Unique correlation ID per request
 * - Request timing (start timestamp)
 * - Correlation header in response
 */
export const requestCorrelation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate or reuse correlation ID
  // Allows distributed tracing if client sends X-Correlation-ID
  const correlationId =
    (req.headers['x-correlation-id'] as string) || randomUUID();

  // Attach to request
  req.correlationId = correlationId;
  req.startTime = Date.now();

  // Add to response headers so client can reference it
  res.setHeader('X-Correlation-ID', correlationId);

  // Log incoming request with correlation context
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });

  // Capture response finish event
  const originalEnd = res.end;

  res.end = function (chunk?: any, encoding?: any, callback?: any): any {
    // Calculate request duration
    const duration = req.startTime ? Date.now() - req.startTime : 0;

    // Log response with full context
    logger.info('Request completed', {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
      userEmail: req.user?.email,
    });

    // Warn on slow requests (>3 seconds)
    if (duration > 3000) {
      logger.warn('Slow request detected', {
        correlationId,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        threshold: '3000ms',
      });
    }

    // Call original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

/**
 * Get correlation context for current request
 * Use this in services/utils to add correlation to logs
 */
export const getCorrelationContext = (req?: Request) => {
  if (!req) return {};

  return {
    correlationId: req.correlationId,
    userId: req.user?.userId,
    userEmail: req.user?.email,
    path: req.path,
    method: req.method,
  };
};
