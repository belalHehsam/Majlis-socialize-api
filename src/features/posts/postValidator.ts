import { z } from "zod";

export const createPostSchema = z.object({
  body: z
    .object({
      content: z.string().min(1).max(1000).trim(),
      category: z.enum(["quran", "hadith", "fiqh", "general"]),
    })
    .strict(),
});

export const updatePostSchema = z.object({
  body: z
    .object({
      content: z.string().min(1).max(1000).trim().optional(),
      category: z.enum(["quran", "hadith", "fiqh", "general"]).optional(),
    })
    .strict(),
});
