import { z } from "zod";

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(500).trim(),
    postId:  z.string().min(1),
  }).strict(),
});
