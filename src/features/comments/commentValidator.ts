import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const commentContentSchema = z
  .string()
  .trim()
  .min(1, "Comment content is required")
  .max(500, "Comment cannot exceed 500 characters");

export const createCommentSchema = z.object({
  body: z
    .object({
      postId: z.string().regex(objectIdRegex, "Invalid post ID format"),
      content: commentContentSchema,
    })
    .strict(),
});

export const updateCommentSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid comment ID format"),
  }),

  body: z
    .object({
      content: commentContentSchema,
    })
    .strict(),
});

export const commentIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid comment ID format"),
  }),
});

export const getCommentsQuerySchema = z.object({
  query: z
    .object({
      postId: z.string().regex(objectIdRegex, "Invalid post ID format").optional(),
      page: z.string().regex(/^\d+$/, "Page must be a number").optional(),
      limit: z.string().regex(/^\d+$/, "Limit must be a number").optional(),
    })
    .strict(),
});