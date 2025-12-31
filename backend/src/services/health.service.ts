// ===================================
// HEALTH CHECK TYPES
// ===================================

import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface DependencyHealth {
  name: string;
  status: HealthStatus;
  responseTime: number; // milliseconds
  message?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number; // seconds
  environment: string;
  version: string;
  dependencies: DependencyHealth[];
}

// ===================================
// HEALTH CHECK THRESHOLDS
// ===================================

const THRESHOLDS = {
  database: {
    warningMs: 100, // Query should complete in <100ms
    criticalMs: 500, // Query taking >500ms is critical
    poolUtilizationWarning: 80, // Warn if pool is 80%+ utilized
    poolUtilizationCritical: 95, // Critical if pool is 95%+ utilized
  },
  email: {
    timeoutMs: 3000, // SMTP connection timeout
  },
} as const;

// ===================================
// DEPENDENCY HEALTH CHECKS
// ===================================

/**
 * Check database health with connection pool metrics
 * CRITICAL: This is the MOST IMPORTANT dependency
 *
 * Failure modes detected:
 * - Database unreachable (network/DNS)
 * - Read-only mode (replica promoted, disk full)
 * - Slow queries (index missing, lock contention)
 * - Pool exhaustion (connection leak, traffic spike)
 */
async function checkDatabase(): Promise<DependencyHealth> {
  const startTime = Date.now();

  try {
    // 1. Test query execution (validates connection + read access)
    await db.healthCheck();

    const responseTime = Date.now() - startTime;

    // 2. Get connection pool metrics
    const poolStats = db.getPoolStats();
    const utilization = parseInt(poolStats.utilization);

    // 3. Determine status based on metrics
    let status: HealthStatus = 'healthy';
    let message = 'Database operational';

    // Critical: Pool near exhaustion
    if (utilization >= THRESHOLDS.database.poolUtilizationCritical) {
      status = 'unhealthy';
      message = `Connection pool critically exhausted (${utilization}%)`;
    }
    // Critical: Query too slow
    else if (responseTime > THRESHOLDS.database.criticalMs) {
      status = 'unhealthy';
      message = `Database critically slow (${responseTime}ms)`;
    }
    // Warning: Pool high utilization
    else if (utilization >= THRESHOLDS.database.poolUtilizationWarning) {
      status = 'degraded';
      message = `Connection pool utilization high (${utilization}%)`;
    }
    // Warning: Query slow
    else if (responseTime > THRESHOLDS.database.warningMs) {
      status = 'degraded';
      message = `Database response slow (${responseTime}ms)`;
    }

    return {
      name: 'database',
      status,
      responseTime,
      message,
      details: {
        poolTotal: poolStats.totalCount,
        poolIdle: poolStats.idleCount,
        poolWaiting: poolStats.waitingCount,
        poolMax: poolStats.maxConnections,
        utilization: poolStats.utilization,
        activeQueries: poolStats.activeQueries,
        totalQueries: poolStats.totalQueries,
        slowQueries: poolStats.slowQueries,
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${responseTime}ms`,
    });

    return {
      name: 'database',
      status: 'unhealthy',
      responseTime,
      message:
        error instanceof Error ? error.message : 'Database connection failed',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Check email service health
 * CRITICAL: Silent email failures are VERY common in production
 *
 * Failure modes detected:
 * - SMTP credentials expired/revoked
 * - SMTP server unreachable (firewall, DNS)
 * - Rate limits hit
 * - Connection timeout
 *
 * NOTE: We don't send actual emails in health checks
 * We only validate SMTP connectivity
 */
async function checkEmail(): Promise<DependencyHealth> {
  const startTime = Date.now();

  // If SMTP not configured, mark as degraded (not critical)
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return {
      name: 'email',
      status: 'degraded',
      responseTime: 0,
      message: 'Email service not configured',
      details: {
        configured: false,
      },
    };
  }

  try {
    // Import nodemailer only if SMTP is configured
    const nodemailer = await import('nodemailer');

    // Create transporter
    const transporter = nodemailer.default.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      // Connection timeouts
      connectionTimeout: THRESHOLDS.email.timeoutMs,
      greetingTimeout: THRESHOLDS.email.timeoutMs,
    });

    // Verify SMTP connection (does NOT send email)
    await transporter.verify();

    const responseTime = Date.now() - startTime;

    return {
      name: 'email',
      status: 'healthy',
      responseTime,
      message: 'Email service operational',
      details: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Email health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${responseTime}ms`,
    });

    return {
      name: 'email',
      status: 'degraded', // Not critical - app works without email
      responseTime,
      message:
        error instanceof Error ? error.message : 'Email service unavailable',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// ===================================
// AGGREGATED HEALTH CHECK
// ===================================

/**
 * Run all dependency health checks in parallel
 *
 * Status determination:
 * - healthy: All dependencies healthy
 * - degraded: At least one dependency degraded, none unhealthy
 * - unhealthy: At least one dependency unhealthy
 *
 * CRITICAL: This runs ALL checks even if one fails
 * We need complete diagnostics, not fail-fast
 */
export async function runHealthChecks(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  // Run all checks in parallel (don't fail-fast)
  const [databaseHealth, emailHealth] = await Promise.all([
    checkDatabase(),
    checkEmail(),
  ]);

  const dependencies = [databaseHealth, emailHealth];

  // Determine overall status
  const hasUnhealthy = dependencies.some((d) => d.status === 'unhealthy');
  const hasDegraded = dependencies.some((d) => d.status === 'degraded');

  let overallStatus: HealthStatus = 'healthy';
  if (hasUnhealthy) {
    overallStatus = 'unhealthy';
  } else if (hasDegraded) {
    overallStatus = 'degraded';
  }

  const checkDuration = Date.now() - startTime;

  logger.debug('Health check completed', {
    status: overallStatus,
    duration: `${checkDuration}ms`,
    dependencies: dependencies.map((d) => ({
      name: d.name,
      status: d.status,
      responseTime: `${d.responseTime}ms`,
    })),
  });

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    dependencies,
  };
}

/**
 * Lightweight liveness check
 * Called VERY frequently by load balancers (every 2-5 seconds)
 *
 * MUST be fast (<50ms) and check ONLY:
 * - Process is alive
 * - Event loop not blocked
 *
 * Does NOT check dependencies
 * Used by: Kubernetes liveness probe, AWS ALB health checks
 */
export function livenessCheck(): { alive: boolean; uptime: number } {
  return {
    alive: true,
    uptime: process.uptime(),
  };
}
