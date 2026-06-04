import { z } from "zod";
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");
export const sendMessageSchema = z.object({
  body: z.object({
    recipientId: objectId,
    content: z.string().trim().min(1).max(2000),
  }),
});
export const getMessagesSchema = z.object({
  params: z.object({
    conversationId: objectId,
  }),

  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => Number(val || 1)),

    limit: z
      .string()
      .optional()
      .transform((val) => Number(val || 20)),
  }),
});
