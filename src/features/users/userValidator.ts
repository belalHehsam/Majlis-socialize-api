import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).trim().optional(),
    bio:      z.string().max(200).trim().optional(),
  }).strict(),
});
