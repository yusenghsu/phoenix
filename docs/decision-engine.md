# Phoenix Decision Engine

## Purpose

Decision Engine decides what Phoenix should recommend today.

It does not only generate content.
It evaluates what should be published.

---

## Current Version

Issue #024 uses a mock decision engine (`src/lib/decision/mock-engine.ts`).

---

## Architecture

```
/api/cron/daily-decision
  └── runDailyDecision(client)         [src/lib/data/daily-decision.ts]
        ├── load user + creator DNA    [Supabase]
        ├── check existing decision    [Supabase]
        ├── runMockDecisionEngine()    [src/lib/decision/mock-engine.ts]
        └── save result to Supabase    [daily_decisions, candidates, carousel, publish_job, learning_log]
```

---

## Inputs

| Field | Source |
|---|---|
| user | Supabase users table |
| creatorDNA | Supabase creator_dna table |
| recentPosts | Supabase instagram_posts (not yet wired) |
| todayDate | Server time |
| existingRecentDecisions | Supabase daily_decisions (not yet wired) |

---

## Outputs

| Field | Description |
|---|---|
| selectedTopic | The one topic Phoenix recommends today |
| confidenceScore | 0–100 overall confidence |
| mainJudgment | Why Phoenix made this decision |
| decisionFactors | Scored breakdown (Market Signal, DNA Fit, Brand Memory, Share Worthiness) |
| risk | What happens if the decision is not acted on |
| candidates | All topics evaluated, including rejected ones |
| carouselDraft | Title, caption, hashtags |
| carouselSlides | 8 slide drafts |
| learningLog | Summary of what Phoenix learned from this decision |

---

## Files

| File | Role |
|---|---|
| `src/lib/decision/types.ts` | TypeScript types for engine I/O |
| `src/lib/decision/mock-engine.ts` | Mock engine — returns fixed decision |
| `src/lib/decision/index.ts` | Public exports |
| `src/lib/data/daily-decision.ts` | Orchestrator — loads data, calls engine, saves to Supabase |

---

## Future OpenAI Version

The mock engine will later be replaced by an OpenAI-backed engine.

To replace: implement a new function with the same signature —

```typescript
function runOpenAIDecisionEngine(input: DecisionEngineInput): Promise<DecisionEngineOutput>
```

— and swap it in `daily-decision.ts`. No other file needs to change.

Future responsibilities:
- Generate candidate topics from signals
- Score candidates against Creator DNA
- Explain reasoning per factor
- Write carousel copy
- Write caption
- Record learning signal

---

## Safety Rules

- Phoenix recommends only one topic per day.
- Phoenix never publishes without approval.
- Phoenix can reject high-traffic topics if they do not fit Creator DNA.
- Every selected topic must store rejected candidates.
- If today's decision already exists, no duplicate is created.
