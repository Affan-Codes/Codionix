import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { sanitizeBody, sanitizeHeaders } from '../utils/sanitize.js';

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
  const sanitizedBody = req.body ? sanitizeBody(req.body) : undefined;

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
