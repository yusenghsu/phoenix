# Daily Scheduler

## Purpose

Phoenix will eventually run every day at 03:00 to create the daily operating brief.

---

## Current Implementation

Issue #022 creates a protected server-side mock cron route.

---

## Route

```
POST /api/cron/daily-decision
```

Header:

```
x-cron-secret: your_secret
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

## Production Setup

1. Add `CRON_SECRET` to Vercel → Settings → Environment Variables.
2. Redeploy.
3. Test with the curl command above.
4. Later: connect to Vercel Cron Jobs or an external scheduler (e.g. cron-job.org).

---

## Security

- Route requires `x-cron-secret` header.
- Returns 401 if missing or incorrect.
- Service role key is server-side only — never returned, never exposed.
- No secrets in any response.

---

## Current Limitations

- Mock decision engine only.
- No OpenAI yet.
- No Instagram signal yet.
- No automatic scheduler enabled yet.
- No real publishing.

---

## Future

- Add OpenAI decision engine (replaces mock topic).
- Add Instagram historical signal input.
- Enable real 03:00 scheduler (Vercel Cron or external).
- Add failure alerting.
- Add notification system for small field.
