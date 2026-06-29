// Server-side only. Calls OpenAI to generate daily topic candidates.
// Never import in client components — API key is server-side only.
// Falls back to deterministic demo candidates when OpenAI is unavailable.
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

export interface GenerateResult {
  candidates: GeneratedTopicCandidate[];
  usedFallback: boolean;
  fallbackReason?: string;
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

// ── Deterministic demo candidates ─────────────────────────────────────────────
// Used when OPENAI_API_KEY is missing or OpenAI call fails.
// Content is real enough to validate the full workflow end-to-end.

interface DemoTopic {
  title: string;
  angle: string;
  reason: string;
  draft_caption: string;
  slides: Array<{ role: string; title: string; body: string }>;
}

const DEMO_TOPICS: DemoTopic[] = [
  {
    title: "被拒絕了你怎麼辦",
    angle: "從「怕被拒」到「懂被拒」的心態轉換",
    reason: "保險新人最常在第一次被拒絕後放棄，這個主題直擊痛點",
    draft_caption: "沒有一個業務不怕被拒絕。但頂尖業務和你不一樣的地方就在這裡。\n#保險業務 #新人必看 #小佑老師 #業務成長 #心態調整",
    slides: [
      { role: "HOOK", title: "你怕被拒絕嗎", body: "大部分新人第一次被拒就開始懷疑自己" },
      { role: "PAIN", title: "被拒的感受", body: "那不是在拒絕保險，是在拒絕你這個人" },
      { role: "TRUTH", title: "拒絕是常態", body: "頂尖業務每週至少被拒 10 次，這是事實" },
      { role: "REFRAME", title: "重新定義拒絕", body: "被拒是訓練，不是你不適合這份工作的信號" },
      { role: "POV", title: "主管怎麼看", body: "離職新人九成都是被第一次拒絕嚇跑的" },
      { role: "METHOD", title: "這樣回應", body: "被拒後先謝謝對方，再問是什麼讓他猶豫" },
      { role: "ACTION", title: "今天就做", body: "主動約一個你覺得最可能拒絕你的人" },
      { role: "CTA", title: "你在哪個階段", body: "留言告訴我你最難忘的一次被拒" },
    ],
  },
  {
    title: "你到底在賣什麼",
    angle: "賣保障還是賣保單？一句話的差距決定你能走多遠",
    reason: "很多新人搞不清楚自己賣的是什麼，導致說不清楚價值",
    draft_caption: "你說你在賣保險，但你賣的究竟是什麼？這個問題很多業務答不出來。\n#保險業務 #業務心法 #小佑老師 #職涯 #成長",
    slides: [
      { role: "HOOK", title: "你賣的是什麼", body: "保險業務說「保險」，但客戶聽到的是什麼" },
      { role: "PAIN", title: "說不清楚", body: "產品說明書背很熟，但對方還是聽不懂" },
      { role: "TRUTH", title: "賣的不是商品", body: "你賣的是安心感、是信任、是那個萬一" },
      { role: "REFRAME", title: "換個說法", body: "不是「這個方案」，而是「你那個最擔心的事」" },
      { role: "POV", title: "主管的觀察", body: "業績好的人都能三句話說清楚自己解決什麼問題" },
      { role: "METHOD", title: "這樣說", body: "先說客戶的痛，再說你如何解決，最後說差異" },
      { role: "ACTION", title: "練習一次", body: "用 30 秒說清楚你在做什麼，錄下來聽聽看" },
      { role: "CTA", title: "你怎麼說", body: "留言寫下你的 30 秒自我介紹" },
    ],
  },
  {
    title: "名單打完了怎麼辦",
    angle: "新人最大的恐懼：「我身邊的人都被我問過了」",
    reason: "這是保險新人第三到六個月最常面對的卡關點",
    draft_caption: "朋友名單打完、陌生開口又怕，很多人在這個階段選擇離職。\n#保險新人 #業務技巧 #小佑老師 #招募 #保險業",
    slides: [
      { role: "HOOK", title: "名單打完了", body: "「我身邊的人都被我問過了」你說過這句話嗎" },
      { role: "PAIN", title: "名單的壓力", body: "每逼自己打一通，就少一個朋友" },
      { role: "TRUTH", title: "名單不是問題", body: "你的名單壓力，根本原因是你不知道怎麼開口" },
      { role: "REFRAME", title: "換個方向", body: "與其找「誰可以買」，不如找「誰可以幫你介紹」" },
      { role: "POV", title: "主管的眼光", body: "靠名單撐過一年的人幾乎都靠轉介紹撐到十年" },
      { role: "METHOD", title: "建立系統", body: "每服務好一個客戶，主動問一個轉介紹" },
      { role: "ACTION", title: "今天就做", body: "想三個最信任你的人，今天傳一則關心的訊息" },
      { role: "CTA", title: "你怎麼做", body: "留言你現在用什麼方法開發新客戶" },
    ],
  },
  {
    title: "主管說的話聽懂幾成",
    angle: "從新人到主管，說的是同一件事，但你聽到的不一樣",
    reason: "主管視角的內容能幫新人重新框架工作中的困惑",
    draft_caption: "主管說「你要有熱情」，你聽到「你不夠努力」。這中間差了什麼？\n#保險業務 #主管視角 #小佑老師 #新人 #職場",
    slides: [
      { role: "HOOK", title: "你聽懂了嗎", body: "主管說的每句話，你真的理解意思了嗎" },
      { role: "PAIN", title: "聽話不等於聽懂", body: "點頭說「好」，但出去做的方向完全不同" },
      { role: "TRUTH", title: "主管說的是結果", body: "主管說「積極一點」，講的是你要主動創造機會" },
      { role: "REFRAME", title: "換位思考", body: "把主管說的話翻譯成「他希望我做什麼」" },
      { role: "POV", title: "我帶過很多人", body: "最讓主管頭痛的不是能力差，是聽完就忘" },
      { role: "METHOD", title: "這樣做", body: "每次主管給建議，複述一遍，問「這樣理解對嗎」" },
      { role: "ACTION", title: "問一個問題", body: "找主管問一個你之前聽不懂但沒敢問的事" },
      { role: "CTA", title: "有這樣的困惑嗎", body: "留言你最難理解的一句主管的話" },
    ],
  },
  {
    title: "轉職到保險業的真相",
    angle: "轉職者視角：期待與現實的落差，以及真正值得留下來的理由",
    reason: "轉職族群是保險業重要招募對象，這個主題能精準觸及",
    draft_caption: "轉職來保險業，第一個月你以為自己做錯決定了。但很多人撐過了。\n#轉職 #保險業 #小佑老師 #職涯選擇 #業務人生",
    slides: [
      { role: "HOOK", title: "轉職的第一個月", body: "你以為你做錯決定了，這感覺幾乎每個人都有" },
      { role: "PAIN", title: "現實與期待的差", body: "沒人告訴你第一年有多難，也沒人說為何值得" },
      { role: "TRUTH", title: "沒有穩定這件事", body: "所有看起來「穩定」的工作，風險都只是被轉移了" },
      { role: "REFRAME", title: "轉職是一種投資", body: "前三年是交學費，之後是收息的開始" },
      { role: "POV", title: "我看過很多轉職者", body: "留下來的人都是在最痛苦的那個月決定不走的" },
      { role: "METHOD", title: "這樣撐過去", body: "訂一個 90 天的目標，專注在學習不是業績" },
      { role: "ACTION", title: "今天問自己", body: "寫下三個你選擇保險業的真實理由" },
      { role: "CTA", title: "你在哪個階段", body: "轉職幾個月了？留言讓我知道" },
    ],
  },
];

export function generateFallbackDemoCandidates(
  marketSignals: MarketSignal[],
  count: number = 5
): GeneratedTopicCandidate[] {
  return DEMO_TOPICS.slice(0, count).map((t, i) => {
    const signal = marketSignals[i % Math.max(marketSignals.length, 1)] ?? {
      category: "demo",
      summary: "Demo market signal",
      relevance: "Demo",
    };
    return {
      rank: i + 1,
      title: t.title,
      angle: t.angle,
      reason: t.reason,
      market_signal: {
        category: signal.category,
        summary: signal.summary,
        relevance: signal.relevance,
      },
      draft_caption: t.draft_caption,
      draft_slides: t.slides.map((s, si) => ({
        slide_no: si + 1,
        slide_role: s.role,
        title_text: s.title,
        body_text: s.body,
      })),
    };
  });
}

// ── OpenAI prompt ─────────────────────────────────────────────────────────────

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

// ── Parsing helpers ───────────────────────────────────────────────────────────

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

// ── Main entry point ──────────────────────────────────────────────────────────

export async function generateDailyTopicCandidates(
  input: TopicGeneratorInput
): Promise<GenerateResult> {
  const count = input.count ?? 5;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      candidates: generateFallbackDemoCandidates(input.marketSignals, count),
      usedFallback: true,
      fallbackReason: "OPENAI_API_KEY not configured",
    };
  }

  try {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(input, count) },
        {
          role: "user",
          content: JSON.stringify(
            { run_date: input.runDate, count_required: count, market_signals: input.marketSignals },
            null,
            2
          ),
        },
      ],
      temperature: 0.8,
      max_tokens: 6000,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAI returned empty response");

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const rawCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    if (rawCandidates.length === 0) throw new Error("OpenAI returned no candidates");

    return {
      candidates: rawCandidates
        .slice(0, count)
        .map((c, i) => parseCandidate(c, i + 1, input.marketSignals)),
      usedFallback: false,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      candidates: generateFallbackDemoCandidates(input.marketSignals, count),
      usedFallback: true,
      fallbackReason: `OpenAI failed: ${reason}`,
    };
  }
}
