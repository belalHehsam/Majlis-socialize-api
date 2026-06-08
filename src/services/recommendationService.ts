import gemini, { AI_MODEL } from "../config/openai-config";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Raw proposal from AI (reference numbers only — NOT the actual text) */
interface AIProposal {
  type: "quran" | "hadith" | "none";
  surahNumber: number | null;
  ayahNumber: number | null;
  hadithCollection: string | null;
  hadithNumber: number | null;
  relevanceExplanation: string;
  topic: string;
}

/** Verified recommendation with text from trusted external APIs */
export interface VerifiedRecommendation {
  type: "quran" | "hadith";
  arabicText: string;
  translationText: string;
  source: string;
  surahName?: string;
  reference: string;
  relevanceExplanation: string;
}

// ── System Prompt ─────────────────────────────────────────────────────────────

const RECOMMENDATION_SYSTEM_PROMPT = `You are an Islamic scholar assistant for "Majlis", a social platform for the Islamic community.

Given a post about an Islamic topic, recommend ONE highly relevant Quran ayah OR Hadith from the six authentic collections (Kutub al-Sittah).

## CRITICAL RULES — Religious Accuracy

1. **Only recommend references you are CERTAIN about.** You must provide the EXACT surah number and ayah number (for Quran) or the EXACT hadith collection and hadith number (for Hadith).
2. **If you are NOT 100% confident** about the exact reference number, set type to "none". NEVER guess or fabricate a reference.
3. **Prioritize well-known, universally accepted** verses and hadith that Muslims commonly reference.
4. **Choose whichever (Quran or Hadith) is MORE directly relevant** to the post's specific topic.
5. **Provide a brief, respectful explanation** of why this reference is relevant to the post.

## HADITH COLLECTIONS (use these exact names)
- "bukhari" — Sahih al-Bukhari
- "muslim" — Sahih Muslim
- "abudawud" — Sunan Abu Dawud
- "tirmidhi" — Jami' at-Tirmidhi
- "nasai" — Sunan an-Nasa'i
- "ibnmajah" — Sunan Ibn Majah

## QURAN REFERENCES
- surahNumber: 1 to 114
- ayahNumber: the specific ayah within that surah

## WHEN TO RETURN "none"
- If the post topic is too vague to find a specific match
- If you are unsure about the exact reference number
- If no well-known verse or hadith directly relates to the specific topic`;

// ── JSON Schema ───────────────────────────────────────────────────────────────

const RECOMMENDATION_RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "recommendation_proposal",
    strict: true,
    schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["quran", "hadith", "none"],
          description: "Type of recommendation",
        },
        surahNumber: {
          type: ["number", "null"],
          description: "Quran surah number (1-114), or null if not Quran",
        },
        ayahNumber: {
          type: ["number", "null"],
          description: "Quran ayah number within the surah, or null if not Quran",
        },
        hadithCollection: {
          type: ["string", "null"],
          description: "One of: bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah. Null if not hadith.",
        },
        hadithNumber: {
          type: ["number", "null"],
          description: "Hadith number in the collection, or null if not hadith",
        },
        relevanceExplanation: {
          type: "string",
          description: "Brief explanation of why this reference is relevant to the post",
        },
        topic: {
          type: "string",
          description: "The key Islamic theme/topic detected in the post",
        },
      },
      required: [
        "type",
        "surahNumber",
        "ayahNumber",
        "hadithCollection",
        "hadithNumber",
        "relevanceExplanation",
        "topic",
      ],
      additionalProperties: false,
    },
  },
};

// ── External API Verification ─────────────────────────────────────────────────

/**
 * Verify a Quran ayah using AlQuran.cloud API (free, no auth required).
 * Returns the verified Arabic text and English translation, or null if not found.
 */
async function verifyQuranAyah(
  surahNumber: number,
  ayahNumber: number
): Promise<{ arabicText: string; translationText: string; surahName: string } | null> {
  try {
    // Fetch both Arabic (Uthmani script) and English (Sahih International) in one call
    const response = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/editions/quran-uthmani,en.sahih`
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (data.code !== 200 || !data.data || data.data.length < 2) return null;

    const arabicEdition = data.data[0];
    const englishEdition = data.data[1];

    return {
      arabicText: arabicEdition.text,
      translationText: englishEdition.text,
      surahName: arabicEdition.surah?.englishName ?? `Surah ${surahNumber}`,
    };
  } catch {
    // Network error or API down — fail silently
    return null;
  }
}

/**
 * Verify a Hadith using the fawazahmed0/hadith-api (free, no auth, GitHub-hosted).
 * Returns the verified Arabic text and English translation, or null if not found.
 *
 * CDN URL pattern: https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{lang}-{collection}/{hadithNumber}.json
 */
async function verifyHadith(
  collection: string,
  hadithNumber: number
): Promise<{ arabicText: string; translationText: string } | null> {
  try {
    // Fetch English edition
    const engResponse = await fetch(
      `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${collection}/${hadithNumber}.json`
    );

    if (!engResponse.ok) return null;

    const engData = await engResponse.json();

    if (!engData.hadiths?.[0]?.text) return null;

    // Fetch Arabic edition
    const araResponse = await fetch(
      `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${collection}/${hadithNumber}.json`
    );

    let arabicText = "";

    if (araResponse.ok) {
      const araData = await araResponse.json();
      arabicText = araData.hadiths?.[0]?.text ?? "";
    }

    return {
      arabicText,
      translationText: engData.hadiths[0].text,
    };
  } catch {
    // Network error — fail silently
    return null;
  }
}

// ── Collection Display Names ──────────────────────────────────────────────────

const COLLECTION_DISPLAY_NAMES: Record<string, string> = {
  bukhari: "Sahih al-Bukhari",
  muslim: "Sahih Muslim",
  abudawud: "Sunan Abu Dawud",
  tirmidhi: "Jami' at-Tirmidhi",
  nasai: "Sunan an-Nasa'i",
  ibnmajah: "Sunan Ibn Majah",
};

// ── Service Function ──────────────────────────────────────────────────────────

/**
 * Get a verified Islamic recommendation for a post.
 *
 * Flow: AI proposes a reference → External API verifies → Return verified text.
 * If verification fails, returns null (no recommendation) rather than showing unverified content.
 *
 * @param content - The post text
 * @param tags - The post tags
 * @returns Verified recommendation or null
 */
export async function getRecommendation(
  content: string,
  tags: string[],
  locale: string = "en"
): Promise<VerifiedRecommendation | null> {
  try {
    // ── Step 1: Get AI proposal ──────────────────────────────────────────────

    const completion = await gemini.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: RECOMMENDATION_SYSTEM_PROMPT + `\n\nCRITICAL: The "relevanceExplanation" string MUST be written in the following language: ${locale === "ar" ? "Arabic" : "English"}.` },
        {
          role: "user",
          content: `Post tags: ${tags.join(', ')}\n\nPost content:\n---\n${content}\n---\n\nRecommend a relevant Quran ayah or Hadith for this post.`,
        },
      ],
      response_format: RECOMMENDATION_RESPONSE_SCHEMA,
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    const proposal: AIProposal = JSON.parse(raw);

    // AI decided no recommendation fits
    if (proposal.type === "none") return null;

    // ── Step 2: Verify with external APIs ────────────────────────────────────

    if (proposal.type === "quran" && proposal.surahNumber && proposal.ayahNumber) {
      const verified = await verifyQuranAyah(proposal.surahNumber, proposal.ayahNumber);

      if (!verified) return null; // Verification failed — skip silently

      return {
        type: "quran",
        arabicText: verified.arabicText,
        translationText: verified.translationText,
        source: `Surah ${verified.surahName} (${proposal.surahNumber}:${proposal.ayahNumber})`,
        surahName: verified.surahName,
        reference: `${proposal.surahNumber}:${proposal.ayahNumber}`,
        relevanceExplanation: proposal.relevanceExplanation,
      };
    }

    if (proposal.type === "hadith" && proposal.hadithCollection && proposal.hadithNumber) {
      const verified = await verifyHadith(proposal.hadithCollection, proposal.hadithNumber);

      if (!verified) return null; // Verification failed — skip silently

      const displayName = COLLECTION_DISPLAY_NAMES[proposal.hadithCollection] ?? proposal.hadithCollection;

      return {
        type: "hadith",
        arabicText: verified.arabicText,
        translationText: verified.translationText,
        source: `${displayName}, Hadith ${proposal.hadithNumber}`,
        reference: `${proposal.hadithCollection}:${proposal.hadithNumber}`,
        relevanceExplanation: proposal.relevanceExplanation,
      };
    }

    return null;
  } catch {
    // AI failure should never block post creation — just skip recommendation
    return null;
  }
}
