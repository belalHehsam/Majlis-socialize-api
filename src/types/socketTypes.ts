import { Server, Socket } from "socket.io";
import { NotificationType } from "../models/Notification";

export interface NotificationPayload {
  type: NotificationType;
  fromUser: {
    _id: string;
    username: string;
    avatar?: string;
  };
  postId?: string;
  // optional message/conversation fields for chat notifications
  messageId?: string;
  conversationId?: string;
  message?: {
    _id: string;
    content: string;
    sender: { _id: string; username?: string; avatar?: string } | string;
    conversation: string;
    createdAt: Date;
  };
  createdAt: Date;
}

export interface FriendRequestPayload {
  fromUser: { _id: string; username: string; avatar?: string };
  createdAt: Date;
}

export interface FriendAcceptedPayload {
  fromUser: { _id: string; username: string; avatar?: string };
  createdAt: Date;
}

export interface ServerToClientEvents {
  "notification:new": (payload: NotificationPayload) => void;
  "friend:request": (payload: FriendRequestPayload) => void;
  "friend:accepted": (payload: FriendAcceptedPayload) => void;
  // chat events
  "chat:newMessage": (message: any) => void;
  "chat:userTyping": (payload: { userId: string }) => void;
  "chat:userStopTyping": (payload: { userId: string }) => void;
  "chat:messageRead": (payload: { userId: string }) => void;
}

export interface ClientToServerEvents {
  "notification:markRead": (notificationId: string) => void;
  // chat events from client
  "chat:sendMessage": (data: { recipientId: string; content: string; conversationId: string }) => void;
  "chat:join": (conversationId: string) => void;
  "chat:typing": (data: { conversationId: string }) => void;
  "chat:stopTyping": (data: { conversationId: string }) => void;
  "chat:read": (data: { conversationId: string }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  userId: string;
}

export type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type SocketAuthError = Error & {
  data?: {
    code: string;
  };
};