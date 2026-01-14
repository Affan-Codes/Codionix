import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { EMAIL_CONFIG } from '../config/email.js';
import {
  createWelcomeEmail,
  createNewApplicationAlert,
  createApplicationStatusEmail,
  createEmailVerificationTemplate,
  createPasswordResetTemplate,
  createDeadlineReminderEmail,
  createWeeklyDigestEmail,
} from './emailTemplates.service.js';
import { enqueueEmail } from './emailQueue.service.js';
import { subDays } from 'date-fns';

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
                notifyOnApplicationReceived: true,
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

    // Check user preference
    if (!application.project.createdBy.notifyOnApplicationReceived) {
      logger.info(
        'Application notification skipped - user preference disabled',
        {
          applicationId,
          mentorId: application.project.createdBy.id,
          operation: 'notifications.newApplication',
        }
      );
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
            notifyOnApplicationStatus: true,
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

    // Check user preference
    if (!application.student.notifyOnApplicationStatus) {
      logger.info('Status notification skipped - user preference disabled', {
        applicationId,
        studentId: application.studentId,
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
 * Send deadline reminders to students with applications
 */
export const sendDeadlineReminders = async (): Promise<void> => {
  if (!EMAIL_CONFIG.FEATURES.DEADLINE_REMINDERS) {
    logger.debug('Deadline reminders disabled via feature flag', {
      operation: 'notifications.deadlineReminders',
    });
    return;
  }

  const startTime = Date.now();
  try {
    const now = new Date();
    const reminders = EMAIL_CONFIG.TIMING.DEADLINE_REMINDERS;

    for (const reminder of reminders) {
      const targetDate = subDays(now, -reminder.days); // Add days to now

      // Find projects with deadlines matching this reminder window
      const projects = await prisma.project.findMany({
        where: {
          status: 'PUBLISHED',
          deadline: {
            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            lte: new Date(targetDate.setHours(23, 59, 59, 999)),
          },
        },
        include: {
          applications: {
            where: {
              status: {
                in: ['PENDING', 'UNDER_REVIEW'],
              },
            },
            include: {
              student: {
                select: {
                  id: true,
                  email: true,
                  fullName: true,
                  notifyOnDeadlineReminder: true,
                },
              },
            },
          },
        },
      });

      let emailsSent = 0;

      for (const project of projects) {
        for (const application of project.applications) {
          // Check user preference
          if (!application.student.notifyOnDeadlineReminder) {
            logger.debug(
              'Deadline reminder skipped - user preference disabled',
              {
                studentId: application.student.id,
                projectId: project.id,
              }
            );
            continue;
          }

          const html = createDeadlineReminderEmail(
            application.student.fullName,
            project.title,
            project.id,
            reminder.days
          );

          enqueueEmail({
            recipientEmail: application.student.email,
            recipientName: application.student.fullName,
            subject: `⏰ ${reminder.days} Day${reminder.days === 1 ? '' : 's'} Until Deadline: "${project.title}"`,
            html,
            metadata: {
              type: EMAIL_CONFIG.NOTIFICATIONS.DEADLINE_REMINDER,
              projectId: project.id,
              studentId: application.student.id,
              daysRemaining: reminder.days,
            },
          });

          emailsSent++;
        }
      }

      logger.info(`Deadline reminders sent for ${reminder.label}`, {
        projectsChecked: projects.length,
        emailsSent,
        daysRemaining: reminder.days,
        operation: 'notifications.deadlineReminders',
      });
    }

    const duration = Date.now() - startTime;

    logger.info('Deadline reminder job completed', {
      duration: `${duration}ms`,
      operation: 'notifications.deadlineReminders',
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to send deadline reminders', {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'notifications.deadlineReminders',
    });

    throw error;
  }
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

  const startTime = Date.now();

  try {
    const now = new Date();
    const weekAgo = subDays(now, 7);

    // Get users who opted in for weekly digest
    const users = await prisma.user.findMany({
      where: {
        notifyOnWeeklyDigest: true,
        isEmailVerified: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    let emailsSent = 0;

    for (const user of users) {
      // Aggregate stats based on user role
      const stats = {
        newProjects: 0,
        pendingApplications: 0,
        receivedFeedback: 0,
      };

      if (user.role === 'STUDENT') {
        // Student stats
        const [newProjects, pendingApps, newFeedback] = await Promise.all([
          prisma.project.count({
            where: {
              status: 'PUBLISHED',
              createdAt: { gte: weekAgo },
            },
          }),
          prisma.application.count({
            where: {
              studentId: user.id,
              status: { in: ['PENDING', 'UNDER_REVIEW'] },
            },
          }),
          prisma.feedback.count({
            where: {
              application: { studentId: user.id },
              createdAt: { gte: weekAgo },
            },
          }),
        ]);

        stats.newProjects = newProjects;
        stats.pendingApplications = pendingApps;
        stats.receivedFeedback = newFeedback;
      } else {
        // Mentor/Employer stats
        const [newApplications, pendingApps, feedbackGiven] = await Promise.all(
          [
            prisma.application.count({
              where: {
                project: { createdById: user.id },
                appliedAt: { gte: weekAgo },
              },
            }),
            prisma.application.count({
              where: {
                project: { createdById: user.id },
                status: 'PENDING',
              },
            }),
            prisma.feedback.count({
              where: {
                mentorId: user.id,
                createdAt: { gte: weekAgo },
              },
            }),
          ]
        );

        stats.newProjects = newApplications;
        stats.pendingApplications = pendingApps;
        stats.receivedFeedback = feedbackGiven;
      }

      // Get featured projects
      const featuredProjects = await prisma.project.findMany({
        where: {
          status: 'PUBLISHED',
          deadline: { gte: now },
          createdAt: { gte: weekAgo },
        },
        select: {
          id: true,
          title: true,
          projectType: true,
          skills: true,
        },
        take: 3,
        orderBy: { currentApplicants: 'desc' },
      });

      const html = createWeeklyDigestEmail(
        user.fullName,
        stats,
        featuredProjects
      );

      enqueueEmail({
        recipientEmail: user.email,
        recipientName: user.fullName,
        subject: '📊 Your Weekly Codionix Summary',
        html,
        metadata: {
          type: EMAIL_CONFIG.NOTIFICATIONS.WEEKLY_DIGEST,
          userId: user.id,
        },
      });

      emailsSent++;
    }

    const duration = Date.now() - startTime;

    logger.info('Weekly digest job completed', {
      duration: `${duration}ms`,
      usersProcessed: users.length,
      emailsSent,
      operation: 'notifications.weeklyDigest',
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to send weekly digests', {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'notifications.weeklyDigest',
    });

    throw error;
  }
};
