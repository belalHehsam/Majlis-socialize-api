import { Request, Response, NextFunction } from "express";
import { AppError } from "./appError";
import jsend from "./jsend";

/**
 * Global error handler middleware.
 * Must be registered as the LAST middleware in app.ts.
 *
 * Handles:
 * - Operational AppErrors (known, expected errors)
 * - Mongoose CastError       → 400 Bad Request
 * - Mongoose ValidationError → 422 Unprocessable Entity
 * - Mongoose Duplicate Key   → 409 Conflict
 * - JWT errors               → 401 Unauthorized
 * - Unknown errors           → 500 Internal Server Error
 */
export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  // ── Mongoose: invalid ObjectId ─────────────────────────────────────────────
  if (err.name === "CastError") {
    res.status(400).json(jsend.fail({ [err.path]: `Invalid ${err.path}` }));
    return;
  }

  // ── Mongoose: schema validation errors ────────────────────────────────────
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).reduce((acc: Record<string, string>, e: any) => {
      acc[e.path] = e.message;
      return acc;
    }, {});
    res.status(422).json(jsend.fail(errors, "Validation failed"));
    return;
  }

  // ── Mongoose: duplicate key ────────────────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "field";
    res.status(409).json(jsend.fail({ [field]: `${field} already exists` }, "Duplicate value"));
    return;
  }

  // ── JWT: invalid token ─────────────────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    res.status(401).json(jsend.fail({}, "Invalid token. Please log in again."));
    return;
  }

  // ── JWT: expired token ─────────────────────────────────────────────────────
  if (err.name === "TokenExpiredError") {
    res.status(401).json(jsend.fail({}, "Token expired. Please log in again."));
    return;
  }

  // ── Operational AppError (known, expected) ─────────────────────────────────
  if (err instanceof AppError && err.isOperational) {
    res
      .status(err.statusCode)
      .json(err.statusCode >= 500 ? jsend.error(err.message) : jsend.fail({}, err.message));
    return;
  }

  // ── Unknown / programming error ────────────────────────────────────────────
  // Log the full error in non-production environments
  if (process.env.NODE_ENV !== "production") {
    console.error("UNHANDLED ERROR:", err);
  }

  res.status(500).json(jsend.error("Something went wrong. Please try again later."));
};
