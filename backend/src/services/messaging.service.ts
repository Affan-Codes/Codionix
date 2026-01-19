import { prisma } from '../config/database.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';
import { logger, trackOperation } from '../utils/logger.js';
import type {
  SendMessageInput,
  ListMessagesQuery,
} from '../validators/message.validator.js';

// ===================================
// PRISMA TYPES
// ===================================

const messageInclude = {
  sender: {
    select: {
      id: true,
      fullName: true,
      role: true,
      profilePictureUrl: true,
    },
  },
  application: {
    select: {
      id: true,
      studentId: true,
      project: {
        select: {
          id: true,
          title: true,
          createdById: true,
        },
      },
    },
  },
} satisfies Prisma.MessageInclude;

type MessageWithRelations = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

// ===================================
// RESPONSE TYPES
// ===================================

export type MessageResponse = MessageWithRelations;

export interface PaginatedMessages {
  data: MessageResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  unreadCount: number;
}

export interface UnreadCountResponse {
  total: number;
  byApplication: Array<{
    applicationId: string;
    count: number;
  }>;
}

// ===================================
// AUTHORIZATION HELPERS
// ===================================

/**
 * Check if user is participant in application
 */
async function isApplicationParticipant(
  userId: string,
  applicationId: string
): Promise<boolean> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      studentId: true,
      project: {
        select: {
          createdById: true,
        },
      },
    },
  });

  if (!application) return false;

  return (
    application.studentId === userId ||
    application.project.createdById === userId
  );
}

/**
 * Get recipient user ID (the OTHER participant)
 */
async function getRecipientUserId(
  senderId: string,
  applicationId: string
): Promise<string | null> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      studentId: true,
      project: {
        select: {
          createdById: true,
        },
      },
    },
  });

  if (!application) return null;

  // Return the OTHER participant
  return application.studentId === senderId
    ? application.project.createdById
    : application.studentId;
}

// ===================================
// SERVICE FUNCTIONS
// ===================================

/**
 * Send a message
 */
export const sendMessage = async (
  userId: string,
  data: SendMessageInput
): Promise<MessageResponse> => {
  const tracker = trackOperation('messaging.send', undefined, {
    userId,
    applicationId: data.applicationId,
    contentLength: data.content.length,
  });

  try {
    const { applicationId, content } = data;

    // Verify user is participant
    const isParticipant = await isApplicationParticipant(userId, applicationId);

    if (!isParticipant) {
      logger.warn('Unauthorized message send attempt', {
        operation: 'messaging.send',
        userId,
        applicationId,
        outcome: 'forbidden',
      });
      throw new ForbiddenError(
        'You can only send messages in your own applications'
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        applicationId,
        senderId: userId,
        content,
      },
      include: messageInclude,
    });

    tracker.success({
      messageId: message.id,
      applicationId,
      recipientId: await getRecipientUserId(userId, applicationId),
    });

    return message;
  } catch (error) {
    tracker.failure(error, {
      userId,
      applicationId: data.applicationId,
    });
    throw error;
  }
};

/**
 * List messages in an application
 */
export const listMessages = async (
  userId: string,
  query: ListMessagesQuery
): Promise<PaginatedMessages> => {
  const tracker = trackOperation('messaging.list', undefined, {
    userId,
    applicationId: query.applicationId,
    page: query.page,
    limit: query.limit,
  });

  try {
    const { applicationId, page, limit, includeDeleted } = query;

    // Verify user is participant
    const isParticipant = await isApplicationParticipant(userId, applicationId);

    if (!isParticipant) {
      logger.warn('Unauthorized message list attempt', {
        operation: 'messaging.list',
        userId,
        applicationId,
        outcome: 'forbidden',
      });
      throw new ForbiddenError(
        'You can only view messages in your own applications'
      );
    }

    const skip = (page - 1) * limit;

    const where: Prisma.MessageWhereInput = {
      applicationId,
      ...(includeDeleted ? {} : { isDeleted: false }),
    };

    const [messages, total, unreadCount] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: messageInclude,
      }),
      prisma.message.count({ where }),
      prisma.message.count({
        where: {
          applicationId,
          isDeleted: false,
          isRead: false,
          senderId: { not: userId }, // Only count messages NOT sent by current user
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    tracker.success({
      resultsCount: messages.length,
      totalResults: total,
      unreadCount,
      page,
      totalPages,
    });

    return {
      data: messages,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      unreadCount,
    };
  } catch (error) {
    tracker.failure(error, {
      userId,
      applicationId: query.applicationId,
    });
    throw error;
  }
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (
  userId: string,
  messageId: string
): Promise<MessageResponse> => {
  const tracker = trackOperation('messaging.markRead', undefined, {
    userId,
    messageId,
  });

  try {
    // Get message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: messageInclude,
    });

    if (!message) {
      logger.warn('Mark read on non-existent message', {
        operation: 'messaging.markRead',
        messageId,
        userId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Message not found');
    }

    // Verify user is participant (but NOT the sender)
    const isParticipant = await isApplicationParticipant(
      userId,
      message.applicationId
    );

    if (!isParticipant) {
      logger.warn('Unauthorized mark read attempt', {
        operation: 'messaging.markRead',
        messageId,
        userId,
        outcome: 'forbidden',
      });
      throw new ForbiddenError('You cannot mark this message as read');
    }

    // Can't mark your own message as read
    if (message.senderId === userId) {
      logger.warn('Attempt to mark own message as read', {
        operation: 'messaging.markRead',
        messageId,
        userId,
        outcome: 'validation_error',
      });
      throw new ValidationError('You cannot mark your own messages as read');
    }

    // Already read - idempotent operation
    if (message.isRead) {
      tracker.success({
        messageId,
        alreadyRead: true,
      });
      return message;
    }

    // Mark as read
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: messageInclude,
    });

    tracker.success({
      messageId,
      applicationId: message.applicationId,
    });

    return updatedMessage;
  } catch (error) {
    tracker.failure(error, { userId, messageId });
    throw error;
  }
};

/**
 * Delete message (soft delete)
 */
export const deleteMessage = async (
  userId: string,
  messageId: string
): Promise<void> => {
  const tracker = trackOperation('messaging.delete', undefined, {
    userId,
    messageId,
  });

  try {
    // Get message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        applicationId: true,
        isDeleted: true,
      },
    });

    if (!message) {
      logger.warn('Delete on non-existent message', {
        operation: 'messaging.delete',
        messageId,
        userId,
        outcome: 'not_found',
      });
      throw new NotFoundError('Message not found');
    }

    // Only sender can delete
    if (message.senderId !== userId) {
      logger.warn('Unauthorized message delete attempt', {
        operation: 'messaging.delete',
        messageId,
        userId,
        senderId: message.senderId,
        outcome: 'forbidden',
      });
      throw new ForbiddenError('You can only delete your own messages');
    }

    // Already deleted - idempotent
    if (message.isDeleted) {
      tracker.success({
        messageId,
        alreadyDeleted: true,
      });
      return;
    }

    // Soft delete
    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    tracker.success({
      messageId,
      applicationId: message.applicationId,
    });
  } catch (error) {
    tracker.failure(error, { userId, messageId });
    throw error;
  }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (
  userId: string,
  applicationId?: string
): Promise<UnreadCountResponse> => {
  const tracker = trackOperation('messaging.unreadCount', undefined, {
    userId,
    applicationId: applicationId || 'all',
  });

  try {
    if (applicationId) {
      // Verify user is participant
      const isParticipant = await isApplicationParticipant(
        userId,
        applicationId
      );

      if (!isParticipant) {
        logger.warn('Unauthorized unread count request', {
          operation: 'messaging.unreadCount',
          userId,
          applicationId,
          outcome: 'forbidden',
        });
        throw new ForbiddenError(
          'You can only view unread counts for your own applications'
        );
      }

      // Get count for specific application
      const count = await prisma.message.count({
        where: {
          applicationId,
          isDeleted: false,
          isRead: false,
          senderId: { not: userId },
        },
      });

      tracker.success({
        applicationId,
        count,
      });

      return {
        total: count,
        byApplication: [{ applicationId, count }],
      };
    }

    // Get all applications for user
    const applications = await prisma.application.findMany({
      where: {
        OR: [{ studentId: userId }, { project: { createdById: userId } }],
      },
      select: { id: true },
    });

    const applicationIds = applications.map((a) => a.id);

    // Get unread counts grouped by application
    const unreadMessages = await prisma.message.groupBy({
      by: ['applicationId'],
      where: {
        applicationId: { in: applicationIds },
        isDeleted: false,
        isRead: false,
        senderId: { not: userId },
      },
      _count: true,
    });

    const byApplication = unreadMessages.map((m) => ({
      applicationId: m.applicationId,
      count: m._count,
    }));

    const total = byApplication.reduce((sum, a) => sum + a.count, 0);

    tracker.success({
      total,
      applicationsCount: byApplication.length,
    });

    return {
      total,
      byApplication,
    };
  } catch (error) {
    tracker.failure(error, { userId, applicationId });
    throw error;
  }
};

/**
 * Get recipient user ID for notification
 * Exported for socket manager use
 */
export { getRecipientUserId };
