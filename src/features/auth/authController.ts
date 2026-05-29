import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import User, { IUser } from "../../models/User";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../../config/jwt-config";
import { AppError } from "../../utils/appError";
import { asyncWrapper } from "../../utils/asyncWrapper";
import jsend from "../../utils/jsend";

const createToken = (userId: string): string => {
    if (!JWT_SECRET) {
        throw new AppError("JWT_SECRET is not configured", 500);
    }

    const options: SignOptions = {
        expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
    };

    return jwt.sign({ id: userId }, JWT_SECRET, options);
};

const pickPublicUserFields = (user: IUser) => ({
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    role: user.role,
    accountStatus: user.accountStatus,
    settings: user.settings,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

const sendAuthResponse = (res: Response, statusCode: number, user: IUser) => {
    const token = createToken(user._id.toString());

    return res.status(statusCode).json(
        jsend.success({
            token,
            user: pickPublicUserFields(user),
        })
    );
};

export const register = asyncWrapper(
    async (req: Request, res: Response, next: NextFunction) => {
        const { username, displayName, email, password } = req.body;

        const existingUser = await User.findOne({
            $or: [{ email }, { username }],
        });

        if (existingUser) {
            return next(new AppError("Email or username already exists", 409));
        }

        const user = await User.create({
            username,
            displayName: displayName ?? username,
            email,
            password,
        });

        return sendAuthResponse(res, 201, user);
    }
);

export const login = asyncWrapper(
    async (req: Request, res: Response, next: NextFunction) => {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select(
            "+password +passwordChangedAt"
        );

        if (!user) {
            return next(new AppError("Invalid email or password", 401));
        }

        if (user.accountStatus && user.accountStatus !== "active") {
            return next(new AppError("This account is not active", 403));
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return next(new AppError("Invalid email or password", 401));
        }

        user.lastLoginAt = new Date();
        await user.save({ validateBeforeSave: false });

        return sendAuthResponse(res, 200, user);
    }
);

export const logout = asyncWrapper(async (_req: Request, res: Response) => {
    return res.status(200).json(
        jsend.success({
            message: "Logged out successfully. Remove the token from the client.",
        })
    );
});

export const getMe = asyncWrapper(
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
                user: pickPublicUserFields(user),
            })
        );
    }
);

export const changePassword = asyncWrapper(
    async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError("You are not logged in", 401));
        }

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id).select("+password");

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        const isPasswordValid = await user.comparePassword(currentPassword);

        if (!isPasswordValid) {
            return next(new AppError("Current password is incorrect", 401));
        }

        user.password = newPassword;
        await user.save();

        return sendAuthResponse(res, 200, user);
    }
);
