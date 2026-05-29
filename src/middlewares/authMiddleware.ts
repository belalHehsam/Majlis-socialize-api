import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/User";
import { JWT_SECRET } from "../config/jwt-config";
import { AppError } from "../utils/appError";
import { asyncWrapper } from "../utils/asyncWrapper";

interface AuthTokenPayload extends JwtPayload {
  id: string;
}

export const authorize = asyncWrapper(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("No token provided. Please log in.", 401));
    }

    if (!JWT_SECRET) {
      return next(new AppError("JWT_SECRET is not configured", 500));
    }

    const token = authHeader.split(" ")[1];

    let decoded: AuthTokenPayload;

    try {
      decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        return next(new AppError("Token expired. Please log in again.", 401));
      }

      return next(new AppError("Invalid token. Please log in again.", 401));
    }

    const currentUser = await User.findById(decoded.id).select(
      "+passwordChangedAt"
    );

    if (!currentUser) {
      return next(new AppError("User belonging to this token no longer exists", 401));
    }

    if (currentUser.accountStatus && currentUser.accountStatus !== "active") {
      return next(new AppError("This account is not active", 403));
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError("Password was changed recently. Please log in again.", 401)
      );
    }

    req.user = {
      id: currentUser._id.toString(),
      role: currentUser.role,
    };

    return next();
  }
);
