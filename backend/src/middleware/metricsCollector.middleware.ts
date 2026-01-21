/**
 * Metrics Collection Middleware
 *
 * Automatically tracks HTTP request metrics
 * MUST be registered early in middleware chain (after requestCorrelation)
 */

import type { Request, Response, NextFunction } from 'express';
import {
  httpRequestsTotal,
  httpRequestDuration,
  httpActiveRequests,
  recordResponseTime,
} from '../services/metrics.service.js';

/**
 * Metrics collection middleware
 *
 * Tracks:
 * - Total requests (counter)
 * - Request duration (histogram)
 * - Active requests (gauge)
 * - Response times for percentile calculation
 */
export const metricsCollector = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Increment active requests
  httpActiveRequests.inc();

  const startTime = Date.now();

  // Track request completion
  const trackCompletion = () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode.toString();
    const method = req.method;

    // Normalize path to avoid cardinality explosion
    // Replace UUID params with :id placeholder
    const path = normalizePath(req.path);

    // Update Prometheus metrics
    httpRequestsTotal.inc({ method, path, status: statusCode });
    httpRequestDuration.observe({ method, path, status: statusCode }, duration);
    httpActiveRequests.dec();

    // Record for percentile calculation
    recordResponseTime(duration);
  };

  // Listen for response finish
  res.on('finish', trackCompletion);

  // Handle client disconnect
  res.on('close', () => {
    if (!res.writableEnded) {
      httpActiveRequests.dec();
    }
  });

  next();
};

/**
 * Normalize URL path to prevent metric cardinality explosion
 *
 * Examples:
 * /api/v1/projects/550e8400-e29b-41d4-a716-446655440000 -> /api/v1/projects/:id
 * /api/v1/users/me -> /api/v1/users/me (keep as-is)
 * /api/v1/applications/123e4567-e89b-12d3-a456-426614174000/messages -> /api/v1/applications/:id/messages
 */
function normalizePath(path: string): string {
  // UUID regex pattern
  const uuidPattern =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

  // Numeric ID pattern (fallback)
  const numericIdPattern = /\/\d+(?=\/|$)/g;

  // Replace UUIDs with :id
  let normalized = path.replace(uuidPattern, ':id');

  // Replace numeric IDs with :id (but not version numbers like /v1)
  normalized = normalized.replace(numericIdPattern, '/:id');

  // Limit length to prevent extremely long paths
  if (normalized.length > 100) {
    normalized = normalized.substring(0, 100) + '...';
  }

  return normalized;
}
