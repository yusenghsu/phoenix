# Daily Scheduler

## Purpose

Phoenix will eventually run every day at 03:00 to create the daily operating brief.

---

## Current Implementation

Issue #022 creates a protected server-side mock cron route.
Issue #023 connects it to Vercel Cron (GET support + vercel.json).

---

## Route

```
GET  /api/cron/daily-decision   ← Vercel Cron
POST /api/cron/daily-decision   ← manual test
```

Auth — either header accepted:

```
x-cron-secret: your_secret
Authorization: Bearer your_secret
```

### Response — created

```json
{
  "ok": true,
  "source": "supabase",
  "message": "Daily decision created.",
  "decision": {
    "selected_topic": "退休不是 65 歲開始",
    "status": "draft"
  },
  "carousel_slides": 8,
  "publish_job": {
    "status": "pending"
  }
}
```

### Response — already exists

```json
{
  "ok": true,
  "source": "supabase",
  "message": "Daily decision already exists.",
  "decision": {
    "selected_topic": "退休不是 65 歲開始",
    "status": "approved"
  }
}
```

### Response — missing Supabase env (safe fallback)

```json
{
  "ok": true,
  "source": "mock_fallback",
  "message": "Daily decision mock run completed."
}
```

### Response — bad secret

```json
{ "ok": false, "message": "Unauthorized" }
```

HTTP 401.

---

## What the Mock Flow Creates

| Table | Records |
|---|---|
| `daily_decisions` | 1 (status = draft) |
| `decision_candidates` | 4 |
| `carousel_drafts` | 1 |
| `carousel_slides` | 8 |
| `publish_jobs` | 1 (status = pending) |
| `learning_logs` | 1 |

If today's decision already exists, nothing is written.

---

## Local Test

1. Add to `.env.local`:

```
CRON_SECRET=your_chosen_secret
```

2. Run:

```bash
npm run cron:daily
```

---

## Production Test

```bash
curl -X POST https://your-domain.vercel.app/api/cron/daily-decision \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## Production Cron

Vercel Cron is configured in `vercel.json`.

Schedule:

```
0 19 * * *
```

This runs at 19:00 UTC, which equals 03:00 Taiwan time.

Path:

```
/api/cron/daily-decision
```

---

## Production Setup

1. Add `CRON_SECRET` to Vercel → Settings → Environment Variables.
2. Ensure `vercel.json` is committed and deployed.
3. Vercel will call GET `/api/cron/daily-decision` automatically at 19:00 UTC daily.

---

## Manual Production Test

```bash
curl -X GET https://phoenix-five-beta.vercel.app/api/cron/daily-decision \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

Expected: `ok: true`

---

## Security

- Route requires `x-cron-secret` or `Authorization: Bearer` header.
- Returns 401 if missing or incorrect.
- Service role key is server-side only — never returned, never exposed.
- No secrets in any response.

---

## Notes

- Vercel Cron uses UTC.
- Phoenix only creates one daily decision per day.
- If today already exists, no duplicate is created.
- No OpenAI or Instagram is connected yet.

---

## Current Limitations

- Mock decision engine only.
- No OpenAI yet.
- No Instagram signal yet.
- No real publishing.

---

## Future

- Add OpenAI decision engine (replaces mock topic).
- Add Instagram historical signal input.
- Enable real 03:00 scheduler (Vercel Cron or external).
- Add failure alerting.
- Add notification system for small field.
