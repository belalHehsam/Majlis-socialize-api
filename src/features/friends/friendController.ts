import { Request, Response, NextFunction } from "express";
import { asyncWrapper } from "../../utils/asyncWrapper";
import {AppError} from "../../utils/appError";
import jsend from "../../utils/jsend";
import Friend from "../../models/Friend";
import SocketService from "../../socket/socketService";
import User from "../../models/User";
import { createNotification } from "../notifications/notificationService";


export const sendFriendRequest = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user!; 
  const { recipientId } = req.body;
  const requesterId = user.id;

  if (recipientId === requesterId) {
    return next(new AppError("You cannot send a friend request to yourself", 400));
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
});


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

export const listFriends = asyncWrapper(async (req: Request, res: Response) => {
  const user = req.user!;
  
  const page = Number(req.query.page)||1;
  const limit = Number(req.query.limit)||10;
  const skip = (page - 1) * limit;

  const friendships = await Friend.find({
    status: "accepted",
    $or: [{ requester: user.id }, { recipient: user.id }],
  })
    .populate("requester", "username avatar")
    .populate("recipient", "username avatar")
    .skip(skip)
    .limit(limit)
    .lean(); 

  const total = await Friend.countDocuments({
    status: "accepted",
    $or: [{ requester: user.id }, { recipient: user.id }],
  });

  
  const friends = friendships.map((friendship: any) => {
    if (friendship.requester._id.toString() === user.id) {
      return friendship.recipient;
    }
    return friendship.requester;
  });

  return res.status(200).json(
    jsend.success({
      friends,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  );
});


export const getFriendRequests = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user!;

  const requests = await Friend.find({
    recipient: user.id,
    status: "pending",
  }).populate("requester", "name avatar"); 

  return res.status(200).json(
    jsend.success({
      data: requests.length,
      requests,
    })
  );
});


export const getFriendSuggestions = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user!;

  const suggestions = await User.find({ _id: { $ne: user.id } })
    .sort({ createdAt: -1 }) 
    .limit(20) 
    .select("name avatar createdAt");

  return res.status(200).json(
    jsend.success({
      data: suggestions.length,
      suggestions,
    })
  );
});