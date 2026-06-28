# OpenAI Cron Draft Mode

## Purpose

Phoenix generates a daily decision draft at 03:00 Taiwan time every day.

The cron always creates a **draft** — never a scheduled or published post. The creator reviews and approves before anything is scheduled.

---

## Timezone Rules

All date and time values in Phoenix use **Asia/Taipei (UTC+8)** as the reference timezone.

### Cron Schedule

| Field | Value |
|---|---|
| `vercel.json` schedule | `0 19 * * *` (UTC) |
| Fires at (UTC) | 19:00 UTC |
| Fires at (Taiwan) | 03:00 Taiwan (next calendar day) |

**Why 19:00 UTC?** Vercel cron uses UTC. Taiwan is UTC+8, so:

```
Taiwan 03:00 = UTC 19:00 (previous calendar day)
Example: Taiwan 2026-06-30 03:00 = UTC 2026-06-29 19:00
```

### `decision_date` — Taiwan date

`decision_date` is stored as the **Taiwan calendar date**, not the UTC date.

```ts
// Correct — uses Taiwan date
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
// At UTC 2026-06-29T19:00 → returns "2026-06-30" (Taiwan date) ✓

// Wrong — UTC date would be one day behind
const today = new Date().toISOString().split("T")[0];
// At UTC 2026-06-29T19:00 → returns "2026-06-29" (UTC date) ✗
// User in Taiwan wakes at 08:00 June 30 → query finds nothing → mock data shown
```

This applies to:
- `src/lib/data/daily-decision.ts` — stores `decision_date`
- `src/lib/data/queries.ts` — `todayDate()` looks up today's decision
- `src/lib/data/actions.ts` — `getTodayDecisionId()` used during approval/reject

### `scheduled_at` — stored as UTC, displayed as Taiwan

When the user approves a decision, `publish_jobs.scheduled_at` stores **20:00 Taiwan = 12:00 UTC**:

```ts
// Correct — computes 20:00 Taiwan → 12:00 UTC
const taipeiDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
const scheduledAt = new Date(`${taipeiDate}T12:00:00.000Z`);
```

Display in `formatScheduledAt` uses Taiwan timezone via `Intl.DateTimeFormat`:
- `12:00 UTC` → `20:00 Asia/Taipei` → displayed as "Today 20:00" ✓
- Sanity check: if Taiwan hour is outside 18–22, falls back to "Today 20:00"

---

## Rules

- Cron creates draft only (`status = draft`)
- No publishing
- No automatic scheduling
- User approval required before any scheduling
- Publish job remains pending (`status = pending`, `force_publish = false`)
- Instagram publishing is not connected yet

---

## Provider

Controlled by env var `DECISION_ENGINE_PROVIDER`:

| Value | Behavior |
|---|---|
| `mock` (default) | Uses mock decision engine — no OpenAI calls |
| `openai` | Calls OpenAI API to generate decision |

Both modes produce the same output format and same DB write pattern (`draft` + `pending`).

---

## Output

| Field | Value |
|---|---|
| `daily_decisions.status` | `draft` |
| `daily_decisions.decision_date` | Taiwan date (YYYY-MM-DD) |
| `publish_jobs.status` | `pending` |
| `publish_jobs.force_publish` | `false` |
| `publish_jobs.scheduled_at` | `null` (set to 12:00 UTC on approval) |

---

## Idempotency

| Existing status | Cron behavior |
|---|---|
| None | Creates new draft |
| `draft` | Skips — returns `reason: "already_exists"` |
| `scheduled` / `approved` / `published` | Skips — returns `reason: "today_already_scheduled"` |
| `rejected` | Skips — returns `reason: "rejected_today"` |

The cron never overwrites an existing decision that the creator has already acted on.

---

## API

```
GET /api/cron/daily-decision
POST /api/cron/daily-decision
```

Auth: `x-cron-secret` header or `Authorization: Bearer <secret>`.

### Success response

```json
{
  "ok": true,
  "provider": "openai",
  "status": "draft",
  "publishJobStatus": "pending",
  "forcePublish": false,
  "writes": true,
  "decision": { "selected_topic": "...", "status": "draft" },
  "carousel_slides": 8
}
```

### Already scheduled

```json
{
  "ok": true,
  "skipped": true,
  "reason": "today_already_scheduled",
  "decision": { "selected_topic": "...", "status": "scheduled" }
}
```

### No Supabase configured

```json
{
  "ok": true,
  "source": "mock_fallback",
  "provider": "mock",
  "writes": false
}
```

---

## Local Testing

### Setup

Before each test run, clear today's decision data without touching users, DNA, or posts:

```bash
npm run reset:cron-test
```

This deletes today's `daily_decisions` and all child records (`learning_logs`, `publish_jobs`, `carousel_slides`, `carousel_drafts`, `decision_candidates`) for the current user.

### Mock engine

```bash
npm run reset:cron-test
npm run cron:daily
# Expected: provider=mock, status=draft, publish_job_status=pending, force_publish=false
```

### OpenAI engine

```bash
npm run reset:cron-test
DECISION_ENGINE_PROVIDER=openai npm run cron:daily
# Expected: provider=openai, status=draft, publish_job_status=pending, force_publish=false
```

Both modes use `.env.local` via `node --env-file=.env.local`.

### Idempotency check

Running `npm run cron:daily` a second time (without reset) should return:

```
skipped: true
reason: already_exists
```

---

## Security

- `CRON_SECRET` always required
- `OPENAI_API_KEY` server-side only
- `SUPABASE_SERVICE_ROLE_KEY` server-side only
- No secrets returned in any response
