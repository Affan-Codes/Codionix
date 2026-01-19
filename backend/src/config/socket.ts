import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import type {
  TypedServer,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket.types.js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { socketAuthMiddleware } from '../middleware/socketAuth.middleware.js';
import { handleSocketConnection } from '../services/socketManager.service.js';

// ===================================
// SOCKET.IO CONFIGURATION
// ===================================

export const SOCKET_CONFIG = {
  // CORS configuration
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST'] as string[], // Cast to mutable array
  },

  // Connection settings
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 10000, // 10 seconds
  maxHttpBufferSize: 1e6, // 1MB max message size

  // Transports - prefer WebSocket
  transports: ['websocket', 'polling'] as ('websocket' | 'polling')[], // Cast to mutable array

  // Server options
  allowEIO3: false, // Disable legacy Engine.IO v3
  serveClient: false, // Don't serve client files
};

// ===================================
// RATE LIMITING CONFIG
// ===================================

export const MESSAGE_RATE_LIMIT = {
  windowMs: 60000, // 1 minute window
  maxMessages: 30, // 30 messages per minute per user
} as const;

// ===================================
// SOCKET SERVER INSTANCE
// ===================================

let io: TypedServer | null = null;

/**
 * Initialize Socket.io server
 * CRITICAL: Call this ONCE during server startup
 */
export function initializeSocketServer(httpServer: HTTPServer): TypedServer {
  if (io) {
    logger.warn('Socket.io server already initialized', {
      operation: 'socket.init',
    });
    return io;
  }

  io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, SOCKET_CONFIG);

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Handle connections
  io.on('connection', handleSocketConnection);

  logger.info('✅ Socket.io server initialized', {
    cors: SOCKET_CONFIG.cors.origin,
    transports: SOCKET_CONFIG.transports,
    pingTimeout: SOCKET_CONFIG.pingTimeout,
    operation: 'socket.init',
  });

  return io;
}

/**
 * Get Socket.io server instance
 */
export function getSocketServer(): TypedServer {
  if (!io) {
    throw new Error(
      'Socket.io server not initialized. Call initializeSocketServer first.'
    );
  }
  return io;
}

/**
 * Graceful shutdown - close all connections
 */
export async function shutdownSocketServer(): Promise<void> {
  if (!io) {
    logger.info('Socket.io server not initialized, nothing to shutdown', {
      operation: 'socket.shutdown',
    });
    return;
  }

  const startTime = Date.now();

  // Get connected clients count
  const sockets = await io.fetchSockets();
  const activeConnections = sockets.length;

  logger.info('Shutting down Socket.io server', {
    activeConnections,
    operation: 'socket.shutdown',
    category: 'shutdown',
  });

  // Close all connections gracefully
  io.disconnectSockets(true);

  // Close server
  await new Promise<void>((resolve) => {
    io!.close(() => {
      const duration = Date.now() - startTime;
      logger.info('✅ Socket.io server shut down gracefully', {
        activeConnections,
        duration: `${duration}ms`,
        operation: 'socket.shutdown',
        category: 'shutdown',
      });
      resolve();
    });
  });

  io = null;
}

/**
 * Get Socket.io server health status
 */
export async function getSocketHealth(): Promise<{
  healthy: boolean;
  activeConnections: number;
  activeRooms: number;
}> {
  if (!io) {
    return {
      healthy: false,
      activeConnections: 0,
      activeRooms: 0,
    };
  }

  try {
    const sockets = await io.fetchSockets();
    const rooms = io.sockets.adapter.rooms;

    // Count non-socket-id rooms (actual application rooms)
    const applicationRooms = Array.from(rooms.keys()).filter(
      (room) => !room.startsWith('socket:') && room.startsWith('application:')
    );

    return {
      healthy: true,
      activeConnections: sockets.length,
      activeRooms: applicationRooms.length,
    };
  } catch (error) {
    logger.error('Failed to get socket health', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'socket.health',
    });

    return {
      healthy: false,
      activeConnections: 0,
      activeRooms: 0,
    };
  }
}
