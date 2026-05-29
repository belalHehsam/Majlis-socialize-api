import { z } from "zod";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "username must be between 3 and 30 characters")
  .max(30, "username must be between 3 and 30 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "username can only contain letters, numbers, and underscores"
  );

export const updateProfileSchema = z.object({
  body: z
    .object({
      username: usernameSchema.optional(),
      userName: usernameSchema.optional(),
      displayName: z.string().trim().min(3).max(40).optional(),
      bio: z.string().max(200).trim().optional(),
      avatar: z.string().url().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Send at least one profile field to update",
    })
    .transform((data) => ({
      ...data,
      username: data.username ?? data.userName,
    })),
});

export const updateSettingsSchema = z.object({
  body: z
    .object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      language: z.enum(["en", "ar"]).optional(),
      isPrivateProfile: z.boolean().optional(),
      allowFriendRequests: z.boolean().optional(),
      showEmail: z.boolean().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Send at least one setting to update",
    }),
});