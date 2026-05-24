/**
 * JSend response helpers.
 * All API responses MUST use these helpers for consistency.
 *
 * @example
 * res.status(200).json(jsend.success({ user }));
 * res.status(400).json(jsend.fail({ email: "Email is required" }));
 * res.status(500).json(jsend.error("Internal server error"));
 */

const jsend = {
  success<T>(data: T) {
    return { status: "success", data };
  },

  fail<T>(data: T, message?: string) {
    return message ? { status: "fail", data, message } : { status: "fail", data };
  },

  error(message: string, data?: unknown) {
    return data !== undefined ? { status: "error", message, data } : { status: "error", message };
  },
};

export default jsend;
