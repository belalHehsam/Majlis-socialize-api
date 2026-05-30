const requireEnv = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`${name} is not defined in environment variables.`);
  }

  return value;
};

export const JWT_SECRET = requireEnv(process.env.JWT_SECRET, "JWT_SECRET");
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
export const JWT_ISSUER = process.env.JWT_ISSUER ?? "majlis-api";
export const JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "majlis-client";
