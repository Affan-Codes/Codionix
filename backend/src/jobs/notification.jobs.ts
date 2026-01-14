import { logger } from '../utils/logger.js';
import {
  sendDeadlineReminders,
  sendWeeklyDigests,
} from '../services/notification.service.js';

/**
 * Cron job: Send deadline reminders
 * Runs daily at 8:00 AM UTC
 */
export async function runDeadlineReminders(): Promise<void> {
  const startTime = Date.now();

  try {
    await sendDeadlineReminders();

    const duration = Date.now() - startTime;

    logger.info('Deadline reminders job completed', {
      duration: `${duration}ms`,
      operation: 'jobs.deadlineReminders',
      category: 'background_job',
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Deadline reminders job failed', {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'jobs.deadlineReminders',
      category: 'background_job',
      severity: 'high',
    });

    throw error;
  }
}

/**
 * Cron job: Send weekly digest emails
 * Runs every Sunday at 9:00 AM UTC
 */
export async function runWeeklyDigests(): Promise<void> {
  const startTime = Date.now();

  try {
    await sendWeeklyDigests();

    const duration = Date.now() - startTime;

    logger.info('Weekly digest job completed', {
      duration: `${duration}ms`,
      operation: 'jobs.weeklyDigest',
      category: 'background_job',
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Weekly digest job failed', {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'jobs.weeklyDigest',
      category: 'background_job',
      severity: 'high',
    });

    throw error;
  }
}
