import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Request Tracker - Tracks active in-flight requests for graceful shutdown
 *
 * CRITICAL: This enables connection draining during deployments
 * Without this, shutdowns kill in-flight requests mid-processing
 *
 * How it works:
 * 1. Increment counter when request starts
 * 2. Decrement counter when request finishes (success or error)
 * 3. During shutdown, wait for counter to reach 0 before closing database
 *
 * This prevents "connection closed" errors during rolling deployments
 */

// State (module-level, singleton by nature)
let activeRequests = 0;
let isShuttingDown = false;
let drainCallbacks: Array<() => void> = [];

/**
 * Increment active request count
 */
function incrementRequests(): void {
  activeRequests++;
}

/**
 * Decrement active request count
 * If draining and counter hits 0, notify waiting shutdown
 */
function decrementRequests(): void {
  activeRequests--;

  // If we're draining and just hit 0, notify all waiters
  if (activeRequests === 0 && drainCallbacks.length > 0) {
    logger.info('All in-flight requests completed', {
      category: 'shutdown',
    });

    drainCallbacks.forEach((callback) => callback());
    drainCallbacks = [];
  }
}

/**
 * Get current active request count
 */
export function getActiveCount(): number {
  return activeRequests;
}

/**
 * Mark that shutdown has started
 * New requests will be rejected with 503
 */
export function startShutdown(): void {
  isShuttingDown = true;
  logger.info('Shutdown initiated', {
    activeRequests,
    category: 'shutdown',
  });
}

/**
 * Check if shutdown is in progress
 */
function isShutdownInProgress(): boolean {
  return isShuttingDown;
}

/**
 * Wait for all in-flight requests to complete
 * Returns immediately if no active requests
 *
 * @param timeoutMs - Maximum time to wait (default: 30s)
 * @returns Promise that resolves when drained or times out
 */
export async function waitForDrain(timeoutMs: number = 30000): Promise<void> {
  // If no active requests, return immediately
  if (activeRequests === 0) {
    logger.info('No active requests to drain', {
      category: 'shutdown',
    });
    return;
  }

  logger.info('Waiting for in-flight requests to complete', {
    activeRequests,
    timeout: `${timeoutMs}ms`,
    category: 'shutdown',
  });

  const drainStartTime = Date.now();

  return new Promise<void>((resolve) => {
    // Set timeout to force-resolve if drain takes too long
    const timeoutHandle = setTimeout(() => {
      const drainDuration = Date.now() - drainStartTime;

      logger.warn('Connection drain timeout reached', {
        activeRequests,
        drainDuration: `${drainDuration}ms`,
        timeout: `${timeoutMs}ms`,
        category: 'shutdown',
        severity: 'high',
      });

      // Remove this callback from the list
      drainCallbacks = drainCallbacks.filter((cb) => cb !== drainCallback);

      resolve();
    }, timeoutMs);

    // Callback to be invoked when counter hits 0
    const drainCallback = () => {
      clearTimeout(timeoutHandle);
      const drainDuration = Date.now() - drainStartTime;

      logger.info('Connection drain completed', {
        drainDuration: `${drainDuration}ms`,
        category: 'shutdown',
      });

      resolve();
    };

    // Register callback
    drainCallbacks.push(drainCallback);

    // Double-check if drained while we were setting up
    // (race condition: requests could finish between check and callback registration)
    if (activeRequests === 0) {
      clearTimeout(timeoutHandle);
      drainCallbacks = drainCallbacks.filter((cb) => cb !== drainCallback);
      resolve();
    }
  });
}

/**
 * Middleware to track active requests
 *
 * MUST be registered EARLY in middleware chain (after requestCorrelation)
 * so we track ALL requests, including those that fail validation
 */
export const requestTrackerMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Reject new requests if shutdown is in progress
  if (isShutdownInProgress()) {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Server is shutting down. Please retry your request.',
      },
    });
    return;
  }

  // Increment counter when request starts
  incrementRequests();

  // Decrement counter when request finishes (success or error)
  const cleanup = () => {
    decrementRequests();
  };

  // Listen for response finish event
  res.on('finish', cleanup);

  // Listen for connection close (client disconnected)
  res.on('close', cleanup);

  next();
};
