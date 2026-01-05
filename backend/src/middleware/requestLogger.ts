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

  // Sanitize request body for logging
  const sanitizedBody = req.body ? sanitizeRequestBody(req.body) : undefined;

  // Log incoming request with FULL structured context
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body:
      sanitizedBody && Object.keys(sanitizedBody).length > 0
        ? sanitizedBody
        : undefined,
    headers: sanitizeHeaders(req.headers),
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    category: 'http',
    direction: 'inbound',
  });

  next();
};

/**
 * Sanitize request body for logging
 * CRITICAL: Never log sensitive fields like passwords, tokens, credit cards
 */
const sanitizeRequestBody = (body: any): any => {
  if (!body || typeof body !== 'object') return {};

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
    'cvv',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
};

/**
 * Sanitize headers for logging
 * CRITICAL: Never log Authorization headers or sensitive data
 */
const sanitizeHeaders = (headers: any): any => {
  const sanitized = { ...headers };
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
  ];

  for (const header of sensitiveHeaders) {
    if (header in sanitized) {
      sanitized[header] = '***REDACTED***';
    }
  }

  return sanitized;
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
