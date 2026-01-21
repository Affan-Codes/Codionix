import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  getMetricsSnapshot,
  getPrometheusMetrics,
} from '../services/metrics.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * GET /api/v1/metrics
 * Get JSON metrics snapshot
 *
 * @access Protected (ADMIN only)
 */
export const getMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const snapshot = await getMetricsSnapshot();
  ApiResponse.success(res, snapshot);
});

/**
 * GET /api/v1/metrics/prometheus
 * Get Prometheus-formatted metrics
 *
 * @access Public (for Prometheus scraper)
 */
export const getPrometheus = asyncHandler(
  async (_req: Request, res: Response) => {
    const metrics = await getPrometheusMetrics();

    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  }
);

/**
 * GET /api/v1/metrics/health-summary
 * Get simplified health summary (for dashboards)
 *
 * @access Protected (ADMIN only)
 */
export const getHealthSummary = asyncHandler(
  async (_req: Request, res: Response) => {
    const snapshot = await getMetricsSnapshot();

    // Determine overall health status
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check database
    if (snapshot.database.poolUtilization > 90) {
      issues.push('Database pool near exhaustion');
      status = 'unhealthy';
    } else if (snapshot.database.poolUtilization > 80) {
      issues.push('High database pool utilization');
      if (status === 'healthy') status = 'degraded';
    }

    // Check email queue
    if (snapshot.email.queueSize > 100) {
      issues.push('Email queue backing up');
      if (status === 'healthy') status = 'degraded';
    }

    // Check response times
    if (snapshot.http.p95ResponseTime > 2000) {
      issues.push('Slow response times (P95 > 2s)');
      if (status === 'healthy') status = 'degraded';
    }

    // Check memory
    const memoryUsagePercent =
      (snapshot.system.memory.heapUsed / snapshot.system.memory.heapTotal) *
      100;
    if (memoryUsagePercent > 90) {
      issues.push('High memory usage');
      status = 'unhealthy';
    } else if (memoryUsagePercent > 80) {
      issues.push('Elevated memory usage');
      if (status === 'healthy') status = 'degraded';
    }

    const summary = {
      status,
      timestamp: snapshot.timestamp,
      uptime: snapshot.system.uptime,
      issues,
      keyMetrics: {
        activeUsers: snapshot.business.users.activeToday,
        activeConnections: snapshot.socket.activeConnections,
        queueSize: snapshot.email.queueSize,
        p95ResponseTime: snapshot.http.p95ResponseTime,
        dbPoolUtilization: snapshot.database.poolUtilization,
        memoryUsagePercent: Math.round(memoryUsagePercent),
      },
    };

    ApiResponse.success(res, summary);
  }
);
