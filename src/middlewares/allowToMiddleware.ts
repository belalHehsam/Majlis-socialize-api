import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
/**
 * Restrict access to specific roles.
 *
 * @example
 * router.delete("/posts/:id", authorize, allowTo("admin"), asyncWrapper(deletePost));
 */
export const allowTo = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action.", 403));
    }
    next();
  };
};
