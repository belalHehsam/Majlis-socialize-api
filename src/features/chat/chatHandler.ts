import { Server, Socket } from "socket.io";
import * as chatService from "./chatService";
import SocketService from "../../socket/socketService";

export const registerChatHandlers = (io: Server, socket: Socket) => {
  const userId = socket.data.userId;

  socket.on("chat:join", (conversationId: string) => {
    socket.join(conversationId);
  });

  // 💬 send message
  socket.on(
    "chat:sendMessage",
    async (data: { recipientId: string; content: string; conversationId: string }) => {
      const { recipientId, content, conversationId } = data;

      const message = await chatService.sendMessage(userId, recipientId, content);

      // 🔥 broadcast to room
      io.to(conversationId).emit("chat:newMessage", message);

      // 🔔 offline notification
      if (!SocketService.isOnline(recipientId)) {
        const sender = (message as any).sender || { _id: userId };
        const senderIdStr = sender._id?.toString ? sender._id.toString() : String(sender._id);
        SocketService.notifyUser(recipientId, {
          type: "NEW_MESSAGE",
          fromUser: {
            _id: sender._id?.toString ? sender._id.toString() : sender._id,
            username: sender.username,
            avatar: sender.avatar,
          },
          conversationId,
          messageId: message._id.toString(),
          message: {
            _id: message._id.toString(),
            content: message.content,
            sender: senderIdStr,
            conversation: conversationId,
            createdAt: message.createdAt,
          },
          createdAt: message.createdAt,
        });
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
