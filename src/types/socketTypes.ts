import { Server, Socket } from "socket.io";

type BaseNotificationPayload = {
  _id: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  isRead: boolean;
  createdAt: Date;
};

export type NotificationPayload =
  | (BaseNotificationPayload & { type: "like"; post: { _id: string } })
  | (BaseNotificationPayload & { type: "comment"; post: { _id: string }; commentText?: string })
  | (BaseNotificationPayload & { type: "friend_request" | "friend_accept" });

export interface ServerToClientEvents {
  "notification:new": (payload: NotificationPayload) => void;
  "friend:request": (payload: Extract<NotificationPayload, { type: "friend_request" }>) => void;
  "friend:accept": (payload: Extract<NotificationPayload, { type: "friend_accept" }>) => void;
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
