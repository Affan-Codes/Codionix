// backend/src/services/emailQueue.service.ts

/**
 * Email Queue Service
 *
 * PROBLEM: Sending emails synchronously blocks HTTP responses
 * - 2-5 second SMTP delays hurt UX
 * - Network failures crash requests
 * - No retry mechanism
 *
 * SOLUTION: In-memory job queue with background processing
 * - HTTP responses return immediately
 * - Emails sent in background worker
 * - Automatic retry on failure
 *
 * PRODUCTION NOTE: Replace with Redis/Bull for multi-instance deployments
 */

import { logger } from '../utils/logger.js';
import { sendApplicationStatusEmail } from './email.service.js';

// ===================================
// TYPES
// ===================================

interface EmailJob {
  id: string;
  type: 'application_status_change';
  data: {
    recipientEmail: string;
    recipientName: string;
    projectTitle: string;
    status: 'ACCEPTED' | 'REJECTED' | 'UNDER_REVIEW';
    rejectionReason?: string;
  };
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  nextRetryAt?: Date;
}

// ===================================
// QUEUE STATE
// ===================================

const queue: EmailJob[] = [];
let isProcessing = false;
let processingInterval: NodeJS.Timeout | null = null;

const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s
const MAX_ATTEMPTS = 3;

// ===================================
// PUBLIC API
// ===================================

/**
 * Add email to queue (non-blocking)
 */
export function enqueueApplicationStatusEmail(data: EmailJob['data']): void {
  const job: EmailJob = {
    id: `${Date.now()}-${Math.random()}`,
    type: 'application_status_change',
    data,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    createdAt: new Date(),
  };

  queue.push(job);

  logger.info('Email job enqueued', {
    jobId: job.id,
    recipientEmail: job.data.recipientEmail,
    status: job.data.status,
    queueSize: queue.length,
    category: 'email_queue',
  });

  // Start processing if not already running
  if (!isProcessing) {
    startProcessing();
  }
}

/**
 * Start background email processor
 */
export function startEmailQueue(): void {
  logger.info('Email queue started', {
    category: 'email_queue',
  });

  // Process queue every 2 seconds
  processingInterval = setInterval(() => {
    if (!isProcessing && queue.length > 0) {
      startProcessing();
    }
  }, 2000);
}

/**
 * Stop email queue (for graceful shutdown)
 */
export async function stopEmailQueue(): Promise<void> {
  logger.info('Stopping email queue', {
    pendingJobs: queue.length,
    category: 'email_queue',
  });

  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }

  // Wait for current processing to finish (max 10s)
  const timeout = Date.now() + 10000;
  while (isProcessing && Date.now() < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (queue.length > 0) {
    logger.warn('Email queue stopped with pending jobs', {
      pendingJobs: queue.length,
      category: 'email_queue',
    });
  } else {
    logger.info('Email queue stopped cleanly', {
      category: 'email_queue',
    });
  }
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
  return {
    queueSize: queue.length,
    isProcessing,
    oldestJob: queue[0]?.createdAt,
  };
}

// ===================================
// INTERNAL PROCESSING
// ===================================

async function startProcessing(): Promise<void> {
  if (isProcessing) return;

  isProcessing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    if (!job) break;

    // Skip jobs that are waiting for retry
    if (job.nextRetryAt && job.nextRetryAt > new Date()) {
      // Move to end of queue
      queue.push(job);

      // If all jobs are waiting, stop processing until next interval
      if (queue.every((j) => j.nextRetryAt && j.nextRetryAt > new Date())) {
        break;
      }
      continue;
    }

    await processJob(job);

    // Remove job from queue (already processed or failed permanently)
    queue.shift();
  }

  isProcessing = false;
}

async function processJob(job: EmailJob): Promise<void> {
  job.attempts++;

  const startTime = Date.now();

  try {
    await sendApplicationStatusEmail(
      job.data.recipientEmail,
      job.data.recipientName,
      job.data.projectTitle,
      job.data.status,
      job.data.rejectionReason
    );

    const duration = Date.now() - startTime;

    logger.info('Email job completed', {
      jobId: job.id,
      recipientEmail: job.data.recipientEmail,
      status: job.data.status,
      attempts: job.attempts,
      duration: `${duration}ms`,
      category: 'email_queue',
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Email job failed', {
      jobId: job.id,
      recipientEmail: job.data.recipientEmail,
      status: job.data.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'email_queue',
    });

    // Retry if attempts remaining
    if (job.attempts < job.maxAttempts) {
      const retryDelay = RETRY_DELAYS[job.attempts - 1] || 15000;
      job.nextRetryAt = new Date(Date.now() + retryDelay);

      logger.info('Email job scheduled for retry', {
        jobId: job.id,
        nextRetry: job.nextRetryAt.toISOString(),
        retryDelay: `${retryDelay}ms`,
        category: 'email_queue',
      });

      // Put job back in queue for retry
      queue.push(job);
    } else {
      logger.error('Email job permanently failed', {
        jobId: job.id,
        recipientEmail: job.data.recipientEmail,
        attempts: job.attempts,
        category: 'email_queue',
        severity: 'high',
      });
    }
  }
}
