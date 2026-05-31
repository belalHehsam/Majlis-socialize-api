import gemini, { AI_MODEL } from "../config/openai-config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ModerationResult {
  decision: "approved" | "rejected" | "needs_review";
  confidence: number;
  reasoning: string;
  detectedTopic: string;
  violations: string[];
}

// ── System Prompt ─────────────────────────────────────────────────────────────

const MODERATION_SYSTEM_PROMPT = `You are an Islamic content compliance moderator for "Majlis", a social platform exclusively for the Islamic community.

## STRICT POLICY — Only Islamic Content Allowed

This platform ONLY permits content directly related to Islamic topics.

### ✅ ALLOWED CONTENT
- Quran discussion, tafsir, memorization tips, recitation advice
- Hadith sharing, explanation, authentication discussion
- Fiqh questions, rulings, scholarly opinions across madhhabs
- Islamic history (Seerah, Sahaba, Islamic civilization)
- Muslim lifestyle advice (halal living, Islamic parenting, modesty)
- Dua, dhikr, Islamic reminders, spiritual reflections
- Ramadan, Hajj, Eid, and Islamic occasion discussions
- Islamic ethics, manners (akhlaq), and character development
- Mosque and community event announcements
- Dawah and interfaith dialogue conducted respectfully
- Islamic finance (halal investment, zakat, sadaqah)
- Islamic education, book recommendations on Islamic topics

### ❌ REJECTED CONTENT
- Any content NOT related to Islam (secular topics, entertainment, sports, technology, memes, personal non-Islamic content)
- Hate speech, incitement to violence, or dehumanizing language against any group
- Profanity, vulgarity, or sexually explicit content
- Sectarian attacks or takfir (declaring other Muslims as disbelievers)
- Content mocking or disrespecting any religion or prophet
- Fabricated or misattributed Quran verses or Hadith
- Political content unrelated to Islamic principles
- Promotion of haram activities (gambling, substance abuse, etc.)

## EVALUATION PROCESS (Follow step-by-step)

1. **Identify the primary topic** — What is this post about?
2. **Check Islamic relevance** — Does it fall within the allowed Islamic subject areas listed above?
3. **Check for violations** — Does it contain any content from the rejected list?
4. **Assess confidence** — How certain are you? (0.0 = uncertain, 1.0 = fully certain)
5. **Make your decision**:
   - "approved" — clearly Islamic content with no violations
   - "rejected" — clearly non-Islamic or contains violations
   - "needs_review" — Islamic content but borderline (e.g., controversial fiqh opinion, political-Islamic intersection, unclear intent)

## IMPORTANT NOTES
- Be fair and consistent. Analyze context and intent, not just keywords.
- A post mentioning "patience" is Islamic if it discusses sabr in an Islamic context.
- Do not reject educational or scholarly content just because it discusses sensitive Islamic topics (e.g., jihad in its scholarly definition, capital punishment in fiqh).
- When in doubt, use "needs_review" rather than "rejected".`;

// ── JSON Schema ───────────────────────────────────────────────────────────────

const MODERATION_RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "moderation_result",
    strict: true,
    schema: {
      type: "object",
      properties: {
        decision: {
          type: "string",
          enum: ["approved", "rejected", "needs_review"],
          description: "The moderation decision",
        },
        confidence: {
          type: "number",
          description: "Confidence score from 0.0 to 1.0",
        },
        reasoning: {
          type: "string",
          description: "Step-by-step explanation of the evaluation process",
        },
        detectedTopic: {
          type: "string",
          description: "The primary Islamic topic detected (e.g., 'Quran tafsir', 'Islamic ethics')",
        },
        violations: {
          type: "array",
          items: { type: "string" },
          description: "List of specific policy violations found. Empty array if none.",
        },
      },
      required: ["decision", "confidence", "reasoning", "detectedTopic", "violations"],
      additionalProperties: false,
    },
  },
};

// ── Service Function ──────────────────────────────────────────────────────────

/**
 * Moderate post content using Gemini AI.
 *
 * @param content - The post text to moderate
 * @returns ModerationResult with decision, confidence, and reasoning
 * @throws Error if the AI call fails
 */
export async function moderateContent(content: string): Promise<ModerationResult> {
  const completion = await gemini.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: "system", content: MODERATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Evaluate the following post for compliance with our Islamic content policy:\n\n---\n${content}\n---`,
      },
    ],
    response_format: MODERATION_RESPONSE_SCHEMA,
    temperature: 0.1, // Low temperature for consistent classification
  });

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    throw new Error("AI moderation returned empty response");
  }

  const result: ModerationResult = JSON.parse(raw);

  // Clamp confidence between 0 and 1
  result.confidence = Math.max(0, Math.min(1, result.confidence));

  return result;
}
