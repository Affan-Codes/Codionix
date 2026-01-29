# Real-time Messaging API

**Base URL (HTTP):** `https://api.codionix.com/api/v1/messages`  
**WebSocket URL:** `wss://api.codionix.com`

Real-time bidirectional communication for application discussions between students and project owners (mentors/employers).

---

## Architecture Overview

### Communication Protocols

**HTTP REST API:**

- List message history
- Mark messages as read
- Delete messages
- Get unread counts
- Pagination and filtering

**WebSocket (Socket.io):**

- Send messages instantly
- Receive messages in real-time
- Typing indicators
- Read receipts
- Room management

### Message Scope

Messages are scoped to **applications**. Each application has its own isolated message thread between:

- **Student** (who submitted the application)
- **Project Owner** (mentor/employer who created the project)

**Privacy:** Only the student and project owner can access messages for a specific application.

---

## HTTP Endpoints

### List Messages

**`GET /api/v1/messages`**

Retrieve message history for an application with pagination.

**Authentication:** Required  
**Authorization:** Must be participant (student or project owner)

**Query Parameters:**

| Parameter        | Type    | Required | Default | Description                              |
| ---------------- | ------- | -------- | ------- | ---------------------------------------- |
| `applicationId`  | UUID    | Yes      | -       | Application to fetch messages from       |
| `page`           | integer | No       | 1       | Page number (1-indexed)                  |
| `limit`          | integer | No       | 50      | Messages per page (max 100)              |
| `includeDeleted` | boolean | No       | false   | Include soft-deleted messages in results |

**Request Example:**

```
GET /api/v1/messages?applicationId=550e8400-e29b-41d4-a716-446655440000&page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "msg_a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
        "applicationId": "550e8400-e29b-41d4-a716-446655440000",
        "senderId": "user_123abc",
        "content": "Hi! I reviewed your application and I'm impressed with your React portfolio. Could you tell me more about your experience with TypeScript?",
        "isRead": true,
        "readAt": "2026-01-29T14:35:00.000Z",
        "isEdited": false,
        "editedAt": null,
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2026-01-29T14:30:00.000Z",
        "updatedAt": "2026-01-29T14:35:00.000Z",
        "sender": {
          "id": "user_123abc",
          "fullName": "Sarah Johnson",
          "role": "MENTOR",
          "profilePictureUrl": "https://res.cloudinary.com/codionix/avatars/sarah_123.jpg"
        },
        "application": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "studentId": "user_456def",
          "project": {
            "id": "proj_789ghi",
            "title": "E-commerce Platform Development",
            "createdById": "user_123abc"
          }
        }
      },
      {
        "id": "msg_b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e",
        "applicationId": "550e8400-e29b-41d4-a716-446655440000",
        "senderId": "user_456def",
        "content": "Thank you for the opportunity! I've been working with TypeScript professionally for 18 months. I built a type-safe REST API with Express and used generics extensively for our data layer.",
        "isRead": false,
        "readAt": null,
        "isEdited": false,
        "editedAt": null,
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2026-01-29T15:10:00.000Z",
        "updatedAt": "2026-01-29T15:10:00.000Z",
        "sender": {
          "id": "user_456def",
          "fullName": "John Doe",
          "role": "STUDENT",
          "profilePictureUrl": "https://res.cloudinary.com/codionix/avatars/john_456.jpg"
        },
        "application": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "studentId": "user_456def",
          "project": {
            "id": "proj_789ghi",
            "title": "E-commerce Platform Development",
            "createdById": "user_123abc"
          }
        }
      }
    ],
    "pagination": {
      "total": 47,
      "page": 1,
      "limit": 20,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "unreadCount": 3
  }
}
```

**Response Fields:**

| Field                             | Type     | Description                                               |
| --------------------------------- | -------- | --------------------------------------------------------- |
| `data`                            | array    | Array of message objects                                  |
| `data[].id`                       | UUID     | Unique message identifier                                 |
| `data[].applicationId`            | UUID     | Application this message belongs to                       |
| `data[].senderId`                 | UUID     | User who sent the message                                 |
| `data[].content`                  | string   | Message text (max 5000 chars, HTML stripped)              |
| `data[].isRead`                   | boolean  | Read status (false if recipient hasn't read)              |
| `data[].readAt`                   | ISO 8601 | When recipient marked as read (null if unread)            |
| `data[].isEdited`                 | boolean  | Whether message was edited after sending                  |
| `data[].editedAt`                 | ISO 8601 | When message was last edited (null if never edited)       |
| `data[].isDeleted`                | boolean  | Soft delete status (true = deleted by sender)             |
| `data[].deletedAt`                | ISO 8601 | When message was deleted (null if not deleted)            |
| `data[].createdAt`                | ISO 8601 | When message was sent                                     |
| `data[].updatedAt`                | ISO 8601 | Last modification timestamp                               |
| `data[].sender`                   | object   | Sender's profile information                              |
| `data[].sender.id`                | UUID     | Sender's user ID                                          |
| `data[].sender.fullName`          | string   | Sender's display name                                     |
| `data[].sender.role`              | enum     | Sender's role (STUDENT, MENTOR, EMPLOYER, ADMIN)          |
| `data[].sender.profilePictureUrl` | string   | Sender's avatar URL (nullable)                            |
| `data[].application`              | object   | Application context                                       |
| `data[].application.id`           | UUID     | Application ID                                            |
| `data[].application.studentId`    | UUID     | Student who applied                                       |
| `data[].application.project`      | object   | Project details                                           |
| `pagination`                      | object   | Pagination metadata                                       |
| `pagination.total`                | integer  | Total messages in application                             |
| `pagination.page`                 | integer  | Current page number                                       |
| `pagination.limit`                | integer  | Messages per page                                         |
| `pagination.totalPages`           | integer  | Total pages available                                     |
| `pagination.hasNextPage`          | boolean  | Whether more pages exist                                  |
| `pagination.hasPrevPage`          | boolean  | Whether previous pages exist                              |
| `unreadCount`                     | integer  | Number of unread messages FOR CURRENT USER in this thread |

**Message Ordering:**

- Messages ordered by `createdAt` DESC (newest first)
- Use pagination to load older messages
- Frontend should reverse order for chat display (oldest at top)

**Error Responses:**

**400 - Missing Application ID:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid application ID"
  }
}
```

**403 - Not a Participant:**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You can only view messages in your own applications"
  }
}
```

**429 - Rate Limit:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

**Rate Limit:** 60 requests per minute

---

### Get Unread Count

**`GET /api/v1/messages/unread-count`**

Get number of unread messages for current user.

**Authentication:** Required

**Query Parameters:**

| Parameter       | Type | Required | Description                                                    |
| --------------- | ---- | -------- | -------------------------------------------------------------- |
| `applicationId` | UUID | No       | Get count for specific application (omit for total across all) |

**Request Examples:**

**Total Unread (All Applications):**

```
GET /api/v1/messages/unread-count
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Unread for Specific Application:**

```
GET /api/v1/messages/unread-count?applicationId=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK) - Total:**

```json
{
  "success": true,
  "data": {
    "total": 12,
    "byApplication": [
      {
        "applicationId": "550e8400-e29b-41d4-a716-446655440000",
        "count": 5
      },
      {
        "applicationId": "app_abc123",
        "count": 3
      },
      {
        "applicationId": "app_def456",
        "count": 4
      }
    ]
  }
}
```

**Success Response (200 OK) - Single Application:**

```json
{
  "success": true,
  "data": {
    "total": 5,
    "byApplication": [
      {
        "applicationId": "550e8400-e29b-41d4-a716-446655440000",
        "count": 5
      }
    ]
  }
}
```

**Unread Count Rules:**

- Only counts messages **NOT sent by current user**
- Excludes deleted messages
- Updates in real-time via WebSocket
- Resets when user calls "mark as read" endpoint or via WebSocket

---

### Mark Message as Read

**`PATCH /api/v1/messages/:messageId/read`**

Mark a message as read. Idempotent operation.

**Authentication:** Required  
**Authorization:** Must be message recipient (not sender)

**Path Parameters:**

| Parameter   | Type | Description             |
| ----------- | ---- | ----------------------- |
| `messageId` | UUID | Message to mark as read |

**Request Example:**

```
PATCH /api/v1/messages/msg_a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/read
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "msg_a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "applicationId": "550e8400-e29b-41d4-a716-446655440000",
    "senderId": "user_123abc",
    "content": "Hi! I reviewed your application...",
    "isRead": true,
    "readAt": "2026-01-29T16:45:00.000Z",
    "isEdited": false,
    "editedAt": null,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-01-29T14:30:00.000Z",
    "updatedAt": "2026-01-29T16:45:00.000Z",
    "sender": {
      "id": "user_123abc",
      "fullName": "Sarah Johnson",
      "role": "MENTOR",
      "profilePictureUrl": "https://res.cloudinary.com/codionix/avatars/sarah_123.jpg"
    },
    "application": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "studentId": "user_456def",
      "project": {
        "id": "proj_789ghi",
        "title": "E-commerce Platform Development",
        "createdById": "user_123abc"
      }
    }
  }
}
```

**Side Effects:**

1. Message `isRead` set to `true`
2. `readAt` timestamp recorded
3. `updatedAt` timestamp updated
4. WebSocket event `message:read` broadcast to room
5. Unread count decremented for recipient

**Error Responses:**

**400 - Marking Own Message:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "You cannot mark your own messages as read"
  }
}
```

**403 - Not a Participant:**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You cannot mark this message as read"
  }
}
```

**404 - Message Not Found:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Message not found"
  }
}
```

**Idempotent Behavior:**

- If message already read → returns success with current state
- No error thrown for double-marking

---

### Delete Message

**`DELETE /api/v1/messages/:messageId`**

Soft delete a message. Only sender can delete their own messages.

**Authentication:** Required  
**Authorization:** Must be message sender

**Path Parameters:**

| Parameter   | Type | Description       |
| ----------- | ---- | ----------------- |
| `messageId` | UUID | Message to delete |

**Request Example:**

```
DELETE /api/v1/messages/msg_b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Message deleted successfully"
  }
}
```

**Side Effects:**

1. Message `isDeleted` set to `true`
2. `deletedAt` timestamp recorded
3. `updatedAt` timestamp updated
4. WebSocket event `message:deleted` broadcast to room
5. Message still exists in database (soft delete)
6. Content still visible in database (not redacted)

**Deletion Behavior:**

- **Soft delete:** Message remains in database
- **Content preserved:** Original text not modified
- **List endpoint:** Deleted messages hidden by default
- **Include deleted:** Use `?includeDeleted=true` query param
- **Read receipts:** Preserved (deletion doesn't affect `readAt`)

**Error Responses:**

**403 - Not Message Sender:**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You can only delete your own messages"
  }
}
```

**404 - Message Not Found:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Message not found"
  }
}
```

**Idempotent Behavior:**

- If message already deleted → returns success
- No error thrown for double-deletion

---

## WebSocket (Socket.io) API

### Connection

**URL:** `wss://api.codionix.com` (production)  
**URL:** `ws://localhost:5000` (development)

**Authentication:** Required (JWT access token)

**Connection Example (JavaScript):**

```javascript
import { io } from "socket.io-client";

const socket = io("wss://api.codionix.com", {
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Access token
  },
  transports: ["websocket", "polling"], // Prefer WebSocket
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

socket.on("connection:acknowledged", (data) => {
  console.log("Server acknowledged:", data.userId);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});

socket.on("error", (error) => {
  console.error("Socket error:", error);
});
```

**Connection Lifecycle:**

1. Client connects with JWT in `auth.token`
2. Server validates JWT
3. Server extracts user data and attaches to socket
4. Server emits `connection:acknowledged` with `{ userId }`
5. Client can now emit/receive events

**Authentication Errors:**

**Missing Token:**

```javascript
socket.on("connect_error", (error) => {
  console.error(error.message); // "Authentication required"
});
```

**Invalid Token:**

```javascript
socket.on("connect_error", (error) => {
  console.error(error.message); // "Invalid access token"
});
```

**Token Expired:**

```javascript
socket.on("connect_error", (error) => {
  console.error(error.message); // "Access token expired"
});
```

**Reconnection:**

- Socket.io automatically reconnects on disconnect
- Client must refresh access token if expired
- Use exponential backoff for reconnection attempts

---

### Room Management

Messages are organized into **rooms** per application. Users must join a room to send/receive messages for that application.

**Room Naming:** `application:{applicationId}`

#### Join Room

**Event:** `room:join`

**Payload:**

```typescript
{
  applicationId: string; // UUID
}
```

**Example:**

```javascript
socket.emit(
  "room:join",
  {
    applicationId: "550e8400-e29b-41d4-a716-446655440000",
  },
  (response) => {
    if (response.success) {
      console.log("Joined room successfully");
    } else {
      console.error("Failed to join:", response.error);
    }
  },
);
```

**Success Response:**

```json
{
  "success": true
}
```

**Error Responses:**

**403 - Not a Participant:**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied"
  }
}
```

**404 - Application Not Found:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Application not found"
  }
}
```

**Authorization Rules:**

- Only student OR project owner can join
- Student: `application.studentId === userId`
- Project owner: `application.project.createdById === userId`
- Admin users: Can join any room

#### Leave Room

**Event:** `room:leave`

**Payload:**

```typescript
{
  applicationId: string; // UUID
}
```

**Example:**

```javascript
socket.emit(
  "room:leave",
  {
    applicationId: "550e8400-e29b-41d4-a716-446655440000",
  },
  (response) => {
    if (response.success) {
      console.log("Left room successfully");
    }
  },
);
```

**Side Effects:**

- Socket removed from room
- Typing indicator cleared (if active)
- No longer receives messages for this application

---

### Send Message

**Event:** `message:send`

**Payload:**

```typescript
{
  applicationId: string; // UUID
  content: string; // 1-5000 characters
}
```

**Example:**

```javascript
socket.emit(
  "message:send",
  {
    applicationId: "550e8400-e29b-41d4-a716-446655440000",
    content:
      "Thank you for reviewing my application! I'm excited about this opportunity.",
  },
  (response) => {
    if (response.success) {
      console.log("Message sent:", response.data);
    } else {
      console.error("Failed to send:", response.error);
    }
  },
);
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "id": "msg_c3d4e5f6-a7b8-4c5d-9e0f-1a2b3c4d5e6f",
    "applicationId": "550e8400-e29b-41d4-a716-446655440000",
    "senderId": "user_456def",
    "senderName": "John Doe",
    "content": "Thank you for reviewing my application! I'm excited about this opportunity.",
    "isRead": false,
    "isEdited": false,
    "createdAt": "2026-01-29T16:50:00.000Z",
    "updatedAt": "2026-01-29T16:50:00.000Z"
  }
}
```

**Content Validation:**

- **Min length:** 1 character (after trimming)
- **Max length:** 5000 characters
- **HTML stripping:** All HTML tags automatically removed
- **Whitespace:** Leading/trailing whitespace trimmed
- **Empty messages:** Rejected with validation error

**Error Responses:**

**400 - Empty Content:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Message cannot be empty"
  }
}
```

**400 - Content Too Long:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Message cannot exceed 5000 characters"
  }
}
```

**429 - Rate Limit Exceeded:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many messages. Please slow down."
  }
}
```

**Rate Limit:** 30 messages per minute per user

**Side Effects:**

1. Message saved to database
2. `message:new` event broadcast to room (recipient only)
3. If recipient offline: Email notification queued (if enabled in preferences)
4. Unread count incremented for recipient
5. Typing indicator cleared for sender

**Broadcast Behavior:**

- Sender receives acknowledgment response
- Recipient(s) in room receive `message:new` event
- Sender does NOT receive their own `message:new` event

---

### Receive Messages

**Event:** `message:new`

**Payload:**

```typescript
{
  id: string; // UUID
  applicationId: string; // UUID
  senderId: string; // UUID
  senderName: string;
  content: string;
  isRead: boolean;
  isEdited: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

**Example:**

```javascript
socket.on("message:new", (message) => {
  console.log("New message from", message.senderName);
  console.log("Content:", message.content);

  // Add to UI
  addMessageToChat(message);

  // Optionally mark as read immediately
  socket.emit("message:markRead", {
    messageId: message.id,
    applicationId: message.applicationId,
  });
});
```

**When Triggered:**

- Another participant sends a message in the room
- Only sent to recipients (not sender)
- Must be in room to receive event

---

### Mark Message as Read (WebSocket)

**Event:** `message:markRead`

**Payload:**

```typescript
{
  messageId: string; // UUID
  applicationId: string; // UUID
}
```

**Example:**

```javascript
socket.emit(
  "message:markRead",
  {
    messageId: "msg_a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    applicationId: "550e8400-e29b-41d4-a716-446655440000",
  },
  (response) => {
    if (response.success) {
      console.log("Message marked as read");
    }
  },
);
```

**Success Response:**

```json
{
  "success": true
}
```

**Side Effects:**

1. Message marked as read in database
2. `message:read` event broadcast to room (sender receives notification)
3. Unread count decremented for current user

**Broadcast Event:**

**Event:** `message:read`

**Payload:**

```typescript
{
  messageId: string; // UUID
  applicationId: string; // UUID
  readBy: string; // User ID who marked it read
  readAt: string; // ISO 8601 timestamp
}
```

**Example:**

```javascript
socket.on("message:read", (data) => {
  console.log(`Message ${data.messageId} read by ${data.readBy}`);
  // Update UI to show read receipt
  updateMessageReadStatus(data.messageId, data.readAt);
});
```

---

### Delete Message (WebSocket)

**Event:** `message:delete`

**Payload:**

```typescript
{
  messageId: string; // UUID
  applicationId: string; // UUID
}
```

**Example:**

```javascript
socket.emit(
  "message:delete",
  {
    messageId: "msg_b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e",
    applicationId: "550e8400-e29b-41d4-a716-446655440000",
  },
  (response) => {
    if (response.success) {
      console.log("Message deleted");
    }
  },
);
```

**Success Response:**

```json
{
  "success": true
}
```

**Side Effects:**

1. Message soft-deleted in database
2. `message:deleted` event broadcast to room
3. Message remains in database (content preserved)

**Broadcast Event:**

**Event:** `message:deleted`

**Payload:**

```typescript
{
  messageId: string; // UUID
  applicationId: string; // UUID
  deletedBy: string; // User ID who deleted it
  deletedAt: string; // ISO 8601 timestamp
}
```

**Example:**

```javascript
socket.on("message:deleted", (data) => {
  console.log(`Message ${data.messageId} deleted by ${data.deletedBy}`);
  // Update UI to show "[Message deleted]" or remove entirely
  removeMessageFromChat(data.messageId);
});
```

---

### Typing Indicators

**Start Typing:**

**Event:** `typing:start`

**Payload:**

```typescript
{
  applicationId: string; // UUID
}
```

**Example:**

```javascript
// User starts typing
inputField.addEventListener("input", () => {
  socket.emit("typing:start", {
    applicationId: "550e8400-e29b-41d4-a716-446655440000",
  });
});
```

**Broadcast Event:**

**Event:** `typing:start`

**Payload:**

```typescript
{
  applicationId: string; // UUID
  userId: string; // User ID who is typing
  userName: string; // Display name
}
```

**Example:**

```javascript
socket.on("typing:start", (data) => {
  console.log(`${data.userName} is typing...`);
  // Show typing indicator in UI
  showTypingIndicator(data.userName);
});
```

**Auto-Clear:**

- Typing indicator automatically clears after 3 seconds of inactivity
- Server-side timeout ensures cleanup even if client doesn't send `typing:stop`

**Stop Typing:**

**Event:** `typing:stop`

**Payload:**

```typescript
{
  applicationId: string; // UUID
}
```

**Example:**

```javascript
// User stops typing or sends message
inputField.addEventListener("blur", () => {
  socket.emit("typing:stop", {
    applicationId: "550e8400-e29b-41d4-a716-446655440000",
  });
});

// Also stop when sending message
socket.emit("message:send", { ... });
socket.emit("typing:stop", { ... });
```

**Broadcast Event:**

**Event:** `typing:stop`

**Payload:**

```typescript
{
  applicationId: string; // UUID
  userId: string; // User ID who stopped typing
  userName: string; // Display name
}
```

**Example:**

```javascript
socket.on("typing:stop", (data) => {
  console.log(`${data.userName} stopped typing`);
  // Hide typing indicator in UI
  hideTypingIndicator(data.userName);
});
```

---

## Email Notifications

### Offline Message Notifications

When a user receives a message while **not connected via WebSocket**, an email notification is queued (if enabled in user preferences).

**Email Trigger Conditions:**

1. Recipient is **offline** (not connected to Socket.io)
2. Recipient has `notifyOnNewMessage` preference enabled
3. Message successfully saved to database

**Email Template:**

- **Subject:** `New message from {senderName}`
- **Content:** Message preview (first 150 characters)
- **CTA:** Link to application messages page

**Email Example:**

```
Subject: New message from Sarah Johnson

Hi John,

Sarah Johnson sent you a message about "E-commerce Platform Development":

"Hi! I reviewed your application and I'm impressed with your React portfolio. Could you tell me more about your experience with TypeScript?..."

[View & Reply]

---
You're receiving this because you have message notifications enabled.
Update preferences: https://codionix.com/settings/notifications
```

**Disable Email Notifications:**

```
PATCH /api/v1/users/me/notification-preferences
{
  "notifyOnNewMessage": false
}
```

---

## Complete Integration Example

**Full chat implementation with Socket.io:**

```javascript
import { io } from "socket.io-client";
import { useState, useEffect } from "react";

function ChatComponent({ applicationId, accessToken }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io("wss://api.codionix.com", {
      auth: { token: accessToken },
    });

    newSocket.on("connect", () => {
      console.log("Connected");

      // Join room for this application
      newSocket.emit("room:join", { applicationId }, (response) => {
        if (response.success) {
          console.log("Joined room");
        }
      });
    });

    newSocket.on("message:new", (message) => {
      setMessages((prev) => [...prev, message]);

      // Mark as read immediately
      newSocket.emit("message:markRead", {
        messageId: message.id,
        applicationId,
      });
    });

    newSocket.on("message:read", (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, isRead: true, readAt: data.readAt }
            : msg,
        ),
      );
    });

    newSocket.on("message:deleted", (data) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== data.messageId));
    });

    newSocket.on("typing:start", (data) => {
      setTypingUsers((prev) => [...prev, data.userName]);
    });

    newSocket.on("typing:stop", (data) => {
      setTypingUsers((prev) => prev.filter((name) => name !== data.userName));
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit("room:leave", { applicationId });
      newSocket.disconnect();
    };
  }, [applicationId, accessToken]);

  // Load message history via HTTP
  useEffect(() => {
    fetch(`/api/v1/messages?applicationId=${applicationId}&limit=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((data) => setMessages(data.data.data.reverse()));
  }, [applicationId]);

  // Handle typing indicator
  useEffect(() => {
    if (!socket) return;

    const timeout = setTimeout(() => {
      if (isTyping) {
        socket.emit("typing:stop", { applicationId });
        setIsTyping(false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [input, isTyping, socket, applicationId]);

  const handleInput = (e) => {
    setInput(e.target.value);

    if (!isTyping && socket) {
      socket.emit("typing:start", { applicationId });
      setIsTyping(true);
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !socket) return;

    socket.emit(
      "message:send",
      {
        applicationId,
        content: input.trim(),
      },
      (response) => {
        if (response.success) {
          setMessages((prev) => [...prev, response.data]);
          setInput("");
          socket.emit("typing:stop", { applicationId });
          setIsTyping(false);
        }
      },
    );
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <strong>{msg.senderName}:</strong> {msg.content}
            {msg.isRead && <span className="read-receipt">✓✓</span>}
          </div>
        ))}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.join(", ")} is typing...
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={handleInput}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
```

---

## Rate Limiting

### HTTP Endpoints

| Endpoint                   | Limit       | Window |
| -------------------------- | ----------- | ------ |
| `GET /messages`            | 60 requests | 1 min  |
| `PATCH /messages/:id/read` | 60 requests | 1 min  |
| `DELETE /messages/:id`     | 60 requests | 1 min  |
| `GET /unread-count`        | 60 requests | 1 min  |

**Rate Limit Headers:**

```
RateLimit-Limit: 60
RateLimit-Remaining: 45
RateLimit-Reset: 1706094900
```

### WebSocket Events

| Event            | Limit       | Window |
| ---------------- | ----------- | ------ |
| `message:send`   | 30 messages | 1 min  |
| All other events | No limit    | -      |

**Rate Limit Response:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many messages. Please slow down."
  }
}
```

**Sliding Window:**

- Timer resets individually per request
- Not at fixed intervals
- Example: Request at 00:00 expires at 01:00, not at next hour boundary

---

## Error Codes Reference

| Code                  | HTTP Status | Description                       |
| --------------------- | ----------- | --------------------------------- |
| `VALIDATION_ERROR`    | 400         | Invalid request data              |
| `UNAUTHORIZED`        | 401         | Missing or invalid authentication |
| `FORBIDDEN`           | 403         | Not authorized to access resource |
| `NOT_FOUND`           | 404         | Message or application not found  |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests                 |
| `INTERNAL_ERROR`      | 500         | Server error (contact support)    |

All errors include `errorId` and `correlationId` for support.

---

## Common Questions

**Q: Can users edit messages after sending?**  
**A:** Not currently supported. `isEdited` field exists in schema but edit functionality is not implemented. Delete and resend instead.

**Q: Are messages encrypted?**  
**A:** Messages are encrypted in transit (TLS/WSS) but stored as plaintext in database. End-to-end encryption not implemented.

**Q: Can I send files/images?**  
**A:** No. Only text messages supported. Images/files must be uploaded separately and shared via URLs in message content.

**Q: How long are messages retained?**  
**A:** Indefinitely. Soft-deleted messages remain in database permanently. No automatic cleanup.

**Q: Can I see who's online?**  
**A:** Not directly. Typing indicators indirectly show online status. Dedicated presence system not implemented.

**Q: What happens if both users send simultaneously?**  
**A:** Both messages succeed. No conflict resolution needed. Messages ordered by `createdAt` timestamp.

**Q: Can I retrieve older messages beyond pagination limit?**  
**A:** Yes. Use `page` parameter to load earlier pages. Max 100 messages per request.

**Q: Does marking a message as read mark all previous messages as read?**  
**A:** No. Each message must be individually marked. Batch mark-as-read not supported.

**Q: Can admins see all messages?**  
**A:** Yes. Admins can join any application room and view all messages. Regular users limited to their own applications.

**Q: What if WebSocket connection drops?**  
**A:** Socket.io auto-reconnects. Messages sent during disconnection are persisted in database. Fetch via HTTP after reconnect.

**Q: Can I delete someone else's message?**  
**A:** No. Only message sender can delete their own messages. Admins have same restriction (by design).

**Q: Are deleted messages recoverable?**  
**A:** Yes, in database. Soft delete preserves content. UI hides deleted messages by default. Use `?includeDeleted=true` to retrieve.
