# Supabase Read Connection

## Purpose

Issue #016 connects Phoenix UI to Supabase read queries while keeping mock fallback.

All pages fall back to existing mock data when Supabase is not configured.
No page can break or go blank due to missing environment variables.

---

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |

Copy `.env.example` to `.env.local` and fill in values to enable Supabase reads.

---

## Security Notes

- Never commit `.env.local`
- Never expose the service role key client-side
- Do not use `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- Server-side read only via `src/lib/supabase/server.ts` (uses `server-only`)
- Client components fetch from `/api/data` — they never hold the key
- Mock fallback remains available at all times

---

## Architecture

```
Client page (useEffect)
    ↓ fetch /api/data?type=...
API Route Handler (server-side)
    ↓ calls query functions
src/lib/data/queries.ts (server-only)
    ↓ creates Supabase client if env set
src/lib/supabase/server.ts (server-only)
    ↓ if no env → returns mock-data.ts
src/lib/data/mock-data.ts
```

---

## Connected Pages

| Page | Data type | Fields pulled |
|---|---|---|
| `/` | `today` | topic, score, grade, mainJudgment, whyToday |
| `/decision` | `decision` | topic, confidence, factors, rejected, matrix, risk |
| `/carousel` | `carousel` | captionBrief, captionFull, hashtags |
| `/settings` | `settings` | avoidList, decisionRules, contentRatio |
| `/history` | `history` | todayTopic, learnings |
| `/publish` | `publish` | scheduledLabel |

---

## API Route

`GET /api/data?type=<type>`

Returns JSON for each page type. Falls back to mock data internally if Supabase is unavailable.

---

## Fallback Behavior

| Condition | Result |
|---|---|
| `SUPABASE_URL` missing | Returns mock data |
| `SUPABASE_SERVICE_ROLE_KEY` missing | Returns mock data |
| Query returns empty | Returns mock data |
| Query throws error | Returns mock data |
| Fetch fails in browser | Page keeps hardcoded constants |

---

## Current Limitation

- Read only — no writes
- No auth
- No OpenAI
- No Instagram
- No real publishing
- Slides in `/carousel` use hardcoded gradients and line splits — only caption and hashtags are from DB
