import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Response logging middleware
 * CRITICAL: Must be registered BEFORE route handlers but AFTER requestCorrelation
 *
 * Captures:
 * - Response status code
 * - Response time
 * - Response body (for errors only, to avoid logging large payloads)
 * - User context (if authenticated)
 *
 * This is THE KEY to debugging production issues.
 * Without this, you cannot answer "what did we actually send back?"
 */
export const responseLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Store original res.json to intercept response body
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  // Flag to prevent double logging
  let logged = false;

  // Intercept res.json()
  res.json = function (body: any): Response {
    if (!logged) {
      logResponse(req, res, body);
      logged = true;
    }
    return originalJson(body);
  };

  // Intercept res.send()
  res.send = function (body: any): Response {
    if (!logged) {
      // Try to parse body as JSON for logging
      let parsedBody = body;
      if (typeof body === 'string') {
        try {
          parsedBody = JSON.parse(body);
        } catch {
          // Not JSON, log as-is (truncated)
          parsedBody =
            body.length > 500 ? body.substring(0, 500) + '...' : body;
        }
      }
      logResponse(req, res, parsedBody);
      logged = true;
    }
    return originalSend(body);
  };

  // Also capture on finish event as fallback
  res.on('finish', () => {
    if (!logged) {
      logResponse(req, res, null);
      logged = true;
    }
  });

  next();
};

/**
 * Log response with full context
 */
function logResponse(req: Request, res: Response, body: any): void {
  // Calculate request duration
  const duration = req.startTime ? Date.now() - req.startTime : 0;

  // Determine log level based on status code
  let level: 'info' | 'warn' | 'error' = 'info';
  if (res.statusCode >= 500) {
    level = 'error';
  } else if (res.statusCode >= 400) {
    level = 'warn';
  }

  // Build response context
  const responseContext: any = {
    correlationId: req.correlationId,
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
  };

  // Add response body ONLY for errors (4xx/5xx)
  // Never log successful response bodies (could be huge, contain sensitive data)
  if (res.statusCode >= 400 && body) {
    responseContext.responseBody = sanitizeResponseBody(body);
  }

  // Add performance warning if slow
  if (duration > 3000) {
    responseContext.performance = 'slow';
  }

  // Log response
  logger.log(level, 'Request completed', responseContext);

  // Separate warning for slow requests
  if (duration > 3000) {
    logger.warn('Slow request detected', {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      duration: `${duration}ms`,
      durationMs: duration,
      threshold: '3000ms',
      category: 'performance',
    });
  }

  // Separate error log for 5xx with full details
  if (res.statusCode >= 500) {
    logger.error('Server error response', {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      query: req.query,
      body: sanitizeRequestBody(req.body),
      responseBody: body ? sanitizeResponseBody(body) : undefined,
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      category: 'error',
      severity: 'high',
    });
  }
}

/**
 * Sanitize response body for logging
 * Remove sensitive data that might be in error responses
 */
function sanitizeResponseBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  // Also sanitize nested error details
  if (sanitized.error && typeof sanitized.error === 'object') {
    sanitized.error = { ...sanitized.error };
    for (const field of sensitiveFields) {
      if (field in sanitized.error) {
        sanitized.error[field] = '***REDACTED***';
      }
    }
  }

  return sanitized;
}

/**
 * Sanitize request body for logging
 * CRITICAL: Never log sensitive fields like passwords, tokens, credit cards
 */
function sanitizeRequestBody(body: any): any {
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
    'cvv',
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }

  return sanitized;
}
