import { z } from "zod";

export const createPostSchema = z.object({
  body: z
    .object({
      content: z.string().min(1).max(50000).trim(),
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
      // Sent back from the frontend after a successful /analyze step (avoids double AI call on publish)
      moderationStatus: z.enum(["approved", "needs_review"]).optional(),
      isFlagged: z.preprocess((val) => val === "true" || val === true, z.boolean().optional()),
      recommendation: z.preprocess(
        (val) => {
          try {
            return typeof val === "string" ? JSON.parse(val) : val;
          } catch {
            return undefined;
          }
        },
        z.object({
          type: z.enum(["quran", "hadith"]),
          arabicText: z.string(),
          translationText: z.string(),
          source: z.string(),
          surahName: z.string().optional(),
          reference: z.string(),
          relevanceExplanation: z.string(),
        }).optional()
      ),
    })
    .strict(),
});

export const updatePostSchema = z.object({
  body: z
    .object({
      content: z.string().min(1).max(50000).trim().optional(),
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
      recommendation: z.preprocess(
        (val) => {
          try {
            return typeof val === "string" ? JSON.parse(val) : val;
          } catch {
            return undefined;
          }
        },
        z.object({
          type: z.enum(["quran", "hadith"]),
          arabicText: z.string(),
          translationText: z.string(),
          source: z.string(),
          surahName: z.string().optional(),
          reference: z.string(),
          relevanceExplanation: z.string(),
        }).optional()
      ),
    })
    .strict(),
});

export const postIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid post ID format"),
  }),
});

export const feedQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => {
        return val ? parseInt(val, 10) : 1;
      }),
    limit: z
      .string()
      .optional()
      .transform((val) => {
        return val ? parseInt(val, 10) : 10;
      }),
    tag: z.string().optional(),
    search: z.string().optional(),
  }),
});
