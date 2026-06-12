import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../../models/User";
import { AppError } from "../../utils/appError";
import { asyncWrapper } from "../../utils/asyncWrapper";
import jsend from "../../utils/jsend";
import { buildProfileResponse } from "./userResponse";

export const getMyProfile = asyncWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("You are not logged in", 401));
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    return res.status(200).json(
      jsend.success({
        user: buildProfileResponse(user),
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
  
  const page = Number(req.query.page)||1;
  const limit = Number(req.query.limit)||10;
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