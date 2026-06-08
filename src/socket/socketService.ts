import type {
  FriendAcceptedPayload,
  FriendRequestPayload,
  IO,
  NotificationPayload,
  ServerToClientEvents,
} from "../types/socketTypes";

class SocketService {
  private static io: IO;
  private static userSocketMap: Map<string, string> = new Map();

  static init(io: IO): void {
    this.io = io;
  }

  static registerUser(userId: string, socketId: string): void {
    this.userSocketMap.set(userId, socketId);
  }

  static removeUser(userId: string): void {
    this.userSocketMap.delete(userId);
  }

  static isOnline(userId: string): boolean {
    return this.userSocketMap.has(userId);
  }

  static notifyUser(userId: string, payload: NotificationPayload): void {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) this.io.to(socketId).emit("notification:new", payload);
  }

  static sendFriendRequest(userId: string, payload: FriendRequestPayload): void {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) this.io.to(socketId).emit("friend:request", payload);
  }

  static sendFriendAccepted(userId: string, payload: FriendAcceptedPayload): void {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) this.io.to(socketId).emit("friend:accepted", payload);
  }

  static emitToRoom(event: keyof ServerToClientEvents, room: string, payload: unknown): void {
    this.io.to(room).emit(event, payload);
  }
}

export default SocketService;
