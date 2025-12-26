import winston from 'winston';
import { env } from '../config/env.js';

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
    const { timestamp, level, message, correlationId, errorId, ...meta } = info;

    // Build base message
    let log = `${timestamp} [${level}]: ${message}`;

    // Add correlation ID if present
    if (correlationId) {
      log += ` [CID: ${correlationId}]`;
    }

    // Add error ID if present
    if (errorId) {
      log += ` [EID: ${errorId}]`;
    }

    // Add metadata if present
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
 * Helper to add correlation context to logs
 * Use in services: logger.info('User created', withContext(req, { userId }))
 */
export const withContext = (req: any, meta: object = {}) => {
  return {
    correlationId: req?.correlationId,
    userId: req?.user?.userId,
    path: req?.path,
    method: req?.method,
    ...meta,
  };
};
