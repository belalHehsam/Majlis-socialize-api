import { Server, Socket } from "socket.io";
import * as chatService from "./chatService";
import SocketService from "../../socket/socketService";

const toIdString = (value: unknown): string => {
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }

  return String(value);
};

const buildOfflineNotification = (
  message: Awaited<ReturnType<typeof chatService.sendMessage>>,
  recipientId: string,
  senderId: string
) => {
  const sender = (message as any).sender || { _id: senderId };
  const senderObjectId = sender._id ?? senderId;
  const senderIdStr = toIdString(senderObjectId);
  const messageId = message._id.toString();
  const conversationId = message.conversation.toString();
  const previewContent = message.type === "image" ? "Image attachment" : message.content;

  return {
    type: "NEW_MESSAGE" as const,
    fromUser: {
      _id: senderIdStr,
      username: sender.username,
      avatar: sender.avatar,
    },
    conversationId,
    messageId,
    message: {
      _id: messageId,
      content: previewContent,
      sender: senderIdStr,
      recipient: recipientId,
      conversation: conversationId,
      type: message.type,
      mediaUrl: message.mediaUrl,
      mediaMimeType: message.mediaMimeType,
      createdAt: message.createdAt,
    },
    createdAt: message.createdAt,
  };
};

export const registerChatHandlers = (io: Server, socket: Socket) => {
  const userId = socket.data.userId;

  socket.on("chat:join", (conversationId: string) => {
    socket.join(conversationId);
  });

  // 💬 send message
  socket.on(
    "chat:sendMessage",
    async (data: {
      recipientId: string;
      content?: string;
      conversationId: string;
      media?: { url: string; publicId: string; mimeType?: string };
    }) => {
      const { recipientId, content, conversationId, media } = data;

      const message = await chatService.sendMessage(userId, recipientId, content, media);
      const messageConversationId = message.conversation.toString();

      // 🔥 broadcast to room
      io.to(messageConversationId).emit("chat:newMessage", message);

      // 🔔 offline notification
      if (!SocketService.isOnline(recipientId)) {
        SocketService.notifyUser(
          recipientId,
          buildOfflineNotification(message, recipientId, userId)
        );
      }
    }
  );

  // ⌨️ typing
  socket.on("chat:typing", (data: { conversationId: string }) => {
    socket.to(data.conversationId).emit("chat:userTyping", {
      userId,
    });
  });

  // 🛑 stop typing
  socket.on("chat:stopTyping", (data: { conversationId: string }) => {
    socket.to(data.conversationId).emit("chat:userStopTyping", {
      userId,
    });
  });

  // 👀 read messages
  socket.on("chat:read", async (data: { conversationId: string }) => {
    await chatService.markConversationAsRead(data.conversationId, userId);

    socket.to(data.conversationId).emit("chat:messageRead", {
      userId,
    });
  });
};
