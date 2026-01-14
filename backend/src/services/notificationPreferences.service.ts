import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import { trackOperation } from '../utils/logger.js';
import type { UpdateNotificationPreferencesInput } from '../validators/notificationPreferences.validator.js';

// ===================================
// RESPONSE TYPES
// ===================================

export interface NotificationPreferences {
  notifyOnApplicationReceived: boolean;
  notifyOnApplicationStatus: boolean;
  notifyOnDeadlineReminder: boolean;
  notifyOnWeeklyDigest: boolean;
}

// ===================================
// SERVICE FUNCTIONS
// ===================================

/**
 * Get user's notification preferences
 */
export const getNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences> => {
  const tracker = trackOperation('notificationPreferences.get', undefined, {
    userId,
  });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notifyOnApplicationReceived: true,
        notifyOnApplicationStatus: true,
        notifyOnDeadlineReminder: true,
        notifyOnWeeklyDigest: true,
      },
    });

    if (!user) {
      tracker.failure(new NotFoundError('User not found'), { userId });
      throw new NotFoundError('User not found');
    }

    tracker.success({ userId });

    return user;
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      tracker.failure(error, { userId });
    }
    throw error;
  }
};

/**
 * Update user's notification preferences
 */
export const updateNotificationPreferences = async (
  userId: string,
  data: UpdateNotificationPreferencesInput
): Promise<NotificationPreferences> => {
  const tracker = trackOperation('notificationPreferences.update', undefined, {
    userId,
    fieldsUpdated: Object.keys(data).length,
  });

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      tracker.failure(new NotFoundError('User not found'), { userId });
      throw new NotFoundError('User not found');
    }

    const updateData = {
      ...(data.notifyOnApplicationReceived !== undefined && {
        notifyOnApplicationReceived: data.notifyOnApplicationReceived,
      }),
      ...(data.notifyOnApplicationStatus !== undefined && {
        notifyOnApplicationStatus: data.notifyOnApplicationStatus,
      }),
      ...(data.notifyOnDeadlineReminder !== undefined && {
        notifyOnDeadlineReminder: data.notifyOnDeadlineReminder,
      }),
      ...(data.notifyOnWeeklyDigest !== undefined && {
        notifyOnWeeklyDigest: data.notifyOnWeeklyDigest,
      }),
    };

    // Update preferences
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        notifyOnApplicationReceived: true,
        notifyOnApplicationStatus: true,
        notifyOnDeadlineReminder: true,
        notifyOnWeeklyDigest: true,
      },
    });

    tracker.success({
      userId,
      fieldsUpdated: Object.keys(data),
    });

    return updatedUser;
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      tracker.failure(error, { userId });
    }
    throw error;
  }
};

/**
 * Check if user has specific notification enabled
 * Helper for notification services
 */
export const isNotificationEnabled = async (
  userId: string,
  notificationType:
    | 'applicationReceived'
    | 'applicationStatus'
    | 'deadlineReminder'
    | 'weeklyDigest'
): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notifyOnApplicationReceived: true,
        notifyOnApplicationStatus: true,
        notifyOnDeadlineReminder: true,
        notifyOnWeeklyDigest: true,
      },
    });

    if (!user) return false;

    switch (notificationType) {
      case 'applicationReceived':
        return user.notifyOnApplicationReceived;
      case 'applicationStatus':
        return user.notifyOnApplicationStatus;
      case 'deadlineReminder':
        return user.notifyOnDeadlineReminder;
      case 'weeklyDigest':
        return user.notifyOnWeeklyDigest;
      default:
        return false;
    }
  } catch (error) {
    // Fail open: if we can't check preferences, allow notification
    // This prevents notification system failures from blocking critical emails
    return true;
  }
};
