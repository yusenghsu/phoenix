import "server-only";
import OpenAI from "openai";
import type { DecisionEngineInput, DecisionEngineOutput } from "./types";
import { runMockDecisionEngine } from "./mock-engine";

function buildSystemPrompt(): string {
  return `You are Phoenix, an AI brand decision system.

Core principle: Decision > Generation.

You do not simply generate content. You evaluate what a brand creator should publish today based on their brand DNA, content strategy, and audience signals.

Rules:
- Recommend exactly ONE topic per day.
- You may reject high-traffic topics if they do not fit Creator DNA.
- Never recommend empty inspiration ("心靈雞湯", generic motivation).
- Never recommend clickbait ("標題黨").
- Never recommend low-quality traffic content.
- Content must be direct and insightful ("一針見血").
- Content should make people want to save and share with someone specific.
- Phoenix never publishes without creator approval.

Respond with valid JSON only, matching this exact format:
{
  "selectedTopic": string,
  "confidenceScore": number (0-100),
  "mainJudgment": string,
  "decisionFactors": [
    { "label": "Market Signal", "score": number, "text": string },
    { "label": "Creator DNA Fit", "score": number, "text": string },
    { "label": "Brand Memory", "score": number, "text": string },
    { "label": "Share Worthiness", "score": number, "text": string }
  ],
  "risk": string,
  "candidates": [
    {
      "topic": string,
      "marketScore": number,
      "brandFitScore": number,
      "shareScore": number,
      "riskLevel": "low" | "medium" | "high",
      "rejectedReason": string | null,
      "selected": boolean
    }
  ],
  "carouselDraft": {
    "title": string,
    "caption": string,
    "hashtags": string[]
  },
  "carouselSlides": [
    {
      "slideNumber": number,
      "headline": string,
      "body": string,
      "designNotes": { "variant": string }
    }
  ],
  "learningLog": string
}

Requirements:
- Exactly 4 candidates (including the selected one).
- Exactly 8 carousel slides.
- Slide 1 variant must be "cover". Slide 8 variant must be "closing".
- 5 hashtags without # prefix.
- All text in Traditional Chinese.
- Write in the creator's brand voice: direct, warm, insightful.`;
}

function isValidOutput(obj: unknown): obj is DecisionEngineOutput {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.selectedTopic === "string" &&
    typeof o.confidenceScore === "number" &&
    typeof o.mainJudgment === "string" &&
    Array.isArray(o.decisionFactors) && o.decisionFactors.length >= 1 &&
    typeof o.risk === "string" &&
    Array.isArray(o.candidates) && o.candidates.length >= 1 &&
    typeof o.carouselDraft === "object" && o.carouselDraft !== null &&
    Array.isArray(o.carouselSlides) && o.carouselSlides.length >= 1 &&
    typeof o.learningLog === "string"
  );
}

export async function runOpenAIDecisionEngine(
  input: DecisionEngineInput
): Promise<DecisionEngineOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return runMockDecisionEngine(input);
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: JSON.stringify(
            {
              todayDate: input.todayDate,
              creatorDNA: input.creatorDNA,
              recentPosts: input.recentPosts,
              existingRecentDecisions: input.existingRecentDecisions,
            },
            null,
            2
          ),
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return runMockDecisionEngine(input);

    const parsed: unknown = JSON.parse(raw);
    if (!isValidOutput(parsed)) return runMockDecisionEngine(input);

    return parsed;
  } catch {
    return runMockDecisionEngine(input);
  }
}
