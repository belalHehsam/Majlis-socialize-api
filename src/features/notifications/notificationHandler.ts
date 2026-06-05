import { AppSocket } from "../../types/socketTypes";
import { markOneRead } from "./notificationService";

export const registerNotificationHandlers = (socket: AppSocket) => {
  socket.on("notification:markRead", async (notificationId: string) => {
    try {
      await markOneRead(socket.data.userId, notificationId);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      // socket.emit("error", { message: "Failed to mark notification as read" });
    }
  });
};
