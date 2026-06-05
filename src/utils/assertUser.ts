import { Request } from "express";
import { AppError } from "./appError";

interface AuthenticatedUser {
  id: string;
  role: string;
}

export const assertUser: (req: Request) => asserts req is Request & { user: AuthenticatedUser } = (
  req
) => {
  if (!req.user) {
    throw new AppError("You are not logged in", 401);
  }
};
