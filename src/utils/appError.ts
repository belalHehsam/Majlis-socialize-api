/**
 * Custom operational error class.
 * Use this for all expected business / auth / not-found errors.
 *
 * @example
 * return next(new AppError("Post not found", 404));
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 500 ? "error" : "fail";
    this.isOperational = true;

    // Maintains proper stack trace (only available on V8)
    Error.captureStackTrace(this, this.constructor);
  }
}
