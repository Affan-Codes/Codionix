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

  // Log incoming request with structured context
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    category: 'http',
    direction: 'inbound',
  });

  // Capture response finish event
  const originalEnd = res.end;

  res.end = function (chunk?: any, encoding?: any, callback?: any): any {
    // Calculate request duration
    const duration = req.startTime ? Date.now() - req.startTime : 0;

    // Determine log level based on status code
    let level: 'info' | 'warn' | 'error' = 'info';
    if (res.statusCode >= 500) {
      level = 'error';
    } else if (res.statusCode >= 400) {
      level = 'warn';
    }

    // Log response with full structured context
    logger.log(level, 'Request completed', {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      durationMs: duration,
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      category: 'http',
      direction: 'outbound',
      // Add performance warning if slow
      ...(duration > 3000 && { performance: 'slow' }),
    });

    // Warn on slow requests (>3 seconds)
    if (duration > 3000) {
      logger.warn('Slow request detected', {
        correlationId,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        durationMs: duration,
        threshold: '3000ms',
        category: 'performance',
      });
    }

    // Call original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

/**
 * Get correlation context for current request
 * DEPRECATED: Use getLogContext from logger.ts instead
 * Kept for backward compatibility
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
