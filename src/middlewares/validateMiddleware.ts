import { NextFunction, Request, Response } from "express";
import { ZodError, ZodTypeAny } from "zod";
import jsend from "../utils/jsend";

export const validate = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      if (validatedData.body) {
        req.body = validatedData.body;
      }

      if (validatedData.params) {
        req.params = validatedData.params;
      }

      // Do not do this:
      // req.query = validatedData.query;
      // In your Express version, req.query is read-only.

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));

        console.error("Validation failed:", errors);
        return res.status(422).json(jsend.fail(errors, "Validation failed"));
      }

      return next(error);
    }
  };
};