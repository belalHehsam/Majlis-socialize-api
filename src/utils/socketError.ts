import { SocketAuthError } from "../types/socketTypes";

export const createSocketAuthError = (message: string, code: string): SocketAuthError => {
  const error = new Error(message) as SocketAuthError;
  error.data = { code };
  return error;
};
