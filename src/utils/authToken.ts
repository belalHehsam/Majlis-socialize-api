import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { JWT_AUDIENCE, JWT_EXPIRES_IN, JWT_ISSUER, JWT_SECRET } from "../config/jwt-config";

export interface AuthTokenPayload extends JwtPayload {
  id: string;
}

const isAuthTokenPayload = (payload: string | JwtPayload): payload is AuthTokenPayload => {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as Partial<AuthTokenPayload>).id === "string"
  );
};

export const createAuthToken = (userId: string): string => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };

  return jwt.sign({ id: userId }, JWT_SECRET, options);
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, JWT_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (!isAuthTokenPayload(decoded)) {
    throw new Error("Invalid token payload");
  }

  return decoded;
};
