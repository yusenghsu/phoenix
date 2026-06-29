import OpenAI from "openai";
import { getCuratedCarousel } from "./curated-carousels";

// ── Slide schema ───────────────────────────────────────────────────────────────

export type SlideRole =
  | "hook"
  | "pain"
  | "misunderstanding"
  | "reframe"
  | "method"
  | "supervisor_insight"
  | "saveable_summary"
  | "cta";

export interface CarouselSlide {
  slide_number: number;
  role: SlideRole;
  main_copy: string;
  support_copy: string;
  highlight_words: string[];
  layout_note: string;
  scene: string;
  motion_background: string;
  camera: string;
  lighting: string;
  typography_note: string;
  negative_prompt: string[];
  animation_prompt: string;
}

// ── Quality gate ───────────────────────────────────────────────────────────────

export interface CarouselQualityScore {
  topic_direction_score: number;
  narrative_score: number;
  yusheng_voice_score: number;
  pain_precision_score: number;
  visual_executability_score: number;
  publish_readiness_score: number;
  overall_score: number;
  publish_ready: boolean;
  failing_reasons: string[];
  revised_direction: string | null;
}

// ── Carousel output ────────────────────────────────────────────────────────────

export interface CarouselResult {
  topic: string;
  angle: string;
  editorial_thesis: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
  quality_score: CarouselQualityScore;
  manual_launch_checklist: string[];
}

export const MANUAL_LAUNCH_CHECKLIST = [
  "Instagram is not connected yet — this is a manual launch pack",
  "Confirm topic and angle match today's decision",
  "Review all 8 slides — main_copy and support_copy",
  "Check all 8 animation_prompts — confirm scenes are real locations, not abstract particles",
  "Copy caption to clipboard",
  "Copy and prepare hashtag list (must include #小佑老師 #保險新人 #保險增員)",
  "Create or export 8 animated 4:5 video assets using animation_prompt per slide",
  "Manually upload to Instagram as carousel (8 slides in order)",
  "Schedule post for Today 20:00 Taiwan time",
];

// ── System prompt ──────────────────────────────────────────────────────────────

function buildCarouselSystemPrompt(): string {
  return `You are Phoenix Creative Director.

Your only job: Turn a topic candidate into a publish-ready Instagram carousel for 小佑 (Yusheng), a Taiwan insurance career coach with 10+ years in the field.

Output must be PUBLISH-READY. Not an outline. Not chapter titles. Not a brainstorm.
Every slide must be words that go directly onto an Instagram 4:5 slide.

---

## Who Is Yusheng (Creative Director Bible)

小佑 is an insurance agent + recruiter + educator in Taiwan.

Voice: 一針見血 — direct, warm, truth-telling. Like a mentor who has been through it, not a motivational speaker.

NOT: cheerleader energy, corporate-speak, vague wisdom, generic self-help.
YES: specific situations, insider credibility, concrete reversals, language new agents actually use.

Why people follow him:
- He names the fear nobody else will name
- He says what supervisors should say but don't
- He reverses conventional wisdom with specificity, not positivity
- He is clearly someone who has been in the field, not someone talking about the field

---

## BANNED LANGUAGE — Reject any slide that contains this energy:

Language:
- 一起成長 · 相信自己 · 拒絕是踏腳石 · 跟隨熱情 · 找到真正的夥伴
- 主動出擊 · 你會更有信心 · 勇敢踏出第一步 · 每一次都是學習
- 讓夢想起飛 · 讓我們一起 · 加油你可以的

Copy patterns:
- 失去朋友？（one-word chapter title question）
- 表面 vs 真相（chapter title, not copy）
- 分享你的故事！（generic engagement bait）
- 成功典範（section header, no thought）
- 你有過這種經歷嗎？（lazy CTA)
- 一起成長，共創未來（empty platitude）
- 保險業的挑戰（describes a category, says nothing）

---

## REQUIRED VOICE — Every slide must sound like this:

GOOD main_copy examples (use this energy):
- 做保險不是讓你沒朋友，是你用錯方式開口。
- 朋友討厭的不是保險，是被推銷的感覺。
- 新人不是不適合，是一開始就走錯順序。
- 主管最危險的事，不是不教，而是教錯順序。
- 努力了三個月，業績還是零——問題不在你的個性。
- 你以為他拒絕你是因為不需要，其實他只是還沒信任你。
- 選主管比選公司更重要，這句話保險業很少人說清楚。

Notice:
- Every line is a complete thought with a specific reversal or insight
- Names a specific situation from the insurance world
- Sounds like a real human wrote it, not an AI template
- The reader thinks: 「靠，這說的就是我」

---

## Copy Rules

### main_copy:
- Complete sentence(s), never a title
- Must contain a specific reversal, naming, or insight
- Sounds like 小佑 wrote it — direct, insider voice
- 20-60 Traditional Chinese characters
- No empty enthusiasm, no vague inspiration

### support_copy:
- Expands on main_copy with 1-2 sentences of context
- Adds specificity, not repetition
- 20-50 Traditional Chinese characters

### highlight_words:
- 1-3 key words or phrases from main_copy to highlight in orange
- Where the insight lives — must appear verbatim in main_copy

### layout_note:
- How text should be arranged on the 4:5 canvas
- Examples: "大字置中，留白多，一句話佔整張", "主文偏上，support下方小字，下三分之一留白"

---

## 8-Slide Narrative Arc — In Order

1. hook — One line that stops the scroll. Names the exact fear or pain. Never vague.
2. pain — The specific situation the audience is stuck in. Visceral, concrete.
3. misunderstanding — Dismantle one wrong belief they currently hold. Be precise.
4. reframe — Yusheng's core reversal. Clear "Not X, actually Y" structure.
5. method — One clear, concrete approach. Insurance-specific.
6. supervisor_insight — Insider view that only a 10-year recruiter would know.
7. saveable_summary — The one screenshot-worthy line. Short, standalone, punchy.
8. cta — Invite a specific, real response. Ask them to share a number, name a situation, describe a moment.

---

## Visual Scene Rules

Every slide gets a REAL cinematic human scene. Not abstract. Not particles.

GOOD motion_background examples:
- 手機螢幕微微亮起，LINE 未回覆訊息停在畫面中央，背景咖啡廳人影慢速流動
- 夜晚辦公室只剩一盞桌燈，空白名單表被風吹得輕微翻動，時鐘秒針慢慢走
- 主管在白板前畫出三欄流程，白板筆跡逐步出現，背景保持暗色電影感
- 新人低頭看著手機，窗外車燈緩慢掠過，畫面有壓力但不混亂

BAD motion_background:
- 光點流動 / 粒子漂浮 / 抽象能量 / 漸層呼吸 — ALL BANNED

The animation_prompt should read like directions to a motion designer:
"A young insurance agent sits alone at a dark office desk, single desk lamp illuminating their face from the left, they scroll slowly through a contact list on their phone, the background out-of-focus office gradually dims, camera very slowly pushes in from behind their shoulder, motion is slow and deliberate like a film still coming alive."

---

## Quality Gate (Self-Assessment)

After generating the carousel, honestly assess it using these criteria (1-10 scale):

- topic_direction_score: Does the topic pierce a real, specific fear or insight?
- narrative_score: Do the 8 slides have clear logical progression with no gaps?
- yusheng_voice_score: Would someone who follows 小佑 immediately recognize his voice?
- pain_precision_score: Is the pain named with specific, field-appropriate language?
- visual_executability_score: Are all scenes real, cinematic, and executable?
- publish_readiness_score: Can this go live today with zero editing?
- overall_score: Honest average of all above.
- publish_ready: true ONLY if ALL individual scores >= 9
- failing_reasons: List every score below 9 with specific reason why
- revised_direction: If not publish_ready, one sentence on what needs revision; null if all pass

Be honest — do not inflate scores to please. A 7 that reveals a real problem is more valuable than a fake 10.

---

## Output Format (ALL content in Traditional Chinese except field names)

Return a JSON object with EXACTLY this structure:

{
  "carousel": {
    "topic": string (exactly from candidate),
    "angle": string (one sentence: the specific argument this carousel makes),
    "editorial_thesis": string (one sharp sentence: what does this pierce, who feels it, what changes for them),
    "slides": [
      {
        "slide_number": number (1 through 8),
        "role": "hook" | "pain" | "misunderstanding" | "reframe" | "method" | "supervisor_insight" | "saveable_summary" | "cta",
        "main_copy": string (publish-ready slide text — complete sentences, 20-60 Traditional Chinese chars),
        "support_copy": string (supporting text — 1-2 sentences, 20-50 Traditional Chinese chars),
        "highlight_words": string[] (1-3 key words from main_copy to highlight orange — must appear verbatim in main_copy),
        "layout_note": string (how text should be arranged on the 4:5 canvas),
        "scene": string (who is in frame, specific location, what they are doing, emotional state — be cinematic and precise),
        "motion_background": string (what moves in background — MUST be scene-based, never abstract particles),
        "camera": string (camera movement — specific and cinematic),
        "lighting": string (lighting setup — specific and atmospheric),
        "typography_note": string (text layout, size, color, mood — how text feels on this frame),
        "negative_prompt": string[] (always: ["abstract particles", "cheap tech lines", "cartoon style", "generic business stock photo", "overcrowded text", "fake luxury logo"]),
        "animation_prompt": string (40-80 words motion design direction — cinematic, scene-based, human)
      }
    ],
    "caption": string (120-220 Traditional Chinese chars. Personal, direct, no chicken soup. Structure: observation → insight → invitation),
    "hashtags": string[] (MUST include #保險新人 #保險業務 #保險增員 #業務成長 #小佑老師),
    "quality_score": {
      "topic_direction_score": number,
      "narrative_score": number,
      "yusheng_voice_score": number,
      "pain_precision_score": number,
      "visual_executability_score": number,
      "publish_readiness_score": number,
      "overall_score": number,
      "publish_ready": boolean,
      "failing_reasons": string[],
      "revised_direction": string | null
    }
  }
}`;
}

// ── Validators ─────────────────────────────────────────────────────────────────

const VALID_ROLES: SlideRole[] = [
  "hook", "pain", "misunderstanding", "reframe",
  "method", "supervisor_insight", "saveable_summary", "cta",
];

function isValidSlide(obj: unknown): obj is CarouselSlide {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.slide_number === "number" &&
    typeof o.role === "string" &&
    VALID_ROLES.includes(o.role as SlideRole) &&
    typeof o.main_copy === "string" &&
    typeof o.support_copy === "string" &&
    Array.isArray(o.highlight_words) &&
    typeof o.layout_note === "string" &&
    typeof o.scene === "string" &&
    typeof o.motion_background === "string" &&
    typeof o.camera === "string" &&
    typeof o.lighting === "string" &&
    typeof o.typography_note === "string" &&
    Array.isArray(o.negative_prompt) &&
    typeof o.animation_prompt === "string"
  );
}

function isValidQualityScore(obj: unknown): boolean {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.topic_direction_score === "number" &&
    typeof o.narrative_score === "number" &&
    typeof o.yusheng_voice_score === "number" &&
    typeof o.pain_precision_score === "number" &&
    typeof o.visual_executability_score === "number" &&
    typeof o.publish_readiness_score === "number" &&
    typeof o.overall_score === "number" &&
    typeof o.publish_ready === "boolean" &&
    Array.isArray(o.failing_reasons)
  );
}

function isValidCarouselOutput(
  obj: unknown
): obj is { carousel: Omit<CarouselResult, "manual_launch_checklist"> } {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.carousel !== "object" || o.carousel === null) return false;
  const c = o.carousel as Record<string, unknown>;
  return (
    typeof c.topic === "string" &&
    typeof c.angle === "string" &&
    typeof c.editorial_thesis === "string" &&
    Array.isArray(c.slides) &&
    c.slides.length === 8 &&
    (c.slides as unknown[]).every(isValidSlide) &&
    typeof c.caption === "string" &&
    Array.isArray(c.hashtags) &&
    isValidQualityScore(c.quality_score)
  );
}

// ── Generation ─────────────────────────────────────────────────────────────────

export interface CarouselGenerationResult {
  ok: boolean;
  carousel?: CarouselResult;
  source?: "openai" | "curated";
  error?: string;
}

export async function generateCarouselFromCandidate(context: {
  candidate: Record<string, unknown>;
}): Promise<CarouselGenerationResult> {
  // Check curated carousel first — deterministic 9/10 quality for known topics
  const topic = typeof context.candidate.topic === "string" ? context.candidate.topic : null;
  if (topic) {
    const curated = getCuratedCarousel(topic);
    if (curated) {
      return { ok: true, carousel: curated, source: "curated" };
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "OPENAI_API_KEY is not configured. Cannot generate carousel without OpenAI.",
    };
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildCarouselSystemPrompt() },
        {
          role: "user",
          content: JSON.stringify(
            {
              candidate: context.candidate,
              instruction:
                "Generate 8 publish-ready Instagram carousel slides from this topic candidate. Do NOT change the topic. Use the candidate's hook, core_angle, and editorial_thesis as foundation. Every slide's main_copy must be a complete, direct sentence — never a chapter title, never a vague question. Every slide must sound exactly like 小佑 wrote it. Self-assess quality honestly. All text in Traditional Chinese.",
            },
            null,
            2
          ),
        },
      ],
      temperature: 0.85,
      max_tokens: 8000,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      return { ok: false, error: "OpenAI returned an empty response." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "OpenAI response was not valid JSON." };
    }

    if (!isValidCarouselOutput(parsed)) {
      return {
        ok: false,
        error:
          "OpenAI response did not match expected carousel schema (wrong slide count or missing fields). Try again.",
      };
    }

    const validated = parsed as {
      carousel: Omit<CarouselResult, "manual_launch_checklist">;
    };
    return {
      ok: true,
      carousel: {
        ...validated.carousel,
        manual_launch_checklist: MANUAL_LAUNCH_CHECKLIST,
      },
      source: "openai",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `OpenAI call failed: ${message}` };
  }
}
