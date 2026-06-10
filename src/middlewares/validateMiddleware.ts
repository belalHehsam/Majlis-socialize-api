import { ZodObject, ZodError } from "zod";
import { NextFunction, Request, Response } from "express";
import jsend from "../utils/jsend";

export const validate = (schema: ZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      }) as any;

      if (validatedData.body) req.body = validatedData.body;
      if (validatedData.params) req.params = validatedData.params;

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(422).json(
          jsend.fail(
            error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
            "Validation failed"
          )
        );
      }

      return next(error);
    }
  };
};
