import { z } from "zod";

export const friendRequestSchema = z.object({
  body: z.object({
    targetUserId: z.string().min(1),
  }).strict(),
});
