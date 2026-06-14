import { Request, Response, NextFunction } from "express";
import { asyncWrapper } from "../../utils/asyncWrapper";
import { AppError } from "../../utils/appError";
import jsend from "../../utils/jsend";
import Friend from "../../models/Friend";
import User from "../../models/User";
import { createNotification } from "../notifications/notificationService";



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

export const listFriends = asyncWrapper(async (req: Request, res: Response) => {
  const user = req.user!;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [friendships, total] = await Promise.all([
    Friend.find({
      status: "accepted",
      $or: [{ requester: user.id }, { recipient: user.id }],
    })
      .populate("requester", "username avatar")
      .populate("recipient", "username avatar")
      .skip(skip)
      .limit(limit)
      .lean(),
    Friend.countDocuments({
      status: "accepted",
      $or: [{ requester: user.id }, { recipient: user.id }],
    })
  ]);

  const friends = friendships.map((friendship: any) => {
    const friendObj = friendship.requester._id.toString() === user.id
      ? friendship.recipient
      : friendship.requester;

    return {
      ...friendObj,
      friendshipStatus: "accepted",
      friendshipRequestId: friendship._id
    };
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
  })
    .populate("requester", "username displayName avatar")
    .lean();

  const formattedRequests = requests.map((request: any) => ({
    ...request,
    requester: {
      ...request.requester,
      friendshipStatus: "pending_received",
      friendshipRequestId: request._id,
    },
  }));

  return res.status(200).json(
    jsend.success({
      data: formattedRequests.length,
      requests: formattedRequests,
    })
  );
}
);

export const getFriendSuggestions = asyncWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user!;

  // Find all users the current user already has a relationship with
  const existingRelationships = await Friend.find({
    $or: [{ requester: user.id }, { recipient: user.id }],
  }).select("requester recipient");

  const excludedUserIds = new Set<string>();
  excludedUserIds.add(user.id);

  existingRelationships.forEach((rel) => {
    excludedUserIds.add(rel.requester.toString());
    excludedUserIds.add(rel.recipient.toString());
  });

  const suggestions = await User.find({ _id: { $nin: Array.from(excludedUserIds) } })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("username displayName avatar createdAt")
    .lean();

  const formattedSuggestions = suggestions.map((suggestion) => ({
    ...suggestion,
    friendshipStatus: "none",
    friendshipRequestId: null,
  }));

  return res.status(200).json(
    jsend.success({
      count: formattedSuggestions.length,
      suggestions: formattedSuggestions,
    })
  );
}
);

export const getFriendshipStatus = asyncWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    const { userId } = req.params;

    if (user.id === userId) {
      return res.status(200).json(
        jsend.success({ status: "none", requestId: null })
      );
    }

    const relationship = await Friend.findOne({
      $or: [
        { requester: user.id, recipient: userId },
        { requester: userId, recipient: user.id },
      ],
    }).lean();

    let status = "none";
    let requestId = null;

    if (relationship) {
      requestId = relationship._id;
      if (relationship.status === "accepted") {
        status = "accepted";
      } else if (relationship.status === "pending") {
        if (relationship.requester.toString() === user.id) {
          status = "pending_sent";
        } else {
          status = "pending_received";
        }
      }
    }

    return res.status(200).json(
      jsend.success({ status, requestId })
    );
  }
);
