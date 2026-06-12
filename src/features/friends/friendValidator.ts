import { z } from "zod";

export const sendRequestSchema = z.object({
  body: z.object({
    recipientId: z.string().min(1, "Recipient ID is required"),
  }).strict(),
});

export const requestIdParamSchema = z.object({
  params: z.object({
    requestId: z.string().min(1, "Request ID is required"),
  }).strict(),
});

export const listFriendsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(50).optional().default(10),
  }),
});