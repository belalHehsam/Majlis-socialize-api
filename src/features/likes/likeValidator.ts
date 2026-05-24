import { z } from "zod";

export const toggleLikeSchema = z.object({
  body: z.object({
    postId: z.string().min(1),
  }).strict(),
});
