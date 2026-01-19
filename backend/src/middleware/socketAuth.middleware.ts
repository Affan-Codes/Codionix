import type { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';
import type { SocketData } from '../types/socket.types.js';

/**
 * Socket.io authentication middleware
 * Validates JWT token from handshake auth
 *
 * CRITICAL: This runs ONCE per connection, not per event
 */
export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> => {
  const correlationId = randomUUID();
  const startTime = Date.now();

  try {
    // Extract token from handshake auth
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      logger.warn('Socket connection attempted without token', {
        socketId: socket.id,
        correlationId,
        ip: socket.handshake.address,
        operation: 'socket.auth',
      });

      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const payload = verifyAccessToken(token);

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      logger.warn('Socket auth failed - user not found', {
        socketId: socket.id,
        userId: payload.userId,
        correlationId,
        operation: 'socket.auth',
      });

      return next(new Error('User not found'));
    }

    // Attach user data to socket
    socket.data = {
      userId: user.id,
      email: user.email,
      role: user.role,
      correlationId,
    } satisfies SocketData;

    const duration = Date.now() - startTime;

    logger.info('Socket authenticated successfully', {
      socketId: socket.id,
      userId: user.id,
      email: user.email,
      role: user.role,
      correlationId,
      duration: `${duration}ms`,
      ip: socket.handshake.address,
      operation: 'socket.auth',
      category: 'socket',
    });

    next();
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Socket authentication failed', {
      socketId: socket.id,
      correlationId,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'socket.auth',
      category: 'socket',
    });

    if (error instanceof Error && error.message.includes('expired')) {
      return next(new Error('Token expired'));
    }

    return next(new Error('Authentication failed'));
  }
};
