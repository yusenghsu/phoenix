# OpenAI Cron Draft Mode

## Purpose

Phoenix can generate a daily OpenAI decision draft at 03:00.

The cron always creates a **draft** — never a scheduled or published post. The creator reviews and approves before anything is scheduled.

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
| `publish_jobs.status` | `pending` |
| `publish_jobs.force_publish` | `false` |
| `publish_jobs.scheduled_at` | `null` |

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
