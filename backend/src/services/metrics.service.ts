import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';
import type {
  MetricsSnapshot,
  HttpMetrics,
  DatabaseMetrics,
  SocketMetrics,
  EmailMetrics,
  JobMetrics,
  BusinessMetrics,
  SystemMetrics,
} from '../types/metrics.types.js';
import { logger } from '../utils/logger.js';
import { db } from '../config/database.js';
import { prisma } from '../config/database.js';
import { getSocketHealth } from '../config/socket.js';
import { getQueueStats } from './emailQueue.service.js';
import { getSchedulerStatus } from '../jobs/scheduler.service.js';

// ===================================
// PROMETHEUS METRICS
// ===================================

// HTTP Metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

export const httpActiveRequests = new Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
});

// Database Metrics
export const dbQueriesTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
});

export const dbSlowQueriesTotal = new Counter({
  name: 'db_slow_queries_total',
  help: 'Total number of slow database queries',
});

export const dbPoolConnections = new Gauge({
  name: 'db_pool_connections',
  help: 'Database pool connections',
  labelNames: ['state'], // active, idle, waiting
});

// Socket.io Metrics
export const socketConnectionsActive = new Gauge({
  name: 'socket_connections_active',
  help: 'Active Socket.io connections',
});

export const socketMessagesTotal = new Counter({
  name: 'socket_messages_total',
  help: 'Total Socket.io messages',
  labelNames: ['direction'], // sent, received
});

export const socketRoomsActive = new Gauge({
  name: 'socket_rooms_active',
  help: 'Active Socket.io rooms',
});

// Email Queue Metrics
export const emailQueueSize = new Gauge({
  name: 'email_queue_size',
  help: 'Number of emails in queue',
});

export const emailsSentTotal = new Counter({
  name: 'emails_sent_total',
  help: 'Total emails sent',
  labelNames: ['status'], // success, failed
});

// Job Scheduler Metrics
export const jobExecutionsTotal = new Counter({
  name: 'job_executions_total',
  help: 'Total job executions',
  labelNames: ['job', 'status'], // success, failed
});

export const jobDuration = new Histogram({
  name: 'job_duration_ms',
  help: 'Job execution duration in milliseconds',
  labelNames: ['job'],
  buckets: [100, 500, 1000, 5000, 10000, 30000, 60000],
});

// Business Metrics
export const usersTotal = new Gauge({
  name: 'users_total',
  help: 'Total number of users',
  labelNames: ['role'], // STUDENT, MENTOR, EMPLOYER, ADMIN
});

export const projectsTotal = new Gauge({
  name: 'projects_total',
  help: 'Total number of projects',
  labelNames: ['status'], // DRAFT, PUBLISHED, CLOSED
});

export const applicationsTotal = new Gauge({
  name: 'applications_total',
  help: 'Total number of applications',
  labelNames: ['status'], // PENDING, UNDER_REVIEW, ACCEPTED, REJECTED
});

// ===================================
// IN-MEMORY METRICS STORE
// ===================================

interface ResponseTimeBuffer {
  values: number[];
  maxSize: number;
}

const responseTimeBuffer: ResponseTimeBuffer = {
  values: [],
  maxSize: 1000, // Keep last 1000 response times for percentile calculation
};

const socketMessageLatencies: number[] = [];
const emailProcessingTimes: number[] = [];
const jobExecutionTimes: Map<string, number[]> = new Map();

// ===================================
// HELPER FUNCTIONS
// ===================================

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] ?? 0;
}

/**
 * Add response time to buffer (circular buffer)
 */
export function recordResponseTime(durationMs: number): void {
  responseTimeBuffer.values.push(durationMs);

  // Keep only last N values
  if (responseTimeBuffer.values.length > responseTimeBuffer.maxSize) {
    responseTimeBuffer.values.shift();
  }
}

/**
 * Record socket message latency
 */
export function recordSocketMessageLatency(latencyMs: number): void {
  socketMessageLatencies.push(latencyMs);

  // Keep only last 500
  if (socketMessageLatencies.length > 500) {
    socketMessageLatencies.shift();
  }
}

/**
 * Record email processing time
 */
export function recordEmailProcessingTime(durationMs: number): void {
  emailProcessingTimes.push(durationMs);

  // Keep only last 500
  if (emailProcessingTimes.length > 500) {
    emailProcessingTimes.shift();
  }
}

/**
 * Record job execution time
 */
export function recordJobExecutionTime(
  jobName: string,
  durationMs: number
): void {
  if (!jobExecutionTimes.has(jobName)) {
    jobExecutionTimes.set(jobName, []);
  }

  const times = jobExecutionTimes.get(jobName)!;
  times.push(durationMs);

  // Keep only last 100 per job
  if (times.length > 100) {
    times.shift();
  }
}

// ===================================
// METRICS COLLECTION
// ===================================

/**
 * Collect HTTP metrics
 */
async function collectHttpMetrics(): Promise<HttpMetrics> {
  const values = responseTimeBuffer.values;
  const avg =
    values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0;

  return {
    totalRequests: 0, // Tracked via Prometheus counter
    activeRequests: 0, // Tracked via Prometheus gauge
    requestsByMethod: {},
    requestsByStatus: {},
    requestsByPath: {},
    errorRate: 0,
    avgResponseTime: Math.round(avg * 100) / 100,
    p50ResponseTime: calculatePercentile(values, 50),
    p95ResponseTime: calculatePercentile(values, 95),
    p99ResponseTime: calculatePercentile(values, 99),
  };
}

/**
 * Collect database metrics
 */
async function collectDatabaseMetrics(): Promise<DatabaseMetrics> {
  const poolStats = db.getPoolStats();

  return {
    totalQueries: poolStats.totalQueries,
    slowQueries: poolStats.slowQueries,
    avgQueryTime: 0, // Would need query time tracking
    poolTotal: poolStats.totalCount,
    poolIdle: poolStats.idleCount,
    poolWaiting: poolStats.waitingCount,
    poolUtilization: parseInt(poolStats.utilization),
    activeQueries: poolStats.activeQueries,
  };
}

/**
 * Collect Socket.io metrics
 */
async function collectSocketMetrics(): Promise<SocketMetrics> {
  const health = await getSocketHealth();

  const avgLatency =
    socketMessageLatencies.length > 0
      ? socketMessageLatencies.reduce((sum, v) => sum + v, 0) /
        socketMessageLatencies.length
      : 0;

  return {
    activeConnections: health.activeConnections,
    totalConnections: 0, // Tracked via counter
    disconnections: 0, // Tracked via counter
    activeRooms: health.activeRooms,
    messagesSent: 0, // Tracked via counter
    messagesReceived: 0, // Tracked via counter
    avgMessageLatency: Math.round(avgLatency * 100) / 100,
  };
}

/**
 * Collect email queue metrics
 */
async function collectEmailMetrics(): Promise<EmailMetrics> {
  const queueStats = getQueueStats();

  const avgProcessing =
    emailProcessingTimes.length > 0
      ? emailProcessingTimes.reduce((sum, v) => sum + v, 0) /
        emailProcessingTimes.length
      : 0;

  return {
    queueSize: queueStats.queueSize,
    emailsSent: 0, // Tracked via counter
    emailsFailed: 0, // Tracked via counter
    avgProcessingTime: Math.round(avgProcessing * 100) / 100,
    successRate: 0,
  };
}

/**
 * Collect job scheduler metrics
 */
async function collectJobMetrics(): Promise<JobMetrics> {
  const schedulerStatus = getSchedulerStatus();

  // Calculate average execution time across all jobs
  let totalTime = 0;
  let totalCount = 0;

  for (const times of jobExecutionTimes.values()) {
    totalTime += times.reduce((sum, v) => sum + v, 0);
    totalCount += times.length;
  }

  const avgExecution = totalCount > 0 ? totalTime / totalCount : 0;

  return {
    activeJobs: schedulerStatus.runningJobs,
    completedJobs: 0, // Tracked via counter
    failedJobs: 0, // Tracked via counter
    avgExecutionTime: Math.round(avgExecution * 100) / 100,
    nextScheduledJob: undefined,
  };
}

/**
 * Collect business metrics
 */
async function collectBusinessMetrics(): Promise<BusinessMetrics> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [
    totalUsers,
    usersByRole,
    activeToday,
    newToday,
    totalProjects,
    projectsByStatus,
    activeDeadlines,
    totalApplications,
    applicationsByStatus,
    todayApplications,
    totalMessages,
    todayMessages,
    unreadMessages,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({
      by: ['role'],
      _count: true,
    }),
    prisma.user.count({
      where: { updatedAt: { gte: today } },
    }),
    prisma.user.count({
      where: { createdAt: { gte: today } },
    }),
    prisma.project.count(),
    prisma.project.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.project.count({
      where: {
        status: 'PUBLISHED',
        deadline: { gte: now },
      },
    }),
    prisma.application.count(),
    prisma.application.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.application.count({
      where: { appliedAt: { gte: today } },
    }),
    prisma.message.count(),
    prisma.message.count({
      where: { createdAt: { gte: today } },
    }),
    prisma.message.count({
      where: { isRead: false, isDeleted: false },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      students: usersByRole.find((r) => r.role === 'STUDENT')?._count ?? 0,
      mentors: usersByRole.find((r) => r.role === 'MENTOR')?._count ?? 0,
      employers: usersByRole.find((r) => r.role === 'EMPLOYER')?._count ?? 0,
      activeToday,
      newToday,
    },
    projects: {
      total: totalProjects,
      published:
        projectsByStatus.find((s) => s.status === 'PUBLISHED')?._count ?? 0,
      activeDeadlines,
    },
    applications: {
      total: totalApplications,
      pending:
        applicationsByStatus.find((s) => s.status === 'PENDING')?._count ?? 0,
      todaySubmitted: todayApplications,
    },
    messages: {
      total: totalMessages,
      todayCount: todayMessages,
      unreadCount: unreadMessages,
    },
  };
}

/**
 * Collect system metrics
 */
function collectSystemMetrics(): SystemMetrics {
  const usage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    uptime: process.uptime(),
    memory: {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      rss: usage.rss,
      external: usage.external,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    eventLoop: {
      lag: 0, // Would need event loop monitoring library
    },
  };
}

// ===================================
// AGGREGATED SNAPSHOT
// ===================================

/**
 * Get complete metrics snapshot
 */
export async function getMetricsSnapshot(): Promise<MetricsSnapshot> {
  try {
    const [http, database, socket, email, jobs, business, system] =
      await Promise.all([
        collectHttpMetrics(),
        collectDatabaseMetrics(),
        collectSocketMetrics(),
        collectEmailMetrics(),
        collectJobMetrics(),
        collectBusinessMetrics(),
        Promise.resolve(collectSystemMetrics()),
      ]);

    return {
      timestamp: new Date().toISOString(),
      http,
      database,
      socket,
      email,
      jobs,
      business,
      system,
    };
  } catch (error) {
    logger.error('Failed to collect metrics snapshot', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'metrics.snapshot',
    });

    throw error;
  }
}

/**
 * Get Prometheus-formatted metrics
 */
export function getPrometheusMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Update Prometheus gauges with current values
 * Call this periodically to keep gauges updated
 */
export async function updatePrometheusGauges(): Promise<void> {
  try {
    // Database metrics
    const poolStats = db.getPoolStats();
    dbPoolConnections.set(
      { state: 'active' },
      poolStats.totalCount - poolStats.idleCount
    );
    dbPoolConnections.set({ state: 'idle' }, poolStats.idleCount);
    dbPoolConnections.set({ state: 'waiting' }, poolStats.waitingCount);

    // Socket metrics
    const socketHealth = await getSocketHealth();
    socketConnectionsActive.set(socketHealth.activeConnections);
    socketRoomsActive.set(socketHealth.activeRooms);

    // Email queue metrics
    const queueStats = getQueueStats();
    emailQueueSize.set(queueStats.queueSize);

    // Business metrics
    const business = await collectBusinessMetrics();
    usersTotal.set({ role: 'STUDENT' }, business.users.students);
    usersTotal.set({ role: 'MENTOR' }, business.users.mentors);
    usersTotal.set({ role: 'EMPLOYER' }, business.users.employers);

    projectsTotal.set({ status: 'PUBLISHED' }, business.projects.published);
    applicationsTotal.set({ status: 'PENDING' }, business.applications.pending);
  } catch (error) {
    logger.error('Failed to update Prometheus gauges', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'metrics.updateGauges',
    });
  }
}

// ===================================
// INITIALIZATION
// ===================================

/**
 * Initialize metrics collection
 */
export function initializeMetrics(): void {
  // Collect default Node.js metrics (memory, CPU, event loop, etc.)
  collectDefaultMetrics({ register });

  logger.info('✅ Metrics collection initialized', {
    operation: 'metrics.init',
  });
}

/**
 * Start periodic gauge updates
 */
export function startMetricsCollection(
  intervalMs: number = 10000
): NodeJS.Timeout {
  const interval = setInterval(async () => {
    await updatePrometheusGauges();
  }, intervalMs);

  logger.info('✅ Periodic metrics collection started', {
    interval: `${intervalMs}ms`,
    operation: 'metrics.start',
  });

  return interval;
}

/**
 * Stop periodic gauge updates
 */
export function stopMetricsCollection(interval: NodeJS.Timeout): void {
  clearInterval(interval);

  logger.info('Metrics collection stopped', {
    operation: 'metrics.stop',
  });
}
