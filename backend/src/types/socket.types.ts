import type { Server, Socket } from 'socket.io';

// ===================================
// SOCKET EVENTS
// ===================================

export interface ServerToClientEvents {
  // Message events
  'message:new': (data: MessageEventData) => void;
  'message:read': (data: MessageReadEventData) => void;
  'message:deleted': (data: MessageDeletedEventData) => void;
  'message:edited': (data: MessageEventData) => void;

  // Typing indicators
  'typing:start': (data: TypingEventData) => void;
  'typing:stop': (data: TypingEventData) => void;

  // Connection events
  'connection:acknowledged': (data: { userId: string }) => void;

  // Error events
  error: (data: ErrorEventData) => void;
}

export interface ClientToServerEvents {
  // Message actions
  'message:send': (
    data: SendMessageData,
    callback: (response: AckResponse) => void
  ) => void;
  'message:markRead': (
    data: MarkReadData,
    callback: (response: AckResponse) => void
  ) => void;
  'message:delete': (
    data: DeleteMessageData,
    callback: (response: AckResponse) => void
  ) => void;

  // Typing indicators
  'typing:start': (data: TypingData) => void;
  'typing:stop': (data: TypingData) => void;

  // Room management
  'room:join': (
    data: JoinRoomData,
    callback: (response: AckResponse) => void
  ) => void;
  'room:leave': (
    data: LeaveRoomData,
    callback: (response: AckResponse) => void
  ) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  email: string;
  role: string;
  correlationId: string;
}

// ===================================
// EVENT PAYLOAD TYPES
// ===================================

export interface MessageEventData {
  id: string;
  applicationId: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageReadEventData {
  messageId: string;
  applicationId: string;
  readBy: string;
  readAt: string;
}

export interface MessageDeletedEventData {
  messageId: string;
  applicationId: string;
  deletedBy: string;
  deletedAt: string;
}

export interface TypingEventData {
  applicationId: string;
  userId: string;
  userName: string;
}

export interface ErrorEventData {
  code: string;
  message: string;
  details?: unknown;
}

// ===================================
// CLIENT REQUEST TYPES
// ===================================

export interface SendMessageData {
  applicationId: string;
  content: string;
}

export interface MarkReadData {
  messageId: string;
  applicationId: string;
}

export interface DeleteMessageData {
  messageId: string;
  applicationId: string;
}

export interface TypingData {
  applicationId: string;
}

export interface JoinRoomData {
  applicationId: string;
}

export interface LeaveRoomData {
  applicationId: string;
}

// ===================================
// ACKNOWLEDGMENT RESPONSE
// ===================================

export interface AckResponse {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

// ===================================
// TYPED SOCKET SERVER
// ===================================

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// ===================================
// CONNECTION METADATA
// ===================================

export interface SocketConnection {
  socketId: string;
  userId: string;
  connectedAt: Date;
  rooms: Set<string>;
  lastActivity: Date;
}

// ===================================
// ROOM NAMING CONVENTION
// ===================================

export const ROOM_PREFIX = {
  APPLICATION: 'application:',
} as const;

export function getApplicationRoom(applicationId: string): string {
  return `${ROOM_PREFIX.APPLICATION}${applicationId}`;
}
