import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function autoCloseExpiredProjects(): Promise<void> {
  const startTime = Date.now();

  try {
    // Find all PUBLISHED projects past deadline
    const expiredProjects = await prisma.project.updateMany({
      where: {
        status: 'PUBLISHED',
        deadline: {
          lt: new Date(), // Deadline in the past
        },
      },
      data: {
        status: 'CLOSED',
      },
    });

    const duration = Date.now() - startTime;

    if (expiredProjects.count > 0) {
      logger.info('Auto-closed expired projects', {
        projectsClosed: expiredProjects.count,
        duration: `${duration}ms`,
        operation: 'jobs.autoCloseProjects',
        category: 'background_job',
      });
    } else {
      logger.debug('No expired projects to close', {
        duration: `${duration}ms`,
        operation: 'jobs.autoCloseProjects',
        category: 'background_job',
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to auto-close expired projects', {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'jobs.autoCloseProjects',
      category: 'background_job',
      severity: 'high',
    });

    throw error;
  }
}

/**
 * Send deadline reminders to interested students
 *
 * TODO: Implement after user preferences system
 * Requires "saved projects" or "interested in" tracking
 */
export async function sendDeadlineReminders(): Promise<void> {
  logger.warn(
    'Deadline reminders not implemented - requires user preferences',
    {
      operation: 'jobs.deadlineReminders',
      category: 'background_job',
    }
  );
}
