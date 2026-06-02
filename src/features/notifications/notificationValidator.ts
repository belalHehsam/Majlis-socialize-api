import { z } from "zod";

export const getNotificationsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : undefined))
      .pipe(z.number().int().positive().optional()),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : undefined))
      .pipe(z.number().int().positive().max(100).optional()),
    unreadOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((val) => val === "true"),
  }),
});
