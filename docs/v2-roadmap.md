# Phoenix Personal — V2 Roadmap

## Current State: V1

Phoenix V1 is a deployed clickable prototype.
All data is static mock data. No real connections.

Live: https://phoenix-five-beta.vercel.app

V2 turns the prototype into a real operating system.

---

## Core Principle

**Decision > Generation**

Phoenix is not a prompt-based content generator.
Phoenix is an AI brand decision system that wakes up before the creator,
makes the call, and waits for approval.

---

## V2 Goal

Every morning, 小佑 opens Phoenix and sees:

- The topic Phoenix selected — with full reasoning
- The carousel draft — ready to preview
- The caption and hashtags — ready to copy
- A one-tap approval to publish

Phoenix handles everything before 小佑 wakes up.

---

## Phase 1 — Data Foundation

**Goal:** Build the real data layer that powers every other phase.

| Task | Description |
|---|---|
| Choose database | Supabase (recommended) or Postgres |
| Create schema | users, creator_dna, daily_decisions, carousel_drafts, learning_logs |
| Auth setup | Email login or magic link via Supabase Auth |
| Store Creator DNA | Persist brand voice, rules, avoid list, design preferences |
| Store daily decisions | Topic, confidence, candidates, status |
| Store carousel drafts | Slides, caption, hashtags |
| Store learning logs | What Phoenix learned from each cycle |

**Deliverable:** Database running. Creator DNA can be saved and retrieved.

---

## Phase 2 — AI Decision Engine

**Goal:** Phoenix can make a real content decision using Creator DNA.

| Task | Description |
|---|---|
| Build decision prompt | GPT-4o prompt using Creator DNA + recent history |
| Score candidate topics | 4–6 candidates, each scored on 4 factors |
| Generate rejection reasons | Why each non-selected topic was rejected |
| Save full reasoning | Store decision factors, scores, recommendation |
| Surface in UI | Connect existing Decision page to real data |

**Deliverable:** Phoenix picks today's topic using real AI logic, not mock data.

---

## Phase 3 — Instagram Read Integration

**Goal:** Phoenix can read 小佑's historical Instagram posts and performance.

| Task | Description |
|---|---|
| Instagram OAuth | Meta login flow, store access token encrypted |
| Import posts | Pull recent carousels and images |
| Import captions | For brand voice analysis |
| Import metrics | Saves, shares, reach, engagement rate |
| Analyze performance | Feed historical data into decision engine |

> **Note:** Verify current Instagram / Meta API requirements, account type eligibility (Creator or Business), and Content Publishing API access before starting this phase. Requirements change.

**Deliverable:** Phoenix understands what worked and what didn't. Decisions improve.

---

## Phase 4 — Daily Scheduler

**Goal:** Phoenix runs automatically at 03:00 every day. No manual trigger needed.

| Task | Description |
|---|---|
| Scheduled job | Vercel Cron or Inngest trigger at 03:00 |
| Daily decision creation | Run decision engine, save output |
| Carousel draft generation | Generate 8-slide copy, caption, hashtags |
| Failure handling | Log errors, retry logic, fallback state |
| Notification placeholder | Prepare for push / email alert to user |

> **Note:** Confirm Vercel plan supports cron jobs at required frequency before implementation.

**Deliverable:** 小佑 wakes up to a completed brief every morning without any manual trigger.

---

## Phase 5 — Carousel Export

**Goal:** Phoenix produces real image assets ready for Instagram upload.

| Task | Description |
|---|---|
| Generate slide data | Structured per-slide content from carousel engine |
| Render image export | Convert slide data to 1080×1080 PNG per slide |
| Maintain Design DNA | Apply brand colors, typography, layout rules |
| Export package | Bundle 8 images for download or direct upload |

**Deliverable:** Carousel can be downloaded or passed directly to the publishing layer.

---

## Phase 6 — Approval + Publishing

**Goal:** 小佑 can approve and publish with one tap. Phoenix never publishes without it.

| Task | Description |
|---|---|
| Approval state | Track pending / approved / rejected per decision |
| Publish job creation | On approval, create a scheduled publish job |
| Scheduled publish | Post carousel at recommended time via Meta API |
| Force publish | Allow immediate publish with risk acknowledgment |
| Publish history | Track every publish: time, status, post ID |

**Rule: No approval = no publishing. This is non-negotiable in all cases.**

> **Note:** Instagram Content Publishing API access and account type requirements must be verified before implementation.

**Deliverable:** Full approval-to-publish flow is live. 小佑 taps once and it goes out.

---

## Phase 7 — Learning Loop

**Goal:** Phoenix gets smarter with every post. The longer it runs, the better it decides.

| Task | Description |
|---|---|
| Import post results | Fetch metrics 24–48h after publishing |
| Update learning logs | Record what worked and what didn't |
| Refine Creator DNA | Adjust topic preferences and decision rules |
| Adjust topic rhythm | Learn optimal cadence, series continuity |
| Improve decision rules | Evolve rules based on actual performance data |

**Deliverable:** Phoenix's decisions become measurably better over time. Creator DNA grows with the brand.

---

## Phase Dependencies

```
Phase 1 (Data)
    ↓
Phase 2 (AI Decision)     ← requires Phase 1
    ↓
Phase 3 (Instagram Read)  ← requires Phase 1
    ↓
Phase 4 (Scheduler)       ← requires Phase 2 + 3
    ↓
Phase 5 (Carousel Export) ← requires Phase 2
    ↓
Phase 6 (Publishing)      ← requires Phase 3 + 4 + 5
    ↓
Phase 7 (Learning Loop)   ← requires Phase 6
```

---

## What does NOT change in V2

| Item | Status |
|---|---|
| UI design | No major redesign |
| Page structure | Same routes, same flow |
| Core principle | Decision > Generation |
| Approval requirement | Phoenix never publishes without approval |
| Brand personality | Same warm, minimal, premium feeling |

V2 connects the real data to the V1 interface. The experience stays the same. The intelligence becomes real.

---

## Open Questions Before Starting

1. **Database:** Supabase or alternative? Confirm before Phase 1.
2. **Auth:** Magic link, Google OAuth, or email/password?
3. **Instagram API:** Verify current Meta API eligibility, permissions, and review process timeline.
4. **Vercel plan:** Confirm cron job availability for Phase 4.
5. **Image rendering:** Puppeteer, canvas, or design tool API for carousel export?
6. **Multi-user:** V2 supports one creator (小佑) only, or multi-creator from the start?
