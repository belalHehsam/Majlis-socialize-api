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
}

export interface ClientToServerEvents {
  "notification:markRead": (notificationId: string) => void;
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