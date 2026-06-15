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

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format");

const profilePostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const updateProfileSchema = z.object({
  body: z
    .object({
      username: usernameSchema.optional(),
      userName: usernameSchema.optional(),
      displayName: z.string().trim().min(3).max(40).optional(),
      bio: z.string().max(200).trim().optional(),
      avatar: z.string().url().optional(),
      coverPhoto: z.string().url().optional(),
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
      notificationsEnabled: z.boolean().optional(),
      showOnlineStatus: z.boolean().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Send at least one setting to update",
    }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const getMyProfileSchema = z.object({
  query: profilePostsQuerySchema,
});

export const getUserProfileSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  query: profilePostsQuerySchema,
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(50).optional().default(10),
    search: z.string().optional(),
  }),
});
