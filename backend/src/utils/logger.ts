import winston from 'winston';
import { env } from '../config/env.js';
import type { Request } from 'express';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

export interface LogContext {
  // Request tracing
  correlationId?: string;
  requestId?: string;

  // User context
  userId?: string;
  userEmail?: string;
  userRole?: string;

  // Operation context
  operation?: string; // e.g., "user.register", "project.create"
  resource?: string; // e.g., "project:abc-123", "user:xyz-789"

  // Performance
  duration?: string; // e.g., "245ms"
  durationMs?: number;

  // HTTP context
  method?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;

  // Request/Response context
  query?: any;
  body?: any;
  headers?: any;
  responseBody?: any;

  // Error context
  errorId?: string;
  errorCode?: string;
  errorMessage?: string;
  stack?: string;

  // Business context
  [key: string]: unknown;
}

export function getLogContext(req?: Request): LogContext {
  if (!req) return {};

  const context: LogContext = {
    method: req.method,
    path: req.path,
  };

  // Only add optional fields if they exist
  if (req.correlationId) context.correlationId = req.correlationId;
  if (req.user?.userId) context.userId = req.user.userId;
  if (req.user?.email) context.userEmail = req.user.email;
  if (req.user?.role) context.userRole = req.user.role;

  const ip = req.ip || req.socket.remoteAddress;
  if (ip) context.ip = ip;

  return context;
}

/**
 * Merge multiple log contexts
 * Useful for adding business context to request context
 */
export function mergeContext(
  ...contexts: (LogContext | undefined)[]
): LogContext {
  return Object.assign({}, ...contexts.filter(Boolean));
}

/**
 * Custom format for production
 * Outputs JSON for log aggregation tools (Datadog, CloudWatch, etc.)
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Custom format for development
 * Human-readable with colors
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const {
      timestamp,
      level,
      message,
      correlationId,
      errorId,
      operation,
      duration,
      userId,
      ...meta
    } = info;

    // Build base message
    let log = `${timestamp} [${level}]: ${message}`;

    // Add critical fields inline
    if (correlationId) log += ` [CID: ${correlationId}]`;
    if (errorId) log += ` [EID: ${errorId}]`;
    if (operation) log += ` [OP: ${operation}]`;
    if (duration) log += ` [${duration}]`;
    if (userId) log += ` [User: ${userId}]`;

    // Add remaining metadata on new line (if exists)
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  })
);

const format =
  env.NODE_ENV === 'production' ? productionFormat : developmentFormat;

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
  }),
];

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  levels,
  format,
  transports,
});

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync('logs', { recursive: true });
} catch (error) {
  // Directory already exists
}

/**
 * Log with automatic context enrichment
 *
 * Usage:
 * logInfo('User registered', req, { userId: user.id, email: user.email })
 */
export function logInfo(
  message: string,
  req?: Request,
  context?: LogContext
): void {
  const baseContext = getLogContext(req);
  logger.info(message, mergeContext(baseContext, context));
}

export function logError(
  message: string,
  error: Error | unknown,
  req?: Request,
  context?: LogContext
): void {
  const baseContext = getLogContext(req);

  const errorContext: LogContext = {
    errorMessage: error instanceof Error ? error.message : 'Unknown error',
  };

  // Only add stack if it exists
  if (error instanceof Error && error.stack) {
    errorContext.stack = error.stack;
  }

  logger.error(message, mergeContext(baseContext, errorContext, context));
}

export function logWarn(
  message: string,
  req?: Request,
  context?: LogContext
): void {
  const baseContext = getLogContext(req);
  logger.warn(message, mergeContext(baseContext, context));
}

export function logDebug(
  message: string,
  req?: Request,
  context?: LogContext
): void {
  const baseContext = getLogContext(req);
  logger.debug(message, mergeContext(baseContext, context));
}

/**
 * Log operation with automatic duration tracking
 *
 * Usage:
 * const tracker = trackOperation('user.register', req, { email: 'test@example.com' });
 * // ... do work ...
 * tracker.success({ userId: user.id });
 * // OR
 * tracker.failure(error);
 */
export function trackOperation(
  operation: string,
  req?: Request,
  context?: LogContext
) {
  const startTime = Date.now();
  const baseContext = mergeContext(getLogContext(req), { operation }, context);

  return {
    success: (additionalContext?: LogContext) => {
      const duration = Date.now() - startTime;
      logger.info(`Operation completed: ${operation}`, {
        ...baseContext,
        ...additionalContext,
        duration: `${duration}ms`,
        durationMs: duration,
        outcome: 'success',
      });
    },

    failure: (error: Error | unknown, additionalContext?: LogContext) => {
      const duration = Date.now() - startTime;
      const errorContext: LogContext = {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };

      // Only add stack if it exists
      if (error instanceof Error && error.stack) {
        errorContext.stack = error.stack;
      }

      logger.error(`Operation failed: ${operation}`, {
        ...baseContext,
        ...errorContext,
        ...additionalContext,
        duration: `${duration}ms`,
        durationMs: duration,
        outcome: 'failure',
      });
    },

    warn: (message: string, additionalContext?: LogContext) => {
      const duration = Date.now() - startTime;
      logger.warn(`${operation}: ${message}`, {
        ...baseContext,
        ...additionalContext,
        duration: `${duration}ms`,
        durationMs: duration,
        outcome: 'warning',
      });
    },
  };
}

/**
 * Log database query for performance monitoring
 *
 * Usage:
 * logQuery('User.findUnique', 145, { userId: '123' })
 */
export function logQuery(
  query: string,
  durationMs: number,
  context?: LogContext
): void {
  const level =
    durationMs > 1000 ? 'warn' : durationMs > 500 ? 'info' : 'debug';

  logger.log(level, `Database query: ${query}`, {
    ...context,
    query,
    duration: `${durationMs}ms`,
    durationMs,
    category: 'database',
  });
}

/**
 * Log external API call
 *
 * Usage:
 * logExternalCall('SMTP', 'sendMail', 234, true, { recipient: 'user@example.com' })
 */
export function logExternalCall(
  service: string,
  method: string,
  durationMs: number,
  success: boolean,
  context?: LogContext
): void {
  const level = success ? 'info' : 'error';

  logger.log(level, `External API: ${service}.${method}`, {
    ...context,
    service,
    method,
    duration: `${durationMs}ms`,
    durationMs,
    success,
    category: 'external_api',
  });
}

/**
 * Log HTTP request (for request/response logging middleware)
 *
 * Usage:
 * logHttpRequest(req, { body: sanitizedBody, headers: sanitizedHeaders })
 */
export function logHttpRequest(req: Request, context?: LogContext): void {
  const requestContext = mergeContext(getLogContext(req), context, {
    category: 'http',
    direction: 'inbound',
  });

  logger.info('Incoming request', requestContext);
}

/**
 * Log HTTP response (for request/response logging middleware)
 *
 * Usage:
 * logHttpResponse(req, res, duration, { responseBody: sanitized })
 */
export function logHttpResponse(
  req: Request,
  statusCode: number,
  durationMs: number,
  context?: LogContext
): void {
  let level: 'info' | 'warn' | 'error' = 'info';
  if (statusCode >= 500) {
    level = 'error';
  } else if (statusCode >= 400) {
    level = 'warn';
  }

  const responseContext = mergeContext(getLogContext(req), context, {
    statusCode,
    duration: `${durationMs}ms`,
    durationMs,
    category: 'http',
    direction: 'outbound',
  });

  logger.log(level, 'Request completed', responseContext);

  // Separate warning for slow requests
  if (durationMs > 3000) {
    logger.warn('Slow request detected', {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      duration: `${durationMs}ms`,
      durationMs,
      threshold: '3000ms',
      category: 'performance',
    });
  }
}
