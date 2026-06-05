import OpenAI from "openai";

/**
 * Gemini AI client using OpenAI-compatible endpoint.
 * Free tier: 15 RPM, 1,500 req/day, 1M tokens/min.
 *
 * Get a free API key: https://aistudio.google.com/apikey
 */
const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

/** Active model — Gemini 2.5 Flash (free tier) */
export const AI_MODEL = "gemini-2.5-flash";

export default gemini;
