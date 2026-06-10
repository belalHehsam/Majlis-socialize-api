# Chat Frontend Integration Guide

This document describes the current backend chat contract for the Majlis frontend.

## Overview

The chat feature is a 1:1 direct messaging system built on top of:

- REST APIs for history, conversation lookup, and read state
- Socket.IO for real-time message delivery, typing, and read events
- MongoDB for persistent conversations and messages
- Cloudinary for optional media uploads

All HTTP responses use the shared JSend envelope.

## Authentication

### HTTP

All chat routes are protected by the normal API auth middleware.

### Socket.IO

When connecting, the client must send the auth token in the handshake:

```ts
const socket = io(SERVER_URL, {
  auth: {
    token: accessToken,
  },
});
```

If the token is missing, invalid, or the user account is not active, the connection is rejected.

## Base Route

All chat HTTP routes are mounted at:

```text
/api/chats
```

## REST APIs

### 1. Get all conversations

```http
GET /api/chats/conversations
```

Requires authentication.

#### Response

```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "_id": "conversationId",
        "participants": [
          {
            "_id": "userId1",
            "name": "User Name",
            "profileImage": "https://..."
          },
          {
            "_id": "userId2",
            "name": "Other User",
            "profileImage": "https://..."
          }
        ],
        "lastMessage": {
          "_id": "messageId",
          "content": "Hello",
          "type": "text",
          "sender": "userId1",
          "recipient": "userId2",
          "conversation": "conversationId",
          "createdAt": "2026-06-08T10:00:00.000Z"
        },
        "lastMessageAt": "2026-06-08T10:00:00.000Z",
        "createdAt": "2026-06-08T09:00:00.000Z",
        "updatedAt": "2026-06-08T10:00:00.000Z"
      }
    ],
    "message": "Conversations retrieved successfully"
  }
}
```

### 2. Get or create a conversation with a user

```http
GET /api/chats/conversations/with/:userId
```

This returns the existing 1:1 conversation between the logged-in user and `userId`, or creates it if it does not exist.

#### Response

```json
{
  "status": "success",
  "data": {
    "data": {
      "_id": "conversationId",
      "participants": ["userId1", "userId2"],
      "lastMessage": "messageId",
      "lastMessageAt": "2026-06-08T10:00:00.000Z",
      "createdAt": "2026-06-08T09:00:00.000Z",
      "updatedAt": "2026-06-08T10:00:00.000Z"
    },
    "message": "Conversation retrieved or created successfully"
  }
}
```

### 3. Get messages for a conversation

```http
GET /api/chats/conversations/:conversationId/messages?page=1&limit=20
```

#### Query params

- `page` defaults to `1`
- `limit` defaults to `20`

#### Response

```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "_id": "messageId",
        "conversation": "conversationId",
        "sender": "userId1",
        "recipient": "userId2",
        "content": "Hello",
        "type": "text",
        "isEdited": false,
        "isDeleted": false,
        "readAt": null,
        "createdAt": "2026-06-08T10:00:00.000Z",
        "updatedAt": "2026-06-08T10:00:00.000Z"
      }
    ],
    "message": "Messages retrieved successfully"
  }
}
```

### 4. Send a message

```http
POST /api/chats/messages
Content-Type: multipart/form-data
```

#### Form fields

- `recipientId` required, string ObjectId
- `content` optional, trimmed text up to 2000 characters
- `media` optional file upload field

At least one of `content` or `media` must be provided.

If `media` is sent, the backend uploads it to Cloudinary and stores:

- `mediaUrl`
- `mediaPublicId`
- `mediaMimeType`

#### Response

```json
{
  "status": "success",
  "data": {
    "data": {
      "_id": "messageId",
      "conversation": "conversationId",
      "sender": {
        "_id": "userId1",
        "username": "ali",
        "avatar": "https://..."
      },
      "recipient": "userId2",
      "content": "Hello",
      "type": "text",
      "isEdited": false,
      "isDeleted": false,
      "readAt": null,
      "createdAt": "2026-06-08T10:00:00.000Z",
      "updatedAt": "2026-06-08T10:00:00.000Z"
    },
    "message": "Message sent successfully"
  }
}
```

### 5. Mark a conversation as read

```http
PATCH /api/chats/conversations/:conversationId/read
```

Marks all unread messages in the conversation addressed to the current user as read.

#### Response

```json
{
  "status": "success",
  "data": {
    "message": "Conversation marked as read"
  }
}
```

## Data Models

### Conversation

```ts
{
  _id: string;
  participants: string[]; // exactly 2 user ids
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

Important behavior:

- conversations are 1:1 only
- participant ids are sorted before creation so the pair stays unique
- the frontend should treat the conversation id as the stable room id for sockets

### Message

```ts
{
  _id: string;
  conversation: string;
  sender: string;
  recipient: string;
  content: string;
  type: "text" | "image";
  isEdited: boolean;
  isDeleted: boolean;
  readAt?: Date | null;
  mediaUrl?: string;
  mediaPublicId?: string;
  mediaMimeType?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Socket Events

### Join a conversation room

```ts
socket.emit("chat:join", conversationId);
```

Joins the conversation room so the client can receive live chat events for that thread.

### Send a message

```ts
socket.emit("chat:sendMessage", {
  recipientId,
  content,
  conversationId,
  media,
});
```

#### Payload

```ts
{
  recipientId: string;
  content?: string;
  conversationId: string;
  media?: {
    url: string;
    publicId: string;
    mimeType?: string;
  };
}
```

Notes:

- `conversationId` is required by the event contract even though the backend currently derives the room from the saved message
- the message is always persisted first
- if the recipient is online, the message is emitted to the conversation room
- if the recipient is offline, the backend also triggers an offline notification through the notification socket channel

### Typing indicators

```ts
socket.emit("chat:typing", { conversationId });
socket.emit("chat:stopTyping", { conversationId });
```

The other participants in the room receive:

```ts
socket.on("chat:userTyping", (payload) => {});
socket.on("chat:userStopTyping", (payload) => {});
```

Payload shape:

```ts
{ userId: string }
```

### Mark conversation as read

```ts
socket.emit("chat:read", { conversationId });
```

The other participants in the room receive:

```ts
socket.on("chat:messageRead", (payload) => {});
```

Payload shape:

```ts
{ userId: string }
```

## Server Emits

### `chat:newMessage`

Emitted to the conversation room after the message is saved.

Payload is the saved message document, with the sender populated on the server side.

### `chat:userTyping`

Emitted to the room when a participant starts typing.

### `chat:userStopTyping`

Emitted to the room when a participant stops typing.

### `chat:messageRead`

Emitted to the room when one participant marks the conversation as read.

## Message Flow

1. The frontend loads or creates the conversation using `GET /api/chats/conversations/with/:userId`.
2. The frontend joins the Socket.IO room with `chat:join` using the conversation id.
3. The frontend fetches historical messages with `GET /api/chats/conversations/:conversationId/messages`.
4. When sending a message, the frontend can use either:
   - HTTP `POST /api/chats/messages`, or
   - Socket `chat:sendMessage`
5. The backend saves the message in MongoDB and updates the conversation summary fields.
6. The backend emits `chat:newMessage` to the conversation room.
7. If the recipient is offline, the backend also sends a notification event through the notification socket channel.
8. When the user opens the thread, the frontend should call `PATCH /api/chats/conversations/:conversationId/read` and/or emit `chat:read`.

## Frontend Integration Notes

- Use the conversation id as the room key on the client.
- Do not build a separate socket map in the frontend for chat delivery; rely on the conversation room.
- Treat `chat:newMessage` as the source of truth for live updates.
- Treat the REST history endpoint as the fallback and initial page load source.
- For optimistic UI, render the local message immediately, then reconcile with the server response once the message is saved.
- For media messages, upload the file through the existing `media` field in the HTTP form or send a pre-uploaded media object through the socket payload.

## Response Shape Summary

### Success response wrapper

```ts
{
  status: "success";
  data: {
    data?: unknown;
    message?: string;
  };
}
```

### Error response wrapper

```ts
{
  status: "error";
  message: string;
  data?: unknown;
}
```

## Current Limitations

- Chat is 1:1 only.
- There is no dedicated unread-count endpoint yet.
- Message edit and delete APIs are not exposed yet, even though the message model already contains `isEdited` and `isDeleted` fields.
- The socket payloads are intentionally lightweight and should be treated as backend contract, not as final UI state.
