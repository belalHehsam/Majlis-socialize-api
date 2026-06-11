import { NextFunction, Request, Response } from "express";
import { ZodError, ZodObject } from "zod";
import jsend from "../utils/jsend";

export const validate = (schema: ZodObject<any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      }) as {
        body?: any;
        params?: any;
        query?: any;
      };

      if (validatedData.body) {
        req.body = validatedData.body;
      }

      if (validatedData.params) {
        req.params = validatedData.params;
      }

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));

        return res.status(422).json(jsend.fail(errors, "Validation failed"));
      }

      return next(error);
    }
  };
};
