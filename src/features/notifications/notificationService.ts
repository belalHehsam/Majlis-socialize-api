import Notification, { INotification } from "../../models/Notification";
import SocketService from "../../socket/socketService";
import APIFeatures from "../../utils/apiFeatures";
import { NotificationPayload } from "../../types/socketTypes";
import { CreateNotificationData } from "./notificationTypes";
import User from "../../models/User";

export const createNotification = async (notificationData: CreateNotificationData) => {
  const recipientUser = await User.findById(notificationData.recipient)
    .select("settings.notificationsEnabled")
    .lean();

  if (!recipientUser || recipientUser.settings?.notificationsEnabled === false) {
    return null;
  }

  const createData = {
    recipient: notificationData.recipient,
    sender: notificationData.sender,
    type: notificationData.type,
    ...(notificationData.type === "like" || notificationData.type === "comment"
      ? { post: notificationData.post }
      : {}),
    ...(notificationData.type === "comment"
      ? { commentText: notificationData.commentText }
      : {}),
  };
  // Cast needed because Mongoose's discriminated union overloads can't infer
  // the correct INotification branch from a dynamically built object.
  const notification = await Notification.create(
    createData as Parameters<typeof Notification.create>[0]
  );

  const populated = await Notification.findById(notification._id).populate<{
    sender: { _id: string; username: string; avatar?: string };
  }>("sender", "username avatar");

  if (!populated) throw new Error("Notification not found after creation");

  const sender = populated.sender as {
    _id: string;
    username: string;
    avatar?: string;
  };

  let socketPayload: NotificationPayload;

  if (notificationData.type === "like") {
    socketPayload = {
      _id: populated._id.toString(),
      type: "like",
      sender: {
        _id: sender._id.toString(),
        username: sender.username,
        avatar: sender.avatar,
      },
      post: { _id: notificationData.post },
      isRead: false,
      createdAt: populated.createdAt,
    };
  } else if (notificationData.type === "comment") {
    socketPayload = {
      _id: populated._id.toString(),
      type: "comment",
      sender: {
        _id: sender._id.toString(),
        username: sender.username,
        avatar: sender.avatar,
      },
      post: { _id: notificationData.post },
      commentText: (populated as any).commentText,
      isRead: false,
      createdAt: populated.createdAt,
    };
  } else {
    socketPayload = {
      _id: populated._id.toString(),
      type: notificationData.type,
      sender: {
        _id: sender._id.toString(),
        username: sender.username,
        avatar: sender.avatar,
      },
      isRead: false,
      createdAt: populated.createdAt,
    };
  }

  SocketService.notifyUser(notificationData.recipient.toString(), socketPayload);

  return populated;
};
export const getUserNotifications = async (
  userId: string,
  options?: { page?: number; limit?: number; unreadOnly?: boolean }
) => {
  const { unreadOnly, ...queryOptions } = options ?? {};

  const filter = {
    recipient: userId,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const notifications = await new APIFeatures(Notification.find(filter), queryOptions)
    .sort()
    .paginate()
    .query.populate("sender", "username avatar")
    .populate("post", "_id content");

  const total = await Notification.countDocuments(filter);

  return {
    notifications,
    meta: {
      total,
      page: Number(queryOptions.page) || 1,
      limit: Number(queryOptions.limit) || 10,
      totalPages: Math.ceil(total / (Number(queryOptions.limit) || 10)),
    },
  };
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  return await Notification.countDocuments({ recipient: userId, isRead: false });
};

export const markOneRead = async (
  userId: string,
  notificationId: string
): Promise<INotification | null> => {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId, isRead: false },
    { isRead: true },
    { new: true }
  );
};

export const markAllRead = async (userId: string): Promise<{ modifiedCount: number }> => {
  const result = await Notification.updateMany(
    {
      recipient: userId,
      isRead: false,
    },
    {
      isRead: true,
    }
  );

  return { modifiedCount: result.modifiedCount };
};
