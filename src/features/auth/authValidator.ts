import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).trim(),
    email:    z.string().email().toLowerCase().trim(),
    password: z.string().min(8),
  }).strict(),
});

export const loginSchema = z.object({
  body: z.object({
    email:    z.string().email().toLowerCase().trim(),
    password: z.string().min(1),
  }).strict(),
});
