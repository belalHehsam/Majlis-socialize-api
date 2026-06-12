import { Request, Response, NextFunction } from "express";
import { asyncWrapper } from "../../utils/asyncWrapper";
import { AppError } from "../../utils/appError";
import jsend from "../../utils/jsend";
import Friend from "../../models/Friend";
import { createNotification } from "../notifications/notificationService";
import User from "../../models/User";


export const sendFriendRequest = asyncWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    const { recipientId } = req.body;
    const requesterId = user.id;

    if (recipientId === requesterId) {
      return next(new AppError("You cannot send a friend request to yourself", 400));
    }

    const recipient = await User.findOne({
      _id: recipientId,
      accountStatus: { $ne: "deleted" },
    }).select("settings.allowFriendRequests");

    if (!recipient) {
      return next(new AppError("Recipient user not found", 404));
    }

    if (recipient.settings?.allowFriendRequests === false) {
      return next(new AppError("This user is not accepting friend requests", 403));
    }

    const existingRequest = await Friend.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    }).lean();

    if (existingRequest) {
      return next(new AppError("Friend request or friendship already exists", 400));
    }

    const newRequest = await Friend.create({
      requester: requesterId,
      recipient: recipientId,
      status: "pending",
    });

    await createNotification({
      recipient: recipientId,
      sender: requesterId,
      type: "friend_request",
    });

    return res.status(201).json(jsend.success({ friendRequest: newRequest }));
  }
);

export const cancelFriendRequest = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user!;
  const { requestId } = req.params;

  const request = await Friend.findOneAndDelete({
    _id: requestId,
    requester: user.id,
    status: "pending",
  });

  if (!request) {
    return next(new AppError("Friend request not found or cannot be cancelled", 404));
  }

  return res.status(200).json(jsend.success(null));
});


export const acceptFriendRequest = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user!;
  const { requestId } = req.params;

  const request = await Friend.findOneAndUpdate(
    { _id: requestId, recipient: user.id, status: "pending" },
    { status: "accepted" },
    { new: true, runValidators: true }
  ).populate("requester", "username avatar");

  if (!request) {
    return next(new AppError("Friend request not found", 404));
  }


  const populatedRequester = request.requester as unknown as {
    _id: string;
    username: string;
    avatar?: string;
  };

  await createNotification({
    recipient: populatedRequester._id.toString(),
    sender: user.id,
    type: "friend_accept",
  });

  return res.status(200).json(jsend.success({ friendRequest: request }));
});


export const rejectFriendRequest = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user!;
  const { requestId } = req.params;

  const request = await Friend.findOneAndDelete({
    _id: requestId,
    recipient: user.id,
    status: "pending",
  });

  if (!request) {
    return next(new AppError("Friend request not found", 404));
  }

  return res.status(200).json(jsend.success(null));
});