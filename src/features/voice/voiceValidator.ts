import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const createVoiceChannelSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(80),
    categoryId: objectId,
  }),
});

export const listVoiceChannelsSchema = z.object({
  query: z.object({
    categoryId: objectId.optional(),
  }),
});

export const voiceChannelIdSchema = z.object({
  params: z.object({
    channelId: objectId,
  }),
});
