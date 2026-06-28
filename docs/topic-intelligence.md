# Phoenix Topic Intelligence System

## Core Principle

Phoenix does not require the user to provide a topic.

The user should never need to think "what should I post today?" — that is Phoenix's job.

Phoenix generates candidate topics by cross-referencing:
1. Creator DNA (brand voice, audience, positioning)
2. Past winning themes (known resonance patterns)
3. Market resonance model (strategy-based, not live web)
4. Brand positioning goals (build authority, not just traffic)

The user reviews candidates and selects. **Phoenix decides first. Human approves.**

---

## How It Works

```
Creator DNA
+ Past Winning Themes          →  Phoenix Topic Intelligence Engine
+ Market Resonance Model                      ↓
+ Brand Positioning                  5 Topic Candidates
                                              ↓
                                    Creator Reviews & Selects
                                              ↓
                                    Generate Carousel
```

---

## Data Sources

### 1. Creator DNA (from Supabase `creator_dna` table)
- Brand voice, content goal, avoid list, decision rules
- Loaded from live database when available; falls back to embedded profile

### 2. Past Winning Themes (embedded in system prompt)
Known high-resonance themes for Yusheng's audience:
- 做保險會沒朋友嗎
- 新人賺不到錢
- 選主管的關鍵
- 新人三步驟
- 保險業務不敢說的事
- 亂槍打鳥
- 淘汰
- 努力但沒結果
- 被誤會的保險業
- 主管怎麼帶新人

### 3. Market Resonance Model

**Source: `strategy_model` — NOT live web data.**

Current dominant tensions in the target audience (18–35 insurance space in Taiwan):
- Young people resist insurance sales — stigma of bothering friends
- Newcomers fear: no prospect list, losing friends, no income in year 1
- Supervisor quality gap — coaches vs. headcount-driven managers
- Career change anxiety — want income but fear being seen as pushy
- High-pressure culture backlash
- Want to prove themselves but lack a repeatable method
- Gap between recruiter promises and year-1 reality
- Identity conflict: salesperson or professional?

**Future work**: Live market data integration (social signals, search trends) is a planned future feature. Until then, all market signals come from the strategy model.

### 4. Brand Positioning
Phoenix prioritizes topics that build Yusheng's brand as:
- A teacher who knows the real situation on the ground
- A coach who says what nobody else dares to
- The voice in insurance that tells the truth
- Not just chasing traffic — building lasting authority

---

## Candidate Output Schema

Each of the 5 candidates includes:

```typescript
{
  topic: string;               // punchy Traditional Chinese title
  hook: string;                // scroll-stopping opening line
  core_angle: string;          // the specific argument in this carousel
  why_for_yusheng: string;     // brand authority this builds
  why_market_resonates: string; // which market tension this addresses
  target_audience: string[];   // 2-4 specific audience segments
  content_type: "carousel";
  emotional_trigger: string;   // primary emotion activated
  shareability_score: number;  // 0-100
  saveability_score: number;   // 0-100
  brand_fit_score: number;     // 0-100
  risk_level: "low" | "medium" | "high";
  risk_reason: string;
  visual_scene_direction: {
    overall_style: string;     // e.g. "電影感人物場景"
    scene_type: string;        // e.g. "室內夜景"
    people_scene: string;      // realistic human situation description
    motion_background: string; // cinematic background movement
    not_allowed: string[];     // always excludes abstract particles
  };
}
```

---

## Visual Scene Direction

Every candidate includes a cinematic scene direction. Rules:
- **Real human situations** — not abstract light particles
- **Cinematic lighting** — dramatic but natural
- **Background serves content** — not generic stock photo
- **Slow motion or subtle movement** — not cheap animation
- Each topic has a different scene to avoid visual monotony

What is never allowed:
- 抽象光粒子 (abstract light particles)
- 科技線條 (generic tech lines)
- 制式圖庫笑臉 (stock photo fake smiles)
- Canva template look

---

## Internal Page

**URL**: `/debug/topic-intelligence`

Access: Requires `INTERNAL_DEBUG_SECRET` header (via `checkInternalDebugAuth`).

Not linked from main navigation.

### API Endpoint

```
POST /api/debug/topic-intelligence
Header: x-internal-debug-secret: <INTERNAL_DEBUG_SECRET>
```

Response:
```json
{
  "ok": true,
  "source": "openai" | "strategy_model_mock",
  "market_source": "strategy_model",
  "writes": false,
  "analysis_note": "...",
  "candidates": [...]
}
```

Returns `401 Unauthorized` without valid secret in production.

---

## Provider Behavior

| `OPENAI_API_KEY` | `DECISION_ENGINE_PROVIDER` | Behavior |
|---|---|---|
| Set | any | Calls OpenAI, uses strategy model prompt |
| Missing | any | Returns built-in mock candidates (still insurance-specific) |

Mock fallback candidates are real, Yusheng-specific examples — not generic placeholder data.

---

## What This Is NOT

- Not a live social media trend scraper
- Not a general content idea generator
- Not a topic-input-from-user system
- Not connected to Instagram or any external API

---

## Future Work

- [ ] Live market signals (social trends, search volume)
- [ ] "Generate Carousel From This Topic" button (Issue #049+)
- [ ] Save selected topic to `daily_decisions` as draft
- [ ] Historical candidate tracking to avoid repeating recent topics
