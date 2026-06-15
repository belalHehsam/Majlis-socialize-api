import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import User from "../models/User";
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
        origin: [process.env.CLIENT_URL ?? "http://localhost:5173", "http://localhost:5173", "http://127.0.0.1:5173"],
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
      User.findById(decoded.id)
        .select("role accountStatus")
        .then((user) => {
          if (!user || user.accountStatus !== "active") {
            return next(createSocketAuthError("User account is not active", "INVALID_TOKEN"));
          }

          socket.data.userId = decoded.id;
          socket.data.role = user.role;
          return next();
        })
        .catch(() => next(createSocketAuthError("Invalid token", "INVALID_TOKEN")));
    } catch {
      next(createSocketAuthError("Invalid token", "INVALID_TOKEN"));
    }
  });

  SocketService.init(io);
  SocketManager(io);
};
