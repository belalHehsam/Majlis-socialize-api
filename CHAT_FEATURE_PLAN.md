# Chat Feature Plan

## Goal

Build a direct friend-to-friend chat feature for Majlis using Express, MongoDB, and Socket.IO.
The first version should support real-time messaging between confirmed friends, message persistence, unread tracking, and notification integration.

## What Already Exists

This repository already has a useful base for real-time behavior:

- `src/socket/index.ts` initializes Socket.IO and authenticates the socket connection.
- `src/socket/socketService.ts` keeps a `userId -> socketId` map and already exposes `registerUser`, `removeUser`, `isOnline`, `notifyUser`, `sendFriendRequest`, and `sendFriendAccepted`.
- `src/features/notifications/notificationService.ts` creates notifications and emits them through sockets.
- `src/features/notifications/notificationHandler.ts` shows the current pattern for socket event handlers.
- `src/types/socketTypes.ts` defines the current socket event contract and payload shapes.

That means the chat feature should follow the same structure instead of inventing a separate real-time layer.

## Progress (what's done)

- [x] Repo socket layer inspected (`src/socket/index.ts`, `src/socket/socketService.ts`, `src/socket/socketManager.ts`).
- [x] Notification flow inspected (`src/features/notifications/notificationService.ts`, `notificationHandler.ts`).
- [x] Planning document created and iterated (`CHAT_FEATURE_PLAN.md`).
- [x] MVP decisions finalized: 1:1 chat, edit & delete, typing indicators, read receipts, rooms for chat, no unread-count in MVP.
- [x] Chat models scaffolded: `src/models/chat/Conversation.ts`, `src/models/chat/Message.ts`.
- [x] Chat service implemented: `src/features/chat/chatService.ts`.
- [x] Chat controller implemented: `src/features/chat/chatController.ts`.
- [x] Chat routes implemented: `src/features/chat/chatRoutes.ts` and mounted at `/api/chats`.
- [x] Chat validator implemented: `src/features/chat/chatValidator.ts`.
- [x] Chat socket handler implemented and registered: `src/features/chat/chatHandler.ts`, registered in `src/socket/socketManager.ts`.

## Missing / Placeholders (created empty files)

- [ ] Tests: `src/features/chat/__tests__/chat.spec.ts` (placeholder created)

Notes:

- Conversation uniqueness (pair) is enforced by service logic (sort participant ids before create).
- Socket rule: use a `chatId` room for chat messages; direct emits reserved for notifications/presence.

## Product Rules

Before writing code, decide these rules clearly:

1. Chat is 1:1 only for now.
2. Chat is only allowed between users who are already friends.
3. A message is delivered in real time if the recipient is online.
4. Every message is still saved in the database so the conversation works offline too.
5. Messages can be edited and deleted in the MVP.
6. Typing indicators and read receipts are part of the MVP.
7. If the recipient is offline, the message should still create a notification.
8. Only participants in the conversation can read, send, or fetch messages.
9. Conversations should be built around a stable pair of user ids, not around socket ids.

## Recommended Data Model

Create a dedicated chat domain instead of putting messages inside the friend model.

Suggested models:

- `Conversation`
  - participants: two user ids for the first version
  - lastMessageId
  - lastMessageId
  - lastMessageAt
- `Message`
  - conversationId
  - sender
  - recipient
  - content
  - type, for example text or future attachment types
  - isRead
  - readAt
  - createdAt

Suggested indexes:

- conversation uniqueness on the pair of participants (enforce in service by sorting participants)
- message index on conversationId plus createdAt

## Phase 0 - Discovery And Decisions

Outcome: define the MVP before coding.

Tasks:

1. Confirm the MVP scope is 1:1 friend chat only.
2. Confirm messages support edit and delete.
3. Confirm typing indicators and read receipts are included now.
4. Decide the delivery model: use conversation rooms for chat broadcasting, and keep direct user socket emits for user-specific events like notifications and presence-driven delivery.

Deliverable:

- a short spec for the first release
- a list of excluded features for now

## Phase 1 - Domain Design

Outcome: define how chat data is stored and validated.

Tasks:

1. Create chat models for conversation and message.
2. Add validators for send-message, get-conversation, and mark-read actions.
3. Decide the conversation lookup strategy for two users.
4. Decide how unread count is calculated.
5. Define the exact message payload shape returned by the API and emitted over sockets.

Important rule:

- Use the friend relationship as a gate before creating or opening a conversation.

## Phase 2 - REST API

Outcome: provide the non-realtime fallback and history APIs.

Suggested endpoints:

- `GET /api/chats/conversations`
- `GET /api/chats/conversations/:conversationId/messages`
- `POST /api/chats/messages`
- `PATCH /api/chats/messages/:messageId/read`
- `PATCH /api/chats/conversations/:conversationId/read-all`

What each endpoint should do:

- list the user’s conversations
- paginate message history
- create and persist a message
- mark one message as read
- mark a whole conversation as read

## Phase 3 - Socket Contract

Outcome: define the real-time event layer before implementation.

Suggested server events:

- `chat:joinConversation`
- `chat:leaveConversation`
- `chat:sendMessage`
- `chat:newMessage`
- `chat:messageRead`
- `chat:typing`
- `chat:stopTyping`

Suggested client events:

- `chat:sendMessage` from client to server
- `chat:markMessageRead` from client to server
- `chat:typing` from client to server
- `chat:stopTyping` from client to server

Socket design choice:

- Use a room per conversation (`chatId`) for all chat messages and chat-specific events.
- Keep direct user emits for notifications and presence-only signals.
- Still keep the `userId -> socketId` map for direct notifications and offline checks.

## Phase 4 - Socket And Service Implementation

Outcome: implement the chat service in the same style as notifications.

Suggested files:

- `src/features/chat/chatController.ts`
- `src/features/chat/chatRoutes.ts`
- `src/features/chat/chatValidator.ts`
- `src/features/chat/chatService.ts`
- `src/features/chat/chatHandler.ts`
- `src/models/Conversation.ts`
- `src/models/Message.ts`

Implementation order:

1. Save the message first.
2. Update conversation summary fields.
3. Emit the message to the conversation room.
4. Join the room when the conversation opens.
5. Mark messages as read when the recipient views the conversation.

## Phase 5 - Notification Integration

Outcome: reuse the existing notification system for chat events.

Suggested notification rules:

- create a notification when a new message arrives and the recipient is offline
- optionally create a notification for each new message if the product wants inbox alerts
- do not create duplicate notifications when the recipient is already actively viewing the conversation

Shared functions to reuse:

- `SocketService.isOnline(userId)` to decide whether a message should trigger an offline notification.
- `SocketService.notifyUser(userId, payload)` if you add a chat notification payload.
- `createNotification(...)` from `notificationService.ts` if the chat event should also appear in the notification feed.
- `registerNotificationHandlers(socket)` as the pattern for chat socket handlers.

Likely shared helpers to extract later:

- `emitToUser(userId, event, payload)`
- `joinConversationRoom(conversationId)`
- `leaveConversationRoom(conversationId)`
- `assertConversationAccess(userId, conversationId)`
- `buildChatPreview(message)`

Those helpers would prevent the chat, friends, and notification flows from each reimplementing the same socket logic.

## Phase 6 - Friend System Integration

Outcome: make chat consistent with the existing friend workflow.

Chat should depend on these friend rules:

1. A user can open chat only after a friend relationship exists.
2. If a friend request is accepted, the UI can unlock the chat entry point.
3. The existing friend socket methods can later be expanded to open chat prompts or jump directly into the conversation.

Shared code to keep in mind:

- `SocketService.sendFriendRequest(...)`
- `SocketService.sendFriendAccepted(...)`
- `registerFriendHandlers(socket)` if you later move friend-specific socket logic into a real handler

## Phase 7 - Security And Validation

Outcome: prevent unauthorized access and bad payloads.

Rules:

- verify the socket user before joining or sending
- verify the two users are friends before creating a conversation
- verify the recipient belongs to the conversation before accepting a message
- validate message length and content type
- reject empty or whitespace-only messages
- rate-limit sends if spam becomes a problem

## Phase 8 - Testing Strategy

Outcome: prove the feature works across HTTP and socket paths.

Test coverage should include:

1. creating a conversation between friends
2. blocking chat between non-friends
3. sending a message and persisting it
4. receiving a socket event for an online user
5. creating an offline notification when the recipient is not connected
6. reading messages and updating unread state
7. paginating message history

## Phase 9 - Delivery Milestones

Outcome: build in small, safe slices.

Milestone 1:

- models
- validators
- basic conversation and message CRUD

Milestone 2:

- socket events for send and receive
- room join and leave
- direct message delivery

Milestone 3:

- unread counts
- read receipts
- offline notification integration

Milestone 4:

- typing indicators
- message status improvements
- cleanup and tests

## Suggested Build Order

1. Add the chat models.
2. Add the chat service layer.
3. Add chat routes and controllers.
4. Add socket event types in `src/types/socketTypes.ts`.
5. Add chat handlers in `src/features/chat/chatHandler.ts`.
6. Reuse `SocketService` for online checks and delivery.
7. Hook notifications into offline chat delivery.
8. Add tests and API examples.

## Practical Advice

- Keep the first version small: one-to-one chat, text only, no attachments.
- Make persistence the source of truth, not socket state.
- Use sockets for delivery and UX updates, but always store messages in MongoDB.
- Build the conversation layer before adding typing indicators or receipts.
- Reuse the notification pipeline instead of creating a second unrelated alert system.
