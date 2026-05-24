import { Request, Response, NextFunction } from "express";
import jsend from "../utils/jsend";
import * as z from "zod";

/**
 * Validate request using a Zod schema.
 * Validates req.body, req.params, and req.query.
 *
 * @example
 * router.post("/posts", validate(createPostSchema), authorize, asyncWrapper(createPost));
 */
export const validate = (schema: z.ZodType<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const errors = result.error.issues.reduce((acc: Record<string, string>, err: z.ZodIssue) => {
        const key = err.path.slice(1).join(".") || err.path.join(".");
        acc[key] = err.message;
        return acc;
      }, {});
      res.status(422).json(jsend.fail(errors, "Validation failed"));
      return;
    }

    const data = result.data as Record<string, any>;
    req.body = data.body ?? req.body;
    req.params = data.params ?? req.params;
    req.query = data.query ?? req.query;
    next();
  };
};
