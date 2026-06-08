import { asyncWrapper } from "../../utils/asyncWrapper";
import { Request, Response, NextFunction } from "express";
import {
  getUnreadNotificationCount,
  getUserNotifications,
  markAllRead,
  markOneRead,
} from "./notificationService";
import jsend from "../../utils/jsend";
import { assertUser } from "../../utils/assertUser";
import { AppError } from "../../utils/appError";

export const getNotifications = asyncWrapper(
  async (req: Request, res: Response) => {
    assertUser(req);

    const { page, limit, unreadOnly } = req.query as {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    };

    const data = await getUserNotifications(req.user.id, { page, limit, unreadOnly });
    res.status(200).json(jsend.success(data));
  }
);

export const getUnreadCount = asyncWrapper(
  async (req: Request, res: Response) => {
    assertUser(req);

    const count = await getUnreadNotificationCount(req.user.id);
    res.status(200).json(jsend.success({ unreadCount: count }));
  }
);

export const markNotificationRead = asyncWrapper(async (req: Request, res: Response) => {
  assertUser(req);

  const notificationId = req.params.id as string;

  const notification = await markOneRead(req.user.id, notificationId);

  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  res.status(200).send(jsend.success(notification));
});

export const markAllNotificationsRead = asyncWrapper(async (req: Request, res: Response) => {
  assertUser(req);

  const result = await markAllRead(req.user.id);

  res.status(200).send(jsend.success(result));
});
