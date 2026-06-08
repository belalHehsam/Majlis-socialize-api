import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/socketTypes";
import SocketService from "./socketService";
import { SocketManager } from "./socketManager";
import { verifyAuthToken } from "../utils/authToken";
import { createSocketAuthError } from "../utils/socketError";

export const initSocket = (httpServer: HttpServer): void => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: process.env.CLIENT_URL,
      },
    }
  );

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      return next(createSocketAuthError("No token provided", "MISSING_TOKEN"));
    }

    try {
      const decoded = verifyAuthToken(token);
      socket.data.userId = decoded.id;
      next();
    } catch {
      next(createSocketAuthError("Invalid token", "INVALID_TOKEN"));
    }
  });

  SocketService.init(io);
  SocketManager(io);
};
