# Phoenix Personal — V2 Architecture

## 1. System Overview

```
User (小佑)
    ↓
Phoenix Web App (Next.js)
    ↓
Database (Creator DNA · Decisions · Drafts · Logs)
    ↓
AI Decision Engine (OpenAI)
    ↓
Instagram Data (Historical posts · Metrics)
    ↓
Daily Scheduler (03:00 cron)
    ↓
Approval Flow (user reviews · confirms)
    ↓
Publishing Layer (scheduled · approved only)
```

Core rule: **Phoenix never publishes without explicit user approval.**

---

## 2. Main Modules

### Web App

Responsible for all user-facing surfaces.

| Page | Purpose |
|---|---|
| `/` | Today's Operating Brief — shows the morning decision summary |
| `/decision` | Decision detail — explains why Phoenix chose today's topic |
| `/carousel` | Carousel preview — slide copy, caption, hashtags |
| `/teach` | Teach Phoenix — onboarding wizard for brand setup |
| `/settings` | Creator DNA — view and manage brand memory |
| `/history` | History — past decisions, results, learnings |
| `/publish` | Publish confirmation — approval and scheduling |

---

### Creator DNA Engine

Stores and updates Phoenix's understanding of the brand.

| Component | Description |
|---|---|
| Brand Voice | Tone, style, and communication principles |
| Content Goals | What "good content" means for this brand |
| Avoid List | Content types Phoenix should reject |
| Design DNA | Visual brand references and aesthetic direction |
| Topic Preferences | Subject areas and themes to prioritize |
| Decision Rules | Explicit rules Phoenix must follow when deciding |

Creator DNA is the foundation of every decision. The more complete it is, the better Phoenix decides.

---

### Instagram Connector

Responsible for reading the creator's Instagram account.

| Task | Description |
|---|---|
| OAuth connection | Connect Instagram account via Meta login |
| Import historical posts | Pull past carousel and single-image posts |
| Import captions | Store past captions for voice analysis |
| Import metrics | Saves, shares, reach, and engagement rates |
| Publishing integration | Prepare publish endpoint for approved content |

> **TODO:** Verify current Meta / Instagram API requirements, review permissions, account type eligibility, and Content Publishing API access before implementation.

---

### Decision Engine

The core intelligence of Phoenix.

**Inputs:**
- Creator DNA (brand voice, goals, rules)
- Instagram historical performance
- Recent published topics (to avoid repetition)
- Market signals (topic trends, timing)
- Content rhythm (cadence gaps, series continuity)

**Outputs:**
- Today's selected topic
- Confidence score (0–100)
- Rejected candidates (with rejection reasons)
- Decision factors (Market Signal, Brand Fit, Share Worthiness, Brand Memory)
- Risk assessment
- Full decision recommendation

---

### Carousel Engine

Generates the complete carousel draft from the selected topic.

**Inputs:**
- Selected topic
- Creator DNA (brand voice, content formula)
- Design DNA (visual style, layout preferences)

**Outputs:**
- 8-slide carousel copy (per-slide text)
- Instagram caption (full)
- Hashtag set
- Export-ready data structure for image rendering

---

### Scheduler

Triggers the daily Phoenix work cycle.

**Trigger:** 03:00 every day (cron job)

**Sequence:**
1. Load Creator DNA for the user
2. Fetch latest Instagram signals
3. Analyze historical content rhythm
4. Generate candidate topics
5. Score each candidate against Creator DNA and market signals
6. Select the single best topic
7. Generate carousel draft
8. Generate caption and hashtags
9. Save today's brief to database
10. Mark status as "waiting for approval"

No publishing happens at this stage. Phoenix waits.

---

### Publishing Layer

Responsible for executing approved publish jobs.

| Action | Description |
|---|---|
| Approval | User confirms in the web app |
| Scheduled publish | Posts at the recommended time |
| Force publish | User overrides timing, publishes immediately |
| Publish status | Tracks pending / published / failed |

**Rule: No approval = no publishing. This is non-negotiable.**

---

## 3. Database Model

Schema design (not yet implemented).

---

### `users`

Purpose: Store creator accounts.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| email | string | Login email |
| name | string | Display name |
| created_at | timestamp | |
| last_active_at | timestamp | |

---

### `creator_dna`

Purpose: Phoenix's memory of the creator's brand.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | → users |
| brand_voice | jsonb | Tone, style descriptors |
| content_goals | jsonb | What success looks like |
| avoid_list | text[] | Content types to reject |
| design_dna | jsonb | Visual references |
| topic_preferences | text[] | Subject areas |
| decision_rules | text[] | Explicit rules |
| updated_at | timestamp | |

---

### `instagram_accounts`

Purpose: Store connected Instagram account metadata.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | → users |
| ig_user_id | string | Instagram account ID |
| access_token | string | Encrypted |
| token_expires_at | timestamp | |
| connected_at | timestamp | |

---

### `instagram_posts`

Purpose: Historical post import for analysis.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | → users |
| ig_post_id | string | Instagram post ID |
| caption | text | Post caption |
| media_type | string | carousel / image / video |
| posted_at | timestamp | |
| saves | int | |
| shares | int | |
| reach | int | |
| engagement_rate | float | |

---

### `daily_decisions`

Purpose: Store Phoenix's daily decision output.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | → users |
| date | date | Decision date |
| selected_topic | string | Today's chosen topic |
| confidence | int | 0–100 |
| grade | string | A+ / A / B etc. |
| status | string | pending / approved / rejected / published |
| created_at | timestamp | Set at 03:00 |
| approved_at | timestamp | When user approved |

---

### `decision_candidates`

Purpose: All topics Phoenix evaluated before choosing.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| decision_id | uuid | → daily_decisions |
| topic | string | Candidate topic |
| selected | boolean | Whether this was chosen |
| market_score | int | |
| brand_score | int | |
| share_score | int | |
| risk | string | Low / Medium / High |
| rejection_reason | text | If not selected |

---

### `carousel_drafts`

Purpose: The full carousel draft for a decision.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| decision_id | uuid | → daily_decisions |
| caption | text | Full Instagram caption |
| hashtags | text[] | |
| slide_count | int | |
| status | string | draft / approved / exported |
| created_at | timestamp | |

---

### `carousel_slides`

Purpose: Individual slide copy within a carousel.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| draft_id | uuid | → carousel_drafts |
| position | int | Slide order (1–8) |
| variant | string | cover / statement / quote etc. |
| lines | text[] | Slide text lines |
| highlight | string | Highlighted line if any |

---

### `publish_jobs`

Purpose: Track publishing status and history.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| decision_id | uuid | → daily_decisions |
| user_id | uuid | → users |
| scheduled_at | timestamp | Intended publish time |
| published_at | timestamp | Actual publish time |
| status | string | pending / published / failed |
| force_published | boolean | Whether user bypassed timing |
| ig_post_id | string | Returned by Instagram after publish |

---

### `learning_logs`

Purpose: Record what Phoenix learned from each decision cycle.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | → users |
| decision_id | uuid | → daily_decisions |
| insight | text | What Phoenix learned |
| rule_updated | string | Which Creator DNA rule was adjusted |
| created_at | timestamp | |

---

## 4. Daily 03:00 Flow

```
03:00 — Scheduler triggers

    ↓ Load Creator DNA
    Pull brand voice, decision rules, avoid list,
    topic preferences for this user.

    ↓ Fetch Instagram signals
    Import recent posts, performance metrics,
    and content rhythm from the last 30 days.

    ↓ Analyze historical rhythm
    Identify topic gaps, series continuity,
    and cadence patterns.

    ↓ Generate candidate topics
    AI generates 4–6 candidate topics
    based on market signals and Creator DNA.

    ↓ Score candidates
    Each candidate is scored on:
    Market Signal · Brand Fit · Share Worthiness · Brand Memory

    ↓ Select one best topic
    The highest-scoring topic that satisfies
    all Decision Rules becomes today's pick.

    ↓ Generate carousel draft
    AI generates 8-slide carousel copy
    aligned with Design DNA and content formula.

    ↓ Generate caption + hashtags
    AI generates Instagram caption and hashtag set
    in the creator's brand voice.

    ↓ Save today's brief
    All outputs saved to database.
    Status: "waiting for approval".

    ↓ Wait for user approval
    Phoenix does nothing else.
    No publishing without explicit confirmation.
```

---

## 5. Approval Flow

```
User opens Phoenix (morning)

    ↓ Reviews Today's Operating Brief
    Topic · Confidence · Operating Brief cards

    ↓ Reviews Decision Detail
    Factors · Rejected candidates · Recommendation · Risk

    ↓ Reviews Carousel
    Slides · Caption · Hashtags · Checklist

    ↓ User chooses:

    [Approve]                [Reject]           [Force Publish]
        ↓                       ↓                     ↓
    Create publish job   Mark rejected         Publish immediately
    Schedule at 20:00    Next cycle picks      Bypass timing
                         a new topic           Log override
```

**Rules:**

| Action | Outcome |
|---|---|
| Approve | Carousel is scheduled for publish at recommended time |
| Reject | Decision is marked rejected. Phoenix tries again next cycle. |
| Force Publish | Published immediately. Risk warning shown first. |
| No action | Nothing is published. Brief remains in pending state. |

---

## 6. API Integration Notes

### OpenAI

- Decision reasoning and topic scoring
- Carousel slide copy generation
- Caption and hashtag generation
- Creator DNA extraction from onboarding input

> Model: GPT-4o recommended for V2.
> All prompts should be server-side only. Never expose API keys to the client.

---

### Instagram / Meta

- OAuth login to connect Instagram account
- Content Publishing API for posting carousels
- Basic Display API or Graph API for reading historical posts and metrics

> **TODO:** Verify current Meta / Instagram API permissions, account type requirements (Creator or Business), Content Publishing API access, and review policy requirements before implementation. API availability and rate limits change frequently.

---

### Database

- Likely Supabase (Postgres + Auth + Row Level Security)
- Alternatively: PlanetScale, Neon, or Railway Postgres

> **TODO:** Confirm database choice based on Vercel deployment region and cost requirements.

---

### Scheduler

- Vercel Cron Jobs (available on Pro plan)
- Alternatively: Inngest, Trigger.dev, or external cron service

> **TODO:** Confirm Vercel plan and cron availability before implementation. Vercel Hobby plan has limitations on cron frequency.

---

## 7. Security Notes

| Rule | Requirement |
|---|---|
| API keys | Never exposed client-side. Server-side env vars only. |
| User tokens | Instagram access tokens must be encrypted at rest. |
| Approval gate | Phoenix must never publish without explicit user approval. |
| AI audit log | Every AI decision must be logged with full reasoning. |
| Instagram revoke | User must be able to disconnect Instagram at any time. |
| Row-level security | Each user can only access their own data. |
| No shared secrets | Each user's Creator DNA and decisions are isolated. |
