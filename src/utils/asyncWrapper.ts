import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async controller to automatically catch errors
 * and forward them to the global error handler via next().
 *
 * @example
 * router.get("/posts", asyncWrapper(getPosts));
 */
export const asyncWrapper = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};
