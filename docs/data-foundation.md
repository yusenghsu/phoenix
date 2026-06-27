# Phoenix Personal — Data Foundation

## Overview

This document describes Phoenix's V2 data architecture.
The SQL schema lives in `supabase/schema.sql`.
TypeScript types live in `src/lib/data/types.ts`.
Mock data for the V1 prototype lives in `src/lib/data/mock-data.ts`.

---

## Core Entities

### users

One record per Phoenix creator account.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| email | text | Login email, unique |
| name | text | Display name |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### creator_dna

Phoenix's memory of the creator's brand. One record per user.
Updated whenever the creator teaches Phoenix something new.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | → users |
| brand_voice | text | Tone and style principles |
| content_goal | text | What "good content" means for this brand |
| content_formula | text | The repeating structure per piece |
| content_ratio | jsonb | e.g. [{label, pct}, ...] |
| avoid_list | jsonb | Content types to reject |
| design_dna | text | Visual brand direction |
| decision_rules | jsonb | Explicit rules Phoenix follows when deciding |
| topic_preferences | jsonb | Subject areas to prioritize |

---

### instagram_accounts

Connected Instagram account metadata. One record per account.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | → users |
| instagram_user_id | text | Instagram's account ID |
| username | text | @handle |
| account_type | text | "creator" or "business" |
| access_token_encrypted | text | Must be encrypted before storing |
| connected_at | timestamptz | When OAuth was completed |
| revoked_at | timestamptz | Set when user disconnects |

---

### instagram_posts

Historical posts imported for analysis.
Used by the decision engine to understand performance and rhythm.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | → users |
| instagram_account_id | uuid | → instagram_accounts |
| instagram_post_id | text | Instagram's post ID, unique |
| post_type | text | carousel / image / video / reel |
| caption | text | Post caption |
| permalink | text | Instagram URL |
| posted_at | timestamptz | When it was posted |
| metrics | jsonb | {saves, shares, reach, engagement_rate} |

---

### daily_decisions

The core decision Phoenix makes at 03:00 each morning.
One record per user per day.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | → users |
| decision_date | date | e.g. "2026-06-28" |
| selected_topic | text | Today's chosen topic |
| confidence_score | integer | 0–100 |
| main_judgment | text | Phoenix's top-level recommendation |
| decision_factors | jsonb | [{label, score, text}, ...] |
| risk | text | What happens if no action is taken |
| status | text | draft → approved → scheduled → published |

---

### decision_candidates

All topics Phoenix evaluated before choosing one.
Always kept — never deleted — for transparency and learning.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| daily_decision_id | uuid | → daily_decisions |
| topic | text | Candidate topic |
| market_score | integer | 0–100 |
| brand_fit_score | integer | 0–100 |
| share_score | integer | 0–100 |
| risk_level | text | Low / Medium / High |
| rejected_reason | text | Why it was not selected (null if selected) |
| selected | boolean | True for the winning topic only |

---

### carousel_drafts

The full carousel draft for a decision.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| daily_decision_id | uuid | → daily_decisions |
| title | text | Carousel title |
| caption | text | Full Instagram caption |
| hashtags | jsonb | Array of hashtag strings |
| export_status | text | draft / approved / exported |

---

### carousel_slides

Individual slides within a carousel draft.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| carousel_draft_id | uuid | → carousel_drafts |
| slide_number | integer | 1–8 |
| headline | text | Main slide text |
| body | text | Supporting copy |
| design_notes | jsonb | {variant, highlight, ...} |

---

### publish_jobs

Created when a user approves a decision for publishing.
Phoenix never creates this automatically without approval.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| daily_decision_id | uuid | → daily_decisions |
| carousel_draft_id | uuid | → carousel_drafts |
| user_id | uuid | → users |
| status | text | pending / scheduled / published / failed / cancelled |
| scheduled_at | timestamptz | Intended publish time |
| published_at | timestamptz | Actual publish time |
| force_publish | boolean | True if user bypassed the scheduled time |

---

### learning_logs

What Phoenix learned from each decision and result.
Records accumulate over time — never overwritten.

| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | → users |
| daily_decision_id | uuid | → daily_decisions (nullable) |
| learning_type | text | performance / brand_fit / rhythm / topic / decision_rule |
| summary | text | What Phoenix learned |
| signal_data | jsonb | Raw signal data that triggered this learning |

---

## Daily Data Flow

```
03:00 — Scheduler
    ↓
Read creator_dna (brand voice, rules, avoid list)
    ↓
Read instagram_posts (last 30 days of metrics)
    ↓
Generate 4–6 candidate topics
    ↓
Score each candidate → save to decision_candidates
    ↓
Select winner → save to daily_decisions (status: draft)
    ↓
Generate carousel → save to carousel_drafts + carousel_slides
    ↓
Wait for user approval (nothing publishes without it)
    ↓
[User approves] → save publish_jobs (status: pending)
    ↓
[Scheduled time] → publish → update publish_jobs (status: published)
    ↓
[24–48h later] → import post metrics → save learning_logs
```

---

## Important Rules

- **No approval = no publishing.** This is non-negotiable in all cases.
- `decision_candidates` is append-only. Never delete rejected candidates.
- `learning_logs` is append-only. Never overwrite past learnings.
- Instagram access tokens must be encrypted before storing in `instagram_accounts`.
- Each user can only access their own data (Row Level Security required in production).

---

## Supabase Setup Checklist

Before V2 goes live:

- [ ] Create Supabase project
- [ ] Run `supabase/schema.sql` in the SQL editor
- [ ] Enable Row Level Security on all tables
- [ ] Add user-scoped RLS policies (each user sees only their own rows)
- [ ] Configure Supabase Auth (magic link or OAuth)
- [ ] Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel environment variables
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` for server-side operations (never expose client-side)
- [ ] Verify Instagram access tokens are encrypted before writing to `instagram_accounts`
- [ ] Test Row Level Security with two test accounts to confirm data isolation

---

## File Reference

| File | Purpose |
|---|---|
| `supabase/schema.sql` | Full SQL schema with all tables, indexes, and constraints |
| `src/lib/data/types.ts` | TypeScript interfaces matching the schema |
| `src/lib/data/mock-data.ts` | Mock data for V1 prototype (no real database) |
| `docs/architecture.md` | Full V2 system architecture |
| `docs/v2-roadmap.md` | Phase-by-phase build roadmap |
