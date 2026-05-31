import { z } from "zod";

export const createPostSchema = z.object({
  body: z
    .object({
      content: z.string().min(1).max(1000).trim(),
      tags: z.preprocess(
      (val) => {
        try {
          return typeof val === "string" ? JSON.parse(val) : val;
        } catch {
          return []; // If JSON.parse fails, return empty array which will fail validation
        }
      },
      z.array(z.enum(["quran", "hadith", "fiqh", "general", "dua", "tafsir", "seerah", "reminder"])).min(1, "Select at least one tag")
    ),
      commentsEnabled: z.preprocess((val) => val === "true" || val === true, z.boolean().optional()),
    })
    .strict(),
});

export const updatePostSchema = z.object({
  body: z
    .object({
      content: z.string().min(1).max(1000).trim().optional(),
      tags: z.preprocess(
      (val) => {
        try {
          return typeof val === "string" ? JSON.parse(val) : val;
        } catch {
          return val;
        }
      },
      z.array(z.enum(["quran", "hadith", "fiqh", "general", "dua", "tafsir", "seerah", "reminder"])).min(1, "Select at least one tag").optional()
    ),
      commentsEnabled: z.preprocess((val) => val === "true" || val === true, z.boolean().optional()),
    })
    .strict(),
});
