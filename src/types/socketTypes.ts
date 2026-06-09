import { Server, Socket } from "socket.io";

<<<<<<< HEAD
export type VoiceChannelStatus = "active" | "ended";

export interface VoiceChannelParticipantPayload {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatar?: string;
  };
  joinedAt: Date;
  isMuted: boolean;
  isDeafened: boolean;
}

export interface VoiceChannelPayload {
  _id: string;
  title: string;
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  createdBy: {
    _id: string;
    username: string;
    avatar?: string;
  };
  participants: VoiceChannelParticipantPayload[];
  status: VoiceChannelStatus;
  endedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  participantCount: number;
}

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
  | (BaseNotificationPayload & { type: "friend_request" | "friend_accept" })
  | {
      type: "NEW_MESSAGE";
      fromUser: { _id: string; username: string; avatar?: string };
      postId?: string;
      messageId?: string;
      conversationId?: string;
      message?: {
        _id: string;
        content: string;
        sender: { _id: string; username?: string; avatar?: string } | string;
        recipient?: string;
        conversation: string;
        type?: "text" | "image";
        mediaUrl?: string;
        mediaMimeType?: string;
        createdAt: Date;
      };
      createdAt: Date;
    };

export type FriendRequestPayload = {
  fromUser: { _id: string; username: string; avatar?: string };
};

export type FriendAcceptedPayload = {
  fromUser: { _id: string; username: string; avatar?: string };
};

export interface ServerToClientEvents {
  "notification:new": (payload: NotificationPayload) => void;
  "friend:request": (payload: FriendRequestPayload) => void;
  "friend:accepted": (payload: FriendAcceptedPayload) => void;
  "voice:stateChanged": (payload: VoiceChannelPayload) => void;
  "voice:participantJoined": (payload: {
    channelId: string;
    participant: VoiceChannelParticipantPayload["user"];
    participantCount: number;
  }) => void;
  "voice:participantLeft": (payload: {
    channelId: string;
    participantId: string;
    participantCount: number;
  }) => void;
  "voice:channelEnded": (payload: VoiceChannelPayload) => void;
  "voice:signal:offer": (payload: { fromUserId: string; sdp: any }) => void;
  "voice:signal:answer": (payload: { fromUserId: string; sdp: any }) => void;
  "voice:signal:ice": (payload: { fromUserId: string; candidate: any }) => void;
  "voice:error": (payload: { channelId: string; message: string }) => void;
  // chat events
  "chat:newMessage": (message: any) => void;
  "chat:userTyping": (payload: { userId: string }) => void;
  "chat:userStopTyping": (payload: { userId: string }) => void;
  "chat:messageRead": (payload: { userId: string }) => void;
}

export interface ClientToServerEvents {
  "notification:markRead": (notificationId: string) => void;
  "voice:join": (channelId: string) => void;
  "voice:leave": (channelId: string) => void;
  "voice:end": (channelId: string) => void;
  "voice:mute": (channelId: string, isMuted: boolean) => void;
  "voice:deafen": (channelId: string, isDeafened: boolean) => void;
  "voice:signal:offer": (payload: { targetUserId: string; channelId: string; sdp: any }) => void;
  "voice:signal:answer": (payload: { targetUserId: string; channelId: string; sdp: any }) => void;
  "voice:signal:ice": (payload: { targetUserId: string; channelId: string; candidate: any }) => void;
  // chat events from client
  "chat:sendMessage": (data: {
    recipientId: string;
    content?: string;
    conversationId: string;
    media?: {
      url: string;
      publicId: string;
      mimeType?: string;
    };
  }) => void;
  "chat:join": (conversationId: string) => void;
  "chat:typing": (data: { conversationId: string }) => void;
  "chat:stopTyping": (data: { conversationId: string }) => void;
  "chat:read": (data: { conversationId: string }) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  userId: string;
  role?: string;
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
