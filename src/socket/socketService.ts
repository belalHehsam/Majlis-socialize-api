import type { IO, NotificationPayload,
  ServerToClientEvents, } from "../types/socketTypes";

class SocketService {
  private static io: IO;
  private static userSocketMap: Map<string, Set<string>> = new Map();

  static init(io: IO): void {
    this.io = io;
  }

  static registerUser(userId: string, socketId: string): void {
    if (!this.userSocketMap.has(userId)) {
      this.userSocketMap.set(userId, new Set());
    }
    this.userSocketMap.get(userId)!.add(socketId);
  }

  static getSocketId(userId: string): string | undefined {
    const sockets = this.userSocketMap.get(userId);
    if (sockets && sockets.size > 0) {
      // Return the most recently added socket ID (last item in Set order)
      return Array.from(sockets)[sockets.size - 1];
    }
    return undefined;
  }

  static getActiveSockets(userId: string): string[] {
    const sockets = this.userSocketMap.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  static removeUserSocket(userId: string, socketId: string): void {
    const sockets = this.userSocketMap.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSocketMap.delete(userId);
      }
    }
  }

  static isOnline(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }

  static notifyUser(userId: string, payload: NotificationPayload): void {
    const sockets = this.getActiveSockets(userId);
    for (const socketId of sockets) {
      this.io.to(socketId).emit("notification:new", payload);
    }
  }

  static sendFriendRequest(
    userId: string,
    payload: Extract<NotificationPayload, { type: "friend_request" }>
  ): void {
    const sockets = this.getActiveSockets(userId);
    for (const socketId of sockets) {
      this.io.to(socketId).emit("friend:request", payload);
    }
  }

  static sendFriendAccepted(
    userId: string,
    payload: Extract<NotificationPayload, { type: "friend_accept" }>
  ): void {
    const sockets = this.getActiveSockets(userId);
    for (const socketId of sockets) {
      this.io.to(socketId).emit("friend:accept", payload);
    }
  }

  static emitToRoom(event: keyof ServerToClientEvents, room: string, payload: unknown): void {
    this.io.to(room).emit(event, payload);
  }
}

export default SocketService;
