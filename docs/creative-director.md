# Phoenix Creative Director

The Creative Director is the content generation pipeline that transforms raw topic signals into publish-ready Instagram carousels scored at 9/10 or higher.

---

## Pipeline Stages

```
Topic Intelligence
    ↓
Editorial Thesis
    ↓
Yusheng Voice Filter
    ↓
Narrative Arc Builder
    ↓
Scene-Based Motion Direction
    ↓
Quality Gate
    ↓
Publish-Ready Preview
```

### 1. Topic Intelligence

**File:** `src/lib/decision/topic-intelligence.ts`

Produces 5 topic candidates from brand DNA + market signals. Each candidate includes:

- `editorial_thesis` — the sharp one-sentence argument this topic makes
- `market_tension` — the underlying conflict in the audience right now
- `why_yusheng` — why this topic fits 小佑's insider voice specifically
- `audience_hit` — who feels this the most
- `is_recommended` — whether the Launch Mode system picked this as the strongest

Also produces a `LaunchRecommendation`:
- `recommended_index` — which candidate wins
- `why_this_wins` — specific reason (voice + timing + uniqueness)
- `why_others_lost` — why each rejected candidate lost

### 2. Editorial Thesis

Each carousel has one `editorial_thesis` at the result level — what the carousel pierces, who feels it, what changes for the reader after seeing it.

This is not a description. It is a claim.

Example: `「你以為做保險失去朋友是必然代價，但其實失去的不是友誼，是開口方式——這篇告訴你怎麼分辨。」`

### 3. Yusheng Voice Filter

The system prompt enforces 小佑's voice through two mechanisms:

**Banned language** (zero tolerance):
- 一起成長 · 相信自己 · 拒絕是踏腳石 · 跟隨熱情 · 找到真正的夥伴
- 主動出擊 · 你會更有信心 · 勇敢踏出第一步 · 每一次都是學習
- 讓夢想起飛 · 讓我們一起 · 加油你可以的
- One-word chapter titles (失去朋友？) — titles, not copy
- Generic engagement bait (分享你的故事！)
- Category descriptions (保險業的挑戰)

**Required voice pattern:**
Every `main_copy` must contain a **specific reversal or insight** that names a real situation from the insurance field. Not vague. Not inspirational. The reader should think: 「靠，這說的就是我」

### 4. Narrative Arc Builder

8 slides in a fixed order — no deviation:

| # | Role | Function |
|---|------|----------|
| 1 | `hook` | One line that stops the scroll. Names the exact fear or pain. |
| 2 | `pain` | Specific situation the audience is stuck in. Visceral, concrete. |
| 3 | `misunderstanding` | Dismantle one wrong belief. Be precise. |
| 4 | `reframe` | Yusheng's core reversal. Clear "Not X, actually Y" structure. |
| 5 | `method` | One concrete, insurance-specific approach. |
| 6 | `supervisor_insight` | Insider view a 10-year recruiter knows. |
| 7 | `saveable_summary` | The screenshot-worthy line. Short, standalone, punchy. |
| 8 | `cta` | Ask for a specific, real response — not generic engagement. |

### 5. Scene-Based Motion Direction

Every slide gets a real cinematic human scene. No abstract particles. No floating light points.

**Flat fields on each slide:**

| Field | Purpose |
|-------|---------|
| `scene` | Who is in frame, where, what they are doing, emotional state |
| `motion_background` | What moves — must be scene-based (person, object, light), never abstract |
| `camera` | Specific camera movement (slow push-in, static, drift right) |
| `lighting` | Atmospheric lighting setup (warm amber desk lamp, cold blue window light) |
| `typography_note` | How text feels on this frame (size, color, position) |
| `negative_prompt` | What to exclude from scene generation |
| `animation_prompt` | 40-80 word motion design direction — cinematic and human |

**Banned motion backgrounds:**
光點流動 / 粒子漂浮 / 抽象能量 / 漸層呼吸 — ALL BANNED

**Good motion background example:**
> 手機螢幕微微亮起，LINE 未回覆訊息停在畫面中央，背景咖啡廳人影慢速流動

**Good animation_prompt example:**
> A young insurance agent sits alone at a dark office desk, single desk lamp illuminating their face from the left, they scroll slowly through a contact list on their phone, the background out-of-focus office gradually dims, camera very slowly pushes in from behind their shoulder, motion is slow and deliberate like a film still coming alive.

### 6. Quality Gate

After generation, the system self-assesses across 7 dimensions (1-10 scale):

| Dimension | What It Measures |
|-----------|-----------------|
| `topic_direction_score` | Does the topic pierce a real, specific fear or insight? |
| `narrative_score` | Do 8 slides have clear logical progression with no gaps? |
| `yusheng_voice_score` | Would followers immediately recognize 小佑's voice? |
| `pain_precision_score` | Is the pain named with specific, field-appropriate language? |
| `visual_executability_score` | Are all scenes real, cinematic, and executable? |
| `publish_readiness_score` | Can this go live today with zero editing? |
| `overall_score` | Honest average of all above. |

**Gate rule:** `publish_ready: true` only if ALL individual scores are >= 9.

If any score falls below 9:
- `failing_reasons` lists each failure with a specific reason
- `revised_direction` gives one sentence on what to fix
- The UI shows "NEEDS REVISION" instead of "✓ PUBLISH READY"

The system is instructed to be honest — a 7 that reveals a real problem is more valuable than a fake 10.

### 7. Publish-Ready Preview

The UI renders the carousel at actual Instagram 4:5 ratio (125% padding-top) with:

- Scene-based gradient backgrounds derived from `scene` keywords
- Lighting overlay derived from `lighting` field keywords
- `highlight_words` highlighted in orange (#F97316) within `main_copy`
- Expandable production brief per slide (camera / lighting / typography)
- Full `animation_prompt` visible below each slide card
- `editorial_thesis` displayed above the carousel
- `QualityGateBlock` showing all 7 scores with pass/fail status

---

## Curated Carousels

**File:** `src/lib/decision/curated-carousels.ts`

Known topics bypass OpenAI entirely and return hand-crafted 9/10 carousels:

- `努力了三個月，業績還是零，問題不在你的個性`
- `做保險真的會失去朋友嗎？`

These are deterministic — same input, same output, every time. Source badge shows `CURATED · 9/10` in green.

---

## Launch Mode

When the system has analyzed 5 candidates, it picks one as the recommended launch:

```typescript
interface LaunchRecommendation {
  recommended_index: number;   // 0-indexed
  why_this_wins: string;       // specific reasoning
  why_others_lost: string[];   // one line per rejected candidate
}
```

The UI shows a green "Launch Mode · Recommended Topic" banner above the candidate list, with the recommended candidate card marked "RECOMMENDED".

---

## File Map

| File | Purpose |
|------|---------|
| `src/lib/decision/topic-intelligence.ts` | Topic candidates + launch recommendation |
| `src/lib/decision/carousel-from-candidate.ts` | Carousel schema + system prompt + quality gate |
| `src/lib/decision/curated-carousels.ts` | Hand-crafted 9/10 carousels for known topics |
| `src/app/api/debug/topic-intelligence/route.ts` | Trigger topic intelligence |
| `src/app/api/debug/generate-carousel-from-candidate/route.ts` | Generate carousel from a candidate |
| `src/app/debug/topic-intelligence/page.tsx` | Creative Director UI |

---

## Constraints

- Does not write to `daily_decisions`
- Does not write to `publish_jobs`
- Does not overwrite today's scheduled data
- Does not connect to Instagram
- No OpenAI call if a curated carousel exists for the topic
- Falls back to mock data if `OPENAI_API_KEY` is missing — UI does not break
