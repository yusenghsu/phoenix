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

---

## Data Source Verification

- `/api/health/supabase` verifies production Supabase connectivity.
- `/api/debug/data-source` verifies whether Phoenix is reading from Supabase or mock fallback.
- Pages read through `src/lib/data/queries.ts` via `/api/data`.
- Mock fallback remains active when environment variables are missing or Supabase read fails.
- No secrets are ever returned by debug routes.

Add `?debug=source` to the homepage URL to see a low-key data source badge at the bottom of the page.

---

## Local Test

1. Create `.env.local` in the project root (already in `.gitignore` — never commit it)
2. Add:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. Run:
   ```
   npm run check:supabase
   ```

Expected output:

```
Phoenix — Supabase Read Check
─────────────────────────────
  users: 1 row
  creator_dna: 1 row
  daily_decisions: 1 row
  carousel_slides: 8 rows
  learning_logs: 5 rows

Today's decision:
  topic:      退休不是 65 歲開始
  confidence: 92
  status:     approved

✓ Supabase read check complete.
```

If env variables are missing:

```
Missing Supabase environment variables.
Create .env.local and set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
```
