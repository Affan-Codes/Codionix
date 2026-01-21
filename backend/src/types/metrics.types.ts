// ===================================
// METRIC CATEGORIES
// ===================================

export interface HttpMetrics {
  totalRequests: number;
  activeRequests: number;
  requestsByMethod: Record<string, number>;
  requestsByStatus: Record<string, number>;
  requestsByPath: Record<string, number>;
  errorRate: number; // percentage
  avgResponseTime: number; // milliseconds
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

export interface DatabaseMetrics {
  totalQueries: number;
  slowQueries: number;
  avgQueryTime: number;
  poolTotal: number;
  poolIdle: number;
  poolWaiting: number;
  poolUtilization: number; // percentage
  activeQueries: number;
}

export interface SocketMetrics {
  activeConnections: number;
  totalConnections: number;
  disconnections: number;
  activeRooms: number;
  messagesSent: number;
  messagesReceived: number;
  avgMessageLatency: number; // milliseconds
}

export interface EmailMetrics {
  queueSize: number;
  emailsSent: number;
  emailsFailed: number;
  avgProcessingTime: number; // milliseconds
  successRate: number; // percentage
}

export interface JobMetrics {
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgExecutionTime: number; // milliseconds
  nextScheduledJob?: string | undefined; // ISO timestamp
}

export interface BusinessMetrics {
  users: {
    total: number;
    students: number;
    mentors: number;
    employers: number;
    activeToday: number;
    newToday: number;
  };
  projects: {
    total: number;
    published: number;
    activeDeadlines: number; // not expired
  };
  applications: {
    total: number;
    pending: number;
    todaySubmitted: number;
  };
  messages: {
    total: number;
    todayCount: number;
    unreadCount: number;
  };
}

export interface SystemMetrics {
  uptime: number; // seconds
  memory: {
    heapUsed: number; // bytes
    heapTotal: number; // bytes
    rss: number; // bytes
    external: number; // bytes
  };
  cpu: {
    user: number; // microseconds
    system: number; // microseconds
  };
  eventLoop: {
    lag: number; // milliseconds
  };
}

// ===================================
// AGGREGATED METRICS SNAPSHOT
// ===================================

export interface MetricsSnapshot {
  timestamp: string;
  http: HttpMetrics;
  database: DatabaseMetrics;
  socket: SocketMetrics;
  email: EmailMetrics;
  jobs: JobMetrics;
  business: BusinessMetrics;
  system: SystemMetrics;
}

// ===================================
// TIME-SERIES DATA POINT
// ===================================

export interface MetricDataPoint {
  timestamp: number;
  value: number;
}

export interface TimeSeries {
  metric: string;
  labels?: Record<string, string>;
  dataPoints: MetricDataPoint[];
}

// ===================================
// HISTOGRAM BUCKETS
// ===================================

export interface HistogramBucket {
  le: number; // less than or equal to
  count: number;
}

export interface Histogram {
  sum: number;
  count: number;
  buckets: HistogramBucket[];
}

// ===================================
// ALERT THRESHOLDS
// ===================================

export interface MetricThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  value: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface MetricAlert {
  threshold: MetricThreshold;
  currentValue: number;
  triggeredAt: Date;
  acknowledged: boolean;
}
