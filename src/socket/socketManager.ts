import { registerFriendHandlers } from "../features/friends/friendHandler";
import { registerNotificationHandlers } from "../features/notifications/notificationHandler";
import { registerChatHandlers } from "../features/chat/chatHandler";
import { registerVoiceHandlers } from "../features/voice/voiceHandler";
import type { IO } from "../types/socketTypes";
import SocketService from "./socketService";

export const SocketManager = (io: IO): void => {
  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);
    const { userId } = socket.data;

    SocketService.registerUser(userId, socket.id);
    console.log(`User connected: ${userId}`);

    registerNotificationHandlers(socket);

    registerChatHandlers(io, socket);

    registerVoiceHandlers(io, socket);

    // registerFriendHandlers(socket); // mostly would be removed

    socket.on("disconnect", () => {
      SocketService.removeUser(userId);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
