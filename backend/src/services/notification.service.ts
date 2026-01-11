/**
 * Notifications Service (UPDATED)
 * Added: sendPasswordResetNotification, sendEmailVerificationNotification
 */

import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { EMAIL_CONFIG } from '../config/email.js';
import {
  createWelcomeEmail,
  createNewApplicationAlert,
  createApplicationStatusEmail,
  createEmailVerificationTemplate,
  createPasswordResetTemplate,
} from './emailTemplates.service.js';
import { enqueueEmail } from './emailQueue.service.js';

/**
 * Send email verification link
 */
export const sendEmailVerificationNotification = async (
  email: string,
  verificationToken: string
): Promise<void> => {
  try {
    const html = createEmailVerificationTemplate(verificationToken);

    enqueueEmail({
      recipientEmail: email,
      recipientName: email.split('@')[0] ?? email, // Use email prefix as fallback name
      subject: 'Verify Your Email - Codionix',
      html,
      metadata: {
        type: 'email_verification',
        email,
      },
    });

    logger.info('Email verification queued', {
      email,
      operation: 'notifications.emailVerification',
    });
  } catch (error) {
    logger.error('Failed to queue email verification', {
      email,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'notifications.emailVerification',
    });
  }
};

/**
 * Send password reset link
 */
export const sendPasswordResetNotification = async (
  email: string,
  resetToken: string
): Promise<void> => {
  try {
    const html = createPasswordResetTemplate(resetToken);

    enqueueEmail({
      recipientEmail: email,
      recipientName: email.split('@')[0] ?? email, // Use email prefix as fallback name
      subject: 'Reset Your Password - Codionix',
      html,
      metadata: {
        type: 'password_reset',
        email,
      },
    });

    logger.info('Password reset email queued', {
      email,
      operation: 'notifications.passwordReset',
    });
  } catch (error) {
    logger.error('Failed to queue password reset email', {
      email,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'notifications.passwordReset',
    });
  }
};

/**
 * Send welcome email after successful email verification
 */
export const sendWelcomeNotification = async (
  userId: string
): Promise<void> => {
  if (!EMAIL_CONFIG.FEATURES.WELCOME_EMAIL) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        fullName: true,
        role: true,
        isEmailVerified: true,
      },
    });

    if (!user || !user.isEmailVerified) {
      logger.warn('Welcome email skipped - user not verified', {
        userId,
        operation: 'notifications.sendWelcome',
      });
      return;
    }

    const html = createWelcomeEmail(user.fullName, user.role);

    enqueueEmail({
      recipientEmail: user.email,
      recipientName: user.fullName,
      subject: 'Welcome to Codionix - Start Building Today',
      html,
      metadata: {
        type: EMAIL_CONFIG.NOTIFICATIONS.WELCOME,
        userId,
      },
    });

    logger.info('Welcome email queued', {
      userId,
      email: user.email,
      role: user.role,
      operation: 'notifications.sendWelcome',
    });
  } catch (error) {
    logger.error('Failed to queue welcome email', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'notifications.sendWelcome',
    });
  }
};

/**
 * Alert project owner when new application is submitted
 */
export const sendNewApplicationNotification = async (
  applicationId: string
): Promise<void> => {
  if (!EMAIL_CONFIG.FEATURES.APPLICATION_ALERTS) return;

  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: {
          select: { fullName: true, email: true },
        },
        project: {
          select: {
            title: true,
            createdBy: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      logger.warn('Application not found for notification', {
        applicationId,
        operation: 'notifications.newApplication',
      });
      return;
    }

    const html = createNewApplicationAlert(
      application.project.createdBy.fullName,
      application.student.fullName,
      application.project.title,
      applicationId,
      application.coverLetter
    );

    enqueueEmail({
      recipientEmail: application.project.createdBy.email,
      recipientName: application.project.createdBy.fullName,
      subject: `New Application: ${application.student.fullName} applied to "${application.project.title}"`,
      html,
      metadata: {
        type: EMAIL_CONFIG.NOTIFICATIONS.APPLICATION_RECEIVED,
        applicationId,
        projectId: application.projectId,
        studentId: application.studentId,
      },
    });

    logger.info('Application alert queued', {
      applicationId,
      projectTitle: application.project.title,
      studentName: application.student.fullName,
      mentorEmail: application.project.createdBy.email,
      operation: 'notifications.newApplication',
    });
  } catch (error) {
    logger.error('Failed to queue application alert', {
      applicationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'notifications.newApplication',
    });
  }
};

/**
 * Notify student when application status changes
 */
export const sendApplicationStatusNotification = async (
  applicationId: string,
  newStatus: 'ACCEPTED' | 'REJECTED' | 'UNDER_REVIEW',
  rejectionReason?: string
): Promise<void> => {
  if (!EMAIL_CONFIG.FEATURES.STATUS_UPDATES) return;

  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        student: {
          select: {
            email: true,
            fullName: true,
          },
        },
        project: {
          select: {
            title: true,
            createdBy: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      logger.warn('Application not found for status notification', {
        applicationId,
        operation: 'notifications.applicationStatus',
      });
      return;
    }

    const html = createApplicationStatusEmail(
      application.student.fullName,
      application.project.title,
      newStatus,
      application.project.createdBy.fullName,
      rejectionReason
    );

    const subjectMap = {
      ACCEPTED: `Congratulations! You've been accepted for "${application.project.title}"`,
      REJECTED: `Application Update: "${application.project.title}"`,
      UNDER_REVIEW: `Your application for "${application.project.title}" is under review`,
    };

    enqueueEmail({
      recipientEmail: application.student.email,
      recipientName: application.student.fullName,
      subject: subjectMap[newStatus],
      html,
      metadata: {
        type: EMAIL_CONFIG.NOTIFICATIONS.APPLICATION_STATUS,
        applicationId,
        status: newStatus,
      },
    });

    logger.info('Status update notification queued', {
      applicationId,
      status: newStatus,
      studentEmail: application.student.email,
      projectTitle: application.project.title,
      operation: 'notifications.applicationStatus',
    });
  } catch (error) {
    logger.error('Failed to queue status notification', {
      applicationId,
      status: newStatus,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'notifications.applicationStatus',
    });
  }
};

/**
 * Remind users about upcoming project deadlines
 *
 * TODO: Enable after implementing user preference system
 *
 * Requirements before enabling:
 * 1. Add NotificationPreferences model to Prisma schema
 * 2. Add "Save Project" or user interest tracking
 * 3. Implement opt-in mechanism in frontend
 *
 * RISK: Sending without opt-in violates CAN-SPAM Act and damages deliverability
 *
 * See notifications.service.ts comments for full explanation
 */
export const sendDeadlineReminders = async (): Promise<void> => {
  if (!EMAIL_CONFIG.FEATURES.DEADLINE_REMINDERS) {
    logger.debug('Deadline reminders disabled via feature flag', {
      operation: 'notifications.deadlineReminders',
    });
    return;
  }

  logger.warn(
    'Deadline reminders called but not implemented - requires user preferences',
    {
      operation: 'notifications.deadlineReminders',
    }
  );

  // Implementation placeholder - DO NOT ENABLE without preference system
};

/**
 * Send weekly summary email to active users
 *
 * TODO: Enable after implementing user preference system
 * Same requirements as deadline reminders
 */
export const sendWeeklyDigests = async (): Promise<void> => {
  if (!EMAIL_CONFIG.FEATURES.WEEKLY_DIGEST) {
    logger.debug('Weekly digest disabled via feature flag', {
      operation: 'notifications.weeklyDigest',
    });
    return;
  }

  logger.warn(
    'Weekly digest called but not implemented - requires user preferences',
    {
      operation: 'notifications.weeklyDigest',
    }
  );

  // Implementation placeholder - DO NOT ENABLE without preference system
};
