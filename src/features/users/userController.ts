import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import User from "../../models/User";
import Friend from "../../models/Friend";
import Post from "../../models/Post";
import cloudinary from "../../config/cloudinary-config";
import { AppError } from "../../utils/appError";
import { asyncWrapper } from "../../utils/asyncWrapper";
import jsend from "../../utils/jsend";
import {
  buildProfileResponse,
  buildPublicProfileResponse,
  FriendshipStatus,
} from "./userResponse";

type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};
//For  Pagination on posts in profile
const DEFAULT_PROFILE_POSTS_LIMIT = 10;
const MAX_PROFILE_POSTS_LIMIT = 50;

const uploadImageToCloudinary = (
  fileBuffer: Buffer,
  mimetype: string,
  folder: string
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: mimetype.split("/")[1],
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Cloudinary upload failed"));
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(fileBuffer);
  });
};

const uploadAvatarToCloudinary = (
  fileBuffer: Buffer,
  mimetype: string
): Promise<CloudinaryUploadResult> => uploadImageToCloudinary(fileBuffer, mimetype, "majlis/avatars");

const uploadCoverPhotoToCloudinary = (
  fileBuffer: Buffer,
  mimetype: string
): Promise<CloudinaryUploadResult> =>
  uploadImageToCloudinary(fileBuffer, mimetype, "majlis/cover_photos");

const extractCloudinaryPublicId = (imageUrl?: string): string | null => {
  if (!imageUrl || !imageUrl.includes("res.cloudinary.com")) return null;

  const uploadMarker = "/upload/";
  const uploadIndex = imageUrl.indexOf(uploadMarker);

  if (uploadIndex === -1) return null;

  const pathAfterUpload = imageUrl
    .slice(uploadIndex + uploadMarker.length)
    .split("?")[0];

  const parts = pathAfterUpload.split("/").filter(Boolean);
  const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
  const publicIdParts = versionIndex >= 0 ? parts.slice(versionIndex + 1) : parts;

  if (publicIdParts.length === 0) return null;

  return publicIdParts.join("/").replace(/\.[^/.]+$/, "");
};

const getFriendshipStatus = async (
  viewerId: string,
  profileUserId: string
): Promise<FriendshipStatus> => {
  if (viewerId === profileUserId) return "none";

  const friendship = await Friend.findOne({
    $or: [
      { requester: viewerId, recipient: profileUserId },
      { requester: profileUserId, recipient: viewerId },
    ],
  }).lean();

  if (!friendship || friendship.status === "rejected") return "none";

  if (friendship.status === "accepted") return "friends";

  return friendship.requester.toString() === viewerId
    ? "pending_sent"
    : "pending_received";
};

const parsePositiveInteger = (value: unknown, defaultValue: number): number => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
};

const getProfilePostsPagination = (query: Request["query"]) => {
  const page = parsePositiveInteger(query.page, 1);
  const requestedLimit = parsePositiveInteger(query.limit, DEFAULT_PROFILE_POSTS_LIMIT);
  const limit = Math.min(requestedLimit, MAX_PROFILE_POSTS_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const getProfilePosts = async (
  authorId: Types.ObjectId | string,
  query: Request["query"],
  canViewPosts = true
) => {
  const { page, limit, skip } = getProfilePostsPagination(query);

  if (!canViewPosts) {
    return {
      posts: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  const postFilter = {
    author: authorId,
    moderationStatus: "approved" as const,
  };

  const [posts, total] = await Promise.all([
    Post.find(postFilter)
      .populate("author", "username displayName avatar bio")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments(postFilter),
  ]);

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getMyProfile = asyncWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("You are not logged in", 401));
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const { posts, pagination } = await getProfilePosts(user._id, req.query);

    return res.status(200).json(
      jsend.success({
        user: buildProfileResponse(user),
        posts,
        pagination,
      })
    );
  }
);

export const getUserProfile = asyncWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("You are not logged in", 401));
    }

    const profileUser = await User.findById(req.params.id);

    if (!profileUser) {
      return next(new AppError("User not found", 404));
    }

    const friendshipStatus = await getFriendshipStatus(req.user.id, profileUser._id.toString());
    const isSelf = req.user.id === profileUser._id.toString();
    const canViewPrivateContent =
      isSelf || friendshipStatus === "friends" || !profileUser.settings?.isPrivateProfile;
    const shouldHidePrivateProfile =
      profileUser.settings?.isPrivateProfile && !canViewPrivateContent;

    const { posts, pagination } = await getProfilePosts(
      profileUser._id,
      req.query,
      canViewPrivateContent
    );

    return res.status(200).json(
      jsend.success({
        user: buildPublicProfileResponse(
          profileUser,
          friendshipStatus,
          Boolean(shouldHidePrivateProfile)
        ),
        posts,
        pagination,
      })
    );
  }
);

export const updateMyProfile = asyncWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("You are not logged in", 401));
    }

    const updates: Record<string, string> = {};

    if (req.body.username) {
      const username = req.body.username.toLowerCase();

      const existingUser = await User.findOne({
        _id: { $ne: req.user.id },
        username,
      });

      if (existingUser) {
        return next(new AppError("Username already exists", 409));
      }

      updates.username = username;
    }

    if (req.body.displayName) {
      updates.displayName = req.body.displayName;
    }

    if (req.body.bio !== undefined) {
      updates.bio = req.body.bio;
    }

    if (req.body.avatar !== undefined) {
      updates.avatar = req.body.avatar;
    }

    if (req.body.coverPhoto !== undefined) {
      updates.coverPhoto = req.body.coverPhoto;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return next(new AppError("User not found", 404));
    }

    return res.status(200).json(
      jsend.success({
        user: buildProfileResponse(updatedUser),
      })
    );
  }
);

export const updateMyAvatar = asyncWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("You are not logged in", 401));
    }

    if (!req.file) {
      return next(new AppError("Avatar image is required", 400));
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    let uploadedAvatar: CloudinaryUploadResult;

    try {
      uploadedAvatar = await uploadAvatarToCloudinary(req.file.buffer, req.file.mimetype);
    } catch {
      return next(new AppError("Avatar upload failed. Please try again.", 500));
    }

    const oldAvatarPublicId = extractCloudinaryPublicId(user.avatar);

    if (oldAvatarPublicId) {
      try {
        await cloudinary.uploader.destroy(oldAvatarPublicId, {
          resource_type: "image",
        });
      } catch {
        await cloudinary.uploader
          .destroy(uploadedAvatar.publicId, {
            resource_type: "image",
          })
          .catch(() => undefined);

        return next(new AppError("Old avatar deletion failed. Please try again.", 500));
      }
    }

    user.avatar = uploadedAvatar.secureUrl;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
      jsend.success({
        user: buildProfileResponse(user),
      })
    );
  }
);

export const updateMyCoverPhoto = asyncWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("You are not logged in", 401));
    }

    if (!req.file) {
      return next(new AppError("Cover photo image is required", 400));
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    let uploadedCoverPhoto: CloudinaryUploadResult;

    try {
      uploadedCoverPhoto = await uploadCoverPhotoToCloudinary(
        req.file.buffer,
        req.file.mimetype
      );
    } catch {
      return next(new AppError("Cover photo upload failed. Please try again.", 500));
    }

    const oldCoverPhotoPublicId = extractCloudinaryPublicId(user.coverPhoto);

    if (oldCoverPhotoPublicId) {
      try {
        await cloudinary.uploader.destroy(oldCoverPhotoPublicId, {
          resource_type: "image",
        });
      } catch {
        await cloudinary.uploader
          .destroy(uploadedCoverPhoto.publicId, {
            resource_type: "image",
          })
          .catch(() => undefined);

        return next(new AppError("Old cover photo deletion failed. Please try again.", 500));
      }
    }

    user.coverPhoto = uploadedCoverPhoto.secureUrl;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
      jsend.success({
        user: buildProfileResponse(user),
      })
    );
  }
);

export const updateMySettings = asyncWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("You are not logged in", 401));
    }

    const settingsUpdates = Object.entries(req.body).reduce(
      (acc: Record<string, unknown>, [key, value]) => {
        acc[`settings.${key}`] = value;
        return acc;
      },
      {}
    );

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: settingsUpdates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return next(new AppError("User not found", 404));
    }

    return res.status(200).json(
      jsend.success({
        settings: updatedUser.settings,
      })
    );
  }
);


export const listUsers = asyncWrapper(async (req: Request, res: Response) => {
  const user = req.user!;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;

  const query: any = { _id: { $ne: user.id } };

  if (search) {
    query.username = { $regex: search, $options: "i" };
  }

  const users = await User.find(query)
    .select("username avatar")
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await User.countDocuments(query);

  return res.status(200).json(
    jsend.success({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  );
});
