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

const passwordSchema = z
  .string()
  .min(8, "password must be at least 8 characters")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d).+$/,
    "password must contain at least one letter and one number"
  );

export const registerSchema = z.object({
  body: z
    .object({
      username: usernameSchema.optional(),
      userName: usernameSchema.optional(),
      displayName: z.string().trim().min(3).max(40).optional(),
      email: z.string().email().toLowerCase().trim(),
      password: passwordSchema,
      confirmPassword: z.string().optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (!data.username && !data.userName) {
        ctx.addIssue({
          code: "custom",
          path: ["username"],
          message: "username is required",
        });
      }

      if (
        data.confirmPassword !== undefined &&
        data.confirmPassword !== data.password
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "confirmPassword must match password",
        });
      }
    })
    .transform((data) => {
      const username = data.username ?? data.userName;

      return {
        ...data,
        username: username?.toLowerCase(),
        email: data.email.toLowerCase(),
      };
    }),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email().toLowerCase().trim(),
      password: z.string().min(1, "password is required"),
    })
    .strict(),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, "currentPassword is required"),
      newPassword: passwordSchema,
      confirmNewPassword: z.string().optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (
        data.confirmNewPassword !== undefined &&
        data.confirmNewPassword !== data.newPassword
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmNewPassword"],
          message: "confirmNewPassword must match newPassword",
        });
      }
    }),
});