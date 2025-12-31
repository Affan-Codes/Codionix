import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as healthService from '../services/health.service.js';

/**
 * GET /health
 * Liveness check - lightweight, called very frequently
 *
 * Purpose: Tell load balancer if process is alive
 * Used by: AWS ALB, Kubernetes liveness probe, monitoring
 * Called: Every 2-5 seconds per instance
 *
 * MUST:
 * - Respond in <50ms
 * - NEVER check dependencies (too slow)
 * - Return 200 if process is alive
 *
 * Load balancers use this to:
 * - Detect crashed/frozen processes
 * - Remove dead instances from pool
 * - Restart unhealthy containers
 */
export const getLiveness = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = healthService.livenessCheck();

    res.status(200).json({
      success: true,
      data: result,
    });
  }
);

/**
 * GET /health/ready
 * Readiness check - comprehensive, called less frequently
 *
 * Purpose: Tell load balancer if instance can serve traffic
 * Used by: Kubernetes readiness probe, deployment systems
 * Called: Every 10-30 seconds, or before routing traffic
 *
 * CAN:
 * - Take up to 5 seconds
 * - Check all dependencies
 * - Return 503 if dependencies unhealthy
 *
 * Load balancers use this to:
 * - Wait for startup to complete
 * - Detect degraded instances
 * - Drain traffic during graceful shutdown
 * - Prevent routing to instances that can't handle requests
 *
 * HTTP Status Codes:
 * - 200: All dependencies healthy (route traffic here)
 * - 503: At least one dependency unhealthy (DO NOT route traffic)
 */
export const getReadiness = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await healthService.runHealthChecks();

    // 503 if ANY dependency is unhealthy
    // Load balancer will stop routing traffic to this instance
    const statusCode = result.status === 'unhealthy' ? 503 : 200;

    res.status(statusCode).json({
      success: result.status !== 'unhealthy',
      data: result,
    });
  }
);

/**
 * GET /health/full
 * Full diagnostic check - verbose, called manually
 *
 * Purpose: Detailed diagnostics for ops/debugging
 * Used by: Engineers investigating issues, monitoring dashboards
 * Called: Manually, or by monitoring every 1-5 minutes
 *
 * CAN:
 * - Take up to 10 seconds
 * - Include verbose diagnostics
 * - Always return 200 (even if unhealthy)
 *
 * This is NOT used by load balancers
 * Always returns 200 so you can see diagnostics even when unhealthy
 */
export const getFullHealth = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await healthService.runHealthChecks();

    // ALWAYS return 200 so engineers can see diagnostics
    // Load balancers should NOT use this endpoint
    res.status(200).json({
      success: true,
      data: result,
    });
  }
);
