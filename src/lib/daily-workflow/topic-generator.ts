// Server-side only. Calls OpenAI to generate daily topic candidates.
// Never import in client components — API key is server-side only.
import "server-only";
import OpenAI from "openai";
import type { MarketSignal } from "./market-signals";

const SLIDE_ROLES = ["HOOK", "PAIN", "TRUTH", "REFRAME", "POV", "METHOD", "ACTION", "CTA"] as const;

export interface DraftSlide {
  slide_no: number;
  slide_role: string;
  title_text: string;
  body_text: string;
}

export interface GeneratedTopicCandidate {
  rank: number;
  title: string;
  angle: string;
  reason: string;
  market_signal: Record<string, unknown>;
  draft_caption: string;
  draft_slides: DraftSlide[];
}

export interface TopicGeneratorInput {
  runDate: string;
  profileKey: string;
  brandRole: string;
  brandAudience: string;
  toneRules: string[];
  contentPillars: string[];
  constraints: string[];
  marketSignals: MarketSignal[];
  count?: number;
}

function buildSystemPrompt(input: TopicGeneratorInput, count: number): string {
  return `你是 Phoenix AI — 小佑老師的品牌內容策略助手。

任務：根據今日市場訊號與品牌 DNA，產出 ${count} 個主題候選。
每個主題必須附帶 8 張動態輪播草稿。

品牌角色：
${input.brandRole}

受眾：
${input.brandAudience}

語氣規則（必須遵守）：
${input.toneRules.map((r) => `- ${r}`).join("\n")}

內容柱：
${input.contentPillars.map((p) => `- ${p}`).join("\n")}

禁止事項：
${input.constraints.map((c) => `- ${c}`).join("\n")}
- 不要太像 AI 寫的
- 不要太像直銷話術
- 不要心靈雞湯
- 不要空泛鼓勵
- 不要誇大收入
- 不要不合規保險承諾

輪播格式（8 張，順序固定）：
1. HOOK — 一句話抓注意力
2. PAIN — 點出觀眾真實痛點
3. TRUTH — 說出大家不敢說的真相
4. REFRAME — 重新框架問題
5. POV — 小佑老師的主管觀點
6. METHOD — 具體方法或思維轉換
7. ACTION — 可立刻做的一件事
8. CTA — 呼籲行動（不要硬推銷）

每張文字規範：
- title_text：8 字以內，有力
- body_text：25 字以內，直接

只回傳 JSON，格式如下（不要加任何說明文字）：
{
  "candidates": [
    {
      "rank": 1,
      "title": "主題標題（12字以內）",
      "angle": "切入角度（30字以內）",
      "reason": "為什麼今天推這個（40字以內）",
      "market_signal_category": "對應哪個 market signal 的 category 值",
      "draft_caption": "IG caption 草稿（含 hashtag，100字以內）",
      "draft_slides": [
        {"slide_no": 1, "slide_role": "HOOK", "title_text": "...", "body_text": "..."},
        {"slide_no": 2, "slide_role": "PAIN", "title_text": "...", "body_text": "..."},
        {"slide_no": 3, "slide_role": "TRUTH", "title_text": "...", "body_text": "..."},
        {"slide_no": 4, "slide_role": "REFRAME", "title_text": "...", "body_text": "..."},
        {"slide_no": 5, "slide_role": "POV", "title_text": "...", "body_text": "..."},
        {"slide_no": 6, "slide_role": "METHOD", "title_text": "...", "body_text": "..."},
        {"slide_no": 7, "slide_role": "ACTION", "title_text": "...", "body_text": "..."},
        {"slide_no": 8, "slide_role": "CTA", "title_text": "...", "body_text": "..."}
      ]
    }
  ]
}`;
}

interface RawSlide {
  slide_no?: unknown;
  slide_role?: unknown;
  title_text?: unknown;
  body_text?: unknown;
}

interface RawCandidate {
  rank?: unknown;
  title?: unknown;
  angle?: unknown;
  reason?: unknown;
  market_signal_category?: unknown;
  draft_caption?: unknown;
  draft_slides?: unknown[];
}

function parseSlide(raw: unknown, idx: number): DraftSlide {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as RawSlide;
  return {
    slide_no: typeof r.slide_no === "number" ? r.slide_no : idx + 1,
    slide_role: typeof r.slide_role === "string" ? r.slide_role : (SLIDE_ROLES[idx] ?? `SLIDE_${idx + 1}`),
    title_text: typeof r.title_text === "string" ? r.title_text : "",
    body_text: typeof r.body_text === "string" ? r.body_text : "",
  };
}

function ensureEightSlides(slides: unknown[]): DraftSlide[] {
  return Array.from({ length: 8 }, (_, i) => parseSlide(slides[i] ?? {}, i));
}

function parseCandidate(
  raw: unknown,
  fallbackRank: number,
  marketSignals: MarketSignal[]
): GeneratedTopicCandidate {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as RawCandidate;
  const category = typeof r.market_signal_category === "string" ? r.market_signal_category : "";
  const signal = marketSignals.find((s) => s.category === category) ?? marketSignals[0];
  return {
    rank: typeof r.rank === "number" ? r.rank : fallbackRank,
    title: typeof r.title === "string" ? r.title : `主題候選 ${fallbackRank}`,
    angle: typeof r.angle === "string" ? r.angle : "",
    reason: typeof r.reason === "string" ? r.reason : "",
    market_signal: {
      category: signal?.category ?? "",
      summary: signal?.summary ?? "",
      relevance: signal?.relevance ?? "",
    },
    draft_caption: typeof r.draft_caption === "string" ? r.draft_caption : "",
    draft_slides: ensureEightSlides(Array.isArray(r.draft_slides) ? r.draft_slides : []),
  };
}

export async function generateDailyTopicCandidates(
  input: TopicGeneratorInput
): Promise<GeneratedTopicCandidate[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured — cannot generate topic candidates");
  }

  const count = input.count ?? 5;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const client = new OpenAI({ apiKey });

  const userMessage = JSON.stringify(
    {
      run_date: input.runDate,
      count_required: count,
      market_signals: input.marketSignals,
    },
    null,
    2
  );

  const response = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(input, count) },
      { role: "user", content: userMessage },
    ],
    temperature: 0.8,
    max_tokens: 6000,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  const obj = (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<string, unknown>;
  const candidates = Array.isArray(obj.candidates) ? obj.candidates : [];
  if (candidates.length === 0) throw new Error("OpenAI returned no candidates");

  return candidates
    .slice(0, count)
    .map((c, i) => parseCandidate(c, i + 1, input.marketSignals));
}
