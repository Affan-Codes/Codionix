import type {
  TypedSocket,
  AckResponse,
  SendMessageData,
  MarkReadData,
  DeleteMessageData,
  TypingData,
  JoinRoomData,
  LeaveRoomData,
  MessageEventData,
} from '../types/socket.types.js';
import { getApplicationRoom } from '../types/socket.types.js';
import { logger } from '../utils/logger.js';
import { getSocketServer, MESSAGE_RATE_LIMIT } from '../config/socket.js';
import * as messagingService from './messaging.service.js';
import { prisma } from '../config/database.js';
import { enqueueEmail } from './emailQueue.service.js';
import { createNewMessageEmail } from './emailTemplates.service.js';
import { recordSocketMessageLatency, socketMessagesTotal } from './metrics.service.js';

// ===================================
// RATE LIMITING STATE
// ===================================

interface RateLimitState {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitState>();

/**
 * Check if user has exceeded rate limit
 */
function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const state = rateLimitMap.get(userId);

  // No previous state - allow
  if (!state) {
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + MESSAGE_RATE_LIMIT.windowMs,
    });
    return false;
  }

  // Window expired - reset
  if (now >= state.resetAt) {
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + MESSAGE_RATE_LIMIT.windowMs,
    });
    return false;
  }

  // Within window - check limit
  if (state.count >= MESSAGE_RATE_LIMIT.maxMessages) {
    logger.warn('Socket message rate limit exceeded', {
      userId,
      count: state.count,
      limit: MESSAGE_RATE_LIMIT.maxMessages,
      operation: 'socket.rateLimit',
    });
    return true;
  }

  // Increment count
  state.count++;
  return false;
}

/**
 * Clean up expired rate limit entries (run periodically)
 */
setInterval(() => {
  const now = Date.now();
  for (const [userId, state] of rateLimitMap.entries()) {
    if (now >= state.resetAt) {
      rateLimitMap.delete(userId);
    }
  }
}, 60000); // Clean up every minute

// ===================================
// TYPING INDICATOR STATE
// ===================================

interface TypingState {
  timeout: NodeJS.Timeout;
}

const typingMap = new Map<string, TypingState>();

/**
 * Clear typing indicator after timeout
 */
function clearTypingIndicator(
  socket: TypedSocket,
  applicationId: string
): void {
  const key = `${socket.data.userId}:${applicationId}`;
  const state = typingMap.get(key);

  if (state) {
    clearTimeout(state.timeout);
    typingMap.delete(key);

    // Broadcast stop typing
    const room = getApplicationRoom(applicationId);
    socket.to(room).emit('typing:stop', {
      applicationId,
      userId: socket.data.userId,
      userName: socket.data.email.split('@')[0] ?? 'User',
    });
  }
}

// ===================================
// SOCKET EVENT HANDLERS
// ===================================

/**
 * Handle new socket connection
 */
export function handleSocketConnection(socket: TypedSocket): void {
  const { userId, email, role, correlationId } = socket.data;

  logger.info('Socket connected', {
    socketId: socket.id,
    userId,
    email,
    role,
    correlationId,
    operation: 'socket.connect',
    category: 'socket',
  });

  // Acknowledge connection
  socket.emit('connection:acknowledged', { userId });

  // ===================================
  // MESSAGE EVENTS
  // ===================================

  /**
   * Send message
   */
  socket.on('message:send', async (data: SendMessageData, callback) => {
    const startTime = Date.now();

    try {
      // Rate limit check
      if (isRateLimited(userId)) {
        const response: AckResponse = {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many messages. Please slow down.',
          },
        };
        return callback(response);
      }

      // Save message to database
      const message = await messagingService.sendMessage(userId, data);

      // Prepare event data
      const eventData: MessageEventData = {
        id: message.id,
        applicationId: message.applicationId,
        senderId: message.senderId,
        senderName: message.sender.fullName,
        content: message.content,
        isRead: message.isRead,
        isEdited: message.isEdited,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
      };

      // Broadcast to room (excludes sender)
      const room = getApplicationRoom(data.applicationId);
      socket.to(room).emit('message:new', eventData);

      // Get recipient for offline notification
      const recipientId = await messagingService.getRecipientUserId(
        userId,
        data.applicationId
      );

      if (recipientId) {
        // Check if recipient is online
        const io = getSocketServer();
        const recipientSockets = await io.in(room).fetchSockets();
        const isRecipientOnline = recipientSockets.some(
          (s) => s.data.userId === recipientId
        );

        // Send email notification if recipient offline
        if (!isRecipientOnline) {
          // Get recipient details
          const recipient = await prisma.user.findUnique({
            where: { id: recipientId },
            select: {
              email: true,
              fullName: true,
              notifyOnNewMessage: true,
            },
          });

          if (recipient && recipient.notifyOnNewMessage) {
            const html = createNewMessageEmail(
              recipient.fullName,
              message.sender.fullName,
              message.application.project.title,
              data.applicationId,
              message.content
            );

            enqueueEmail({
              recipientEmail: recipient.email,
              recipientName: recipient.fullName,
              subject: `New message from ${message.sender.fullName}`,
              html,
              metadata: {
                type: 'new_message',
                applicationId: data.applicationId,
                messageId: message.id,
              },
            });
          }
        }
      }

      const duration = Date.now() - startTime;

      // Record metrics
      socketMessagesTotal.inc({ direction: 'sent' });
      recordSocketMessageLatency(duration);

      logger.info('Message sent via socket', {
        socketId: socket.id,
        messageId: message.id,
        applicationId: data.applicationId,
        userId,
        duration: `${duration}ms`,
        operation: 'socket.message.send',
        category: 'socket',
      });

      // Send success acknowledgment
      const response: AckResponse = {
        success: true,
        data: eventData,
      };
      callback(response);
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Socket message send failed', {
        socketId: socket.id,
        userId,
        applicationId: data.applicationId,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'socket.message.send',
        category: 'socket',
      });

      const response: AckResponse = {
        success: false,
        error: {
          code: 'MESSAGE_SEND_FAILED',
          message:
            error instanceof Error ? error.message : 'Failed to send message',
        },
      };
      callback(response);
    }
  });

  /**
   * Mark message as read
   */
  socket.on('message:markRead', async (data: MarkReadData, callback) => {
    try {
      const message = await messagingService.markMessageAsRead(
        userId,
        data.messageId
      );

      // Broadcast read receipt to room
      const room = getApplicationRoom(data.applicationId);
      socket.to(room).emit('message:read', {
        messageId: data.messageId,
        applicationId: data.applicationId,
        readBy: userId,
        readAt: message.readAt?.toISOString() ?? new Date().toISOString(),
      });

      logger.debug('Message marked as read', {
        socketId: socket.id,
        messageId: data.messageId,
        userId,
        operation: 'socket.message.markRead',
      });

      const response: AckResponse = { success: true };
      callback(response);
    } catch (error) {
      logger.error('Socket mark read failed', {
        socketId: socket.id,
        messageId: data.messageId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'socket.message.markRead',
      });

      const response: AckResponse = {
        success: false,
        error: {
          code: 'MARK_READ_FAILED',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to mark message as read',
        },
      };
      callback(response);
    }
  });

  /**
   * Delete message
   */
  socket.on('message:delete', async (data: DeleteMessageData, callback) => {
    try {
      await messagingService.deleteMessage(userId, data.messageId);

      // Broadcast deletion to room
      const room = getApplicationRoom(data.applicationId);
      socket.to(room).emit('message:deleted', {
        messageId: data.messageId,
        applicationId: data.applicationId,
        deletedBy: userId,
        deletedAt: new Date().toISOString(),
      });

      logger.info('Message deleted via socket', {
        socketId: socket.id,
        messageId: data.messageId,
        userId,
        operation: 'socket.message.delete',
      });

      const response: AckResponse = { success: true };
      callback(response);
    } catch (error) {
      logger.error('Socket message delete failed', {
        socketId: socket.id,
        messageId: data.messageId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'socket.message.delete',
      });

      const response: AckResponse = {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message:
            error instanceof Error ? error.message : 'Failed to delete message',
        },
      };
      callback(response);
    }
  });

  // ===================================
  // TYPING INDICATORS
  // ===================================

  socket.on('typing:start', (data: TypingData) => {
    const key = `${userId}:${data.applicationId}`;

    // Clear existing timeout
    const existing = typingMap.get(key);
    if (existing) {
      clearTimeout(existing.timeout);
    }

    // Broadcast typing start
    const room = getApplicationRoom(data.applicationId);
    socket.to(room).emit('typing:start', {
      applicationId: data.applicationId,
      userId,
      userName: email.split('@')[0] ?? 'User',
    });

    // Auto-clear after 3 seconds
    const timeout = setTimeout(() => {
      clearTypingIndicator(socket, data.applicationId);
    }, 3000);

    typingMap.set(key, { timeout });
  });

  socket.on('typing:stop', (data: TypingData) => {
    clearTypingIndicator(socket, data.applicationId);
  });

  // ===================================
  // ROOM MANAGEMENT
  // ===================================

  socket.on('room:join', async (data: JoinRoomData, callback) => {
    try {
      // Verify user is participant
      const application = await prisma.application.findUnique({
        where: { id: data.applicationId },
        select: {
          studentId: true,
          project: { select: { createdById: true } },
        },
      });

      if (!application) {
        const response: AckResponse = {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Application not found' },
        };
        return callback(response);
      }

      const isParticipant =
        application.studentId === userId ||
        application.project.createdById === userId;

      if (!isParticipant) {
        const response: AckResponse = {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        };
        return callback(response);
      }

      // Join room
      const room = getApplicationRoom(data.applicationId);
      await socket.join(room);

      logger.info('Socket joined room', {
        socketId: socket.id,
        userId,
        room,
        operation: 'socket.room.join',
      });

      const response: AckResponse = { success: true };
      callback(response);
    } catch (error) {
      logger.error('Socket room join failed', {
        socketId: socket.id,
        userId,
        applicationId: data.applicationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'socket.room.join',
      });

      const response: AckResponse = {
        success: false,
        error: {
          code: 'JOIN_FAILED',
          message:
            error instanceof Error ? error.message : 'Failed to join room',
        },
      };
      callback(response);
    }
  });

  socket.on('room:leave', async (data: LeaveRoomData, callback) => {
    try {
      const room = getApplicationRoom(data.applicationId);
      await socket.leave(room);

      // Clear typing indicator
      clearTypingIndicator(socket, data.applicationId);

      logger.info('Socket left room', {
        socketId: socket.id,
        userId,
        room,
        operation: 'socket.room.leave',
      });

      const response: AckResponse = { success: true };
      callback(response);
    } catch (error) {
      logger.error('Socket room leave failed', {
        socketId: socket.id,
        userId,
        applicationId: data.applicationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'socket.room.leave',
      });

      const response: AckResponse = {
        success: false,
        error: {
          code: 'LEAVE_FAILED',
          message:
            error instanceof Error ? error.message : 'Failed to leave room',
        },
      };
      callback(response);
    }
  });

  // ===================================
  // DISCONNECT HANDLER
  // ===================================

  socket.on('disconnect', (reason) => {
    // Clean up typing indicators
    for (const [key, state] of typingMap.entries()) {
      if (key.startsWith(`${userId}:`)) {
        clearTimeout(state.timeout);
        typingMap.delete(key);
      }
    }

    logger.info('Socket disconnected', {
      socketId: socket.id,
      userId,
      email,
      reason,
      operation: 'socket.disconnect',
      category: 'socket',
    });
  });
}


