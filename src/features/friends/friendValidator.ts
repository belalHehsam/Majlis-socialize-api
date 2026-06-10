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