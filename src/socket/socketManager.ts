import { registerNotificationHandlers } from "../features/notifications/notificationHandler";
import { registerChatHandlers } from "../features/chat/chatHandler";
import { registerVoiceHandlers } from "../features/voice/voiceHandler";
import type { IO, NotificationPayload } from "../types/socketTypes";
import SocketService from "./socketService";
import User from "../models/User";
import Post from "../models/Post";
import Notification from "../models/Notification";

export async function seedTestNotificationsIfNeeded(userId: string, force: boolean = false) {
  try {
    // Only seed if user has 0 notifications (avoids flooding DB on every reconnect)
    const count = await Notification.countDocuments({ recipient: userId });
    if (!force && count > 40) return;

    // If forcing, clear existing ones to avoid massive build-up during testing
    if (force) {
      await Notification.deleteMany({ recipient: userId });
    }

    const recipientUser = await User.findById(userId);
    if (!recipientUser) return;

    // Defined dummy users to create variety
    const dummyUsersData = [
      {
        username: "sarah_lee",
        email: "sarah@example.com",
        displayName: "Sarah Lee",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=sarah",
      },
      {
        username: "john_doe",
        email: "john@example.com",
        displayName: "John Doe",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=john",
      },
      {
        username: "ali_hassan",
        email: "ali@example.com",
        displayName: "Ali Hassan",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=ali",
      },
      {
        username: "fatima_a",
        email: "fatima@example.com",
        displayName: "Fatima Amari",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=fatima",
      },
      {
        username: "michael_g",
        email: "michael@example.com",
        displayName: "Michael Green",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=michael",
      },
      {
        username: "yuki_s",
        email: "yuki@example.com",
        displayName: "Yuki Sato",
        avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=yuki",
      },
    ];

    const seededSenders = [];
    for (const userData of dummyUsersData) {
      // Avoid conflict if the logged-in user matches a dummy user
      if (userData.username === recipientUser.username || userData.email === recipientUser.email) {
        continue;
      }

      let user = await User.findOne({
        $or: [{ username: userData.username }, { email: userData.email }],
      });

      if (!user) {
        user = await User.create({
          username: userData.username,
          email: userData.email,
          displayName: userData.displayName,
          avatar: userData.avatar,
          password: "password123",
        });
      }
      seededSenders.push(user);
    }

    // Ensure we have at least one sender user
    if (seededSenders.length === 0) {
      seededSenders.push(recipientUser);
    }

    const senderMap = new Map<string, any>();
    for (const sender of seededSenders) {
      senderMap.set(sender.username, sender);
    }

    // Find or create a post for like/comment notifications
    let post = await Post.findOne();
    if (!post) {
      const postAuthor = seededSenders[0] || recipientUser;
      post = await Post.create({
        author: postAuthor._id,
        content: "Reflecting on today's Quran verse. Beautiful reminder for all of us.",
        tags: ["quran"],
      });
    }

    // Define 20 realistic notifications with different values, types, and senders
    const notificationsData = [
      { senderName: "sarah_lee", type: "like", isRead: false, minutesOffset: 5 },
      {
        senderName: "john_doe",
        type: "comment",
        commentText: "Really insightful post, thanks for sharing!",
        isRead: false,
        minutesOffset: 12,
      },
      { senderName: "ali_hassan", type: "friend_request", isRead: false, minutesOffset: 30 },
      { senderName: "fatima_a", type: "friend_accept", isRead: false, minutesOffset: 45 },
      { senderName: "michael_g", type: "like", isRead: false, minutesOffset: 60 },

      {
        senderName: "yuki_s",
        type: "comment",
        commentText: "SubhanAllah, this is a beautiful reminder.",
        isRead: true,
        minutesOffset: 120,
      },
      {
        senderName: "sarah_lee",
        type: "comment",
        commentText: "Couldn't agree more with this statement.",
        isRead: true,
        minutesOffset: 180,
      },
      { senderName: "john_doe", type: "friend_request", isRead: true, minutesOffset: 240 },
      { senderName: "ali_hassan", type: "like", isRead: true, minutesOffset: 300 },
      {
        senderName: "fatima_a",
        type: "comment",
        commentText: "JazakAllah Khair for compiling this list.",
        isRead: true,
        minutesOffset: 360,
      },

      {
        senderName: "michael_g",
        type: "comment",
        commentText: "May Allah bless you for spreading knowledge.",
        isRead: true,
        minutesOffset: 720,
      },
      { senderName: "yuki_s", type: "like", isRead: true, minutesOffset: 1440 },
      { senderName: "sarah_lee", type: "friend_accept", isRead: true, minutesOffset: 2160 },
      { senderName: "john_doe", type: "like", isRead: true, minutesOffset: 2880 },
      {
        senderName: "ali_hassan",
        type: "comment",
        commentText: "Very beneficial. Saved this post for later reading.",
        isRead: true,
        minutesOffset: 4320,
      },

      { senderName: "fatima_a", type: "like", isRead: true, minutesOffset: 5760 },
      { senderName: "michael_g", type: "friend_request", isRead: true, minutesOffset: 7200 },
      {
        senderName: "yuki_s",
        type: "comment",
        commentText: "Which translation is this from? JazakAllah Khair.",
        isRead: true,
        minutesOffset: 10080,
      },
      { senderName: "sarah_lee", type: "like", isRead: true, minutesOffset: 11520 },
      { senderName: "john_doe", type: "friend_accept", isRead: true, minutesOffset: 14400 },
    ];

    // Seed notifications in reverse order (oldest first) so they display with newest at the top
    for (let i = notificationsData.length - 1; i >= 0; i--) {
      const item = notificationsData[i];
      const sender = senderMap.get(item.senderName) || seededSenders[0] || recipientUser;
      const customDate = new Date(Date.now() - item.minutesOffset * 60 * 1000);

      // Create in DB - casting to any to prevent Mongoose discriminating union type inference issues
      const notification = (await Notification.create({
        recipient: userId,
        sender: sender._id,
        type: item.type,
        isRead: item.isRead,
        ...(item.type === "like" || item.type === "comment" ? { post: post._id } : {}),
        ...(item.type === "comment" ? { commentText: item.commentText } : {}),
      } as any)) as any;

      // Update createdAt directly bypassing mongoose timestamp middleware
      await Notification.updateOne({ _id: notification._id }, { $set: { createdAt: customDate } });

      // Emit via socket payload only if the notification is unread
      if (!item.isRead) {
        const socketPayload: NotificationPayload = {
          _id: notification._id.toString(),
          type: item.type as any,
          sender: {
            _id: sender._id.toString(),
            username: sender.username,
            avatar: sender.avatar,
          },
          isRead: item.isRead,
          createdAt: customDate,
          ...(item.type === "like" || item.type === "comment"
            ? { post: { _id: post._id.toString() } }
            : {}),
          ...(item.type === "comment" ? { commentText: item.commentText } : {}),
        } as any;

        SocketService.notifyUser(userId, socketPayload);
      }
    }

  } catch (error) {
    console.error("Failed to seed test notifications:", error);
  }
}

export const SocketManager = (io: IO): void => {
  io.on("connection", (socket) => {
    const { userId } = socket.data;

    SocketService.registerUser(userId, socket.id);

    registerNotificationHandlers(socket);

    registerChatHandlers(io, socket);

    registerVoiceHandlers(io, socket);

    socket.on("disconnect", () => {
      SocketService.removeUserSocket(userId, socket.id);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
