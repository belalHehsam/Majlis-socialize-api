import Notification, { INotification } from "../../models/Notification";
import SocketService from "../../socket/socketService";
import APIFeatures from "../../utils/apiFeatures";
import { NotificationData } from "./notificationTypes";

export const createNotification = async (notificationData: NotificationData) => {
  const notification = await Notification.create({
    recipient: notificationData.recipient,
    sender: notificationData.sender,
    type: notificationData.type,
    post: notificationData.post,
  });

  const populatedNotification = await notification.populate<{
    sender: { _id: string; username: string; avatar?: string };
  }>("sender", "username avatar");

  SocketService.notifyUser(notificationData.recipient.toString(), {
    type: notificationData.type,
    fromUser: {
      _id: populatedNotification.sender.toString(),
      username: populatedNotification.sender.username,
      avatar: populatedNotification.sender.avatar,
    },
    postId: notificationData.post?.toString(),
    createdAt: notification.createdAt,
  });

  return populatedNotification;
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
    .populate("post", "_id");

  const total = await Notification.countDocuments(filter);

  return {
    notifications,
    meta: {
      total,
      page: Number(queryOptions.page) || 1,
      limit: Number(queryOptions.limit) || 100,
      totalPages: Math.ceil(total / (Number(queryOptions.limit) || 100)),
    },
  };
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  return await Notification.countDocuments({ recipient: userId, isRead: false });
}

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
