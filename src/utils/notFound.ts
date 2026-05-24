import { Request, Response, NextFunction } from "express";
import { AppError } from "./appError";

/**
 * Catch-all handler for unmatched routes.
 * Register this AFTER all route mounts in app.ts.
 */
export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};
