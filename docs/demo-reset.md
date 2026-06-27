# Demo Reset

## Purpose

Issue #021 adds a reset tool that restores Phoenix to its initial seed state.

Use this before a demo to ensure a clean, consistent starting point.

---

## What It Resets

| Table | State After Reset |
|---|---|
| `users` | 小佑 restored |
| `creator_dna` | Full DNA restored |
| `instagram_accounts` | Mock account restored |
| `instagram_posts` | 5 mock posts restored |
| `daily_decisions` | status = `approved`, topic = 退休不是 65 歲開始 |
| `decision_candidates` | 4 candidates restored |
| `carousel_drafts` | 8-slide draft restored |
| `carousel_slides` | 8 slides restored |
| `publish_jobs` | status = `scheduled`, force_publish = `false`, scheduled today at 20:00 |
| `learning_logs` | 5 logs restored |

---

## How to Use

### Local Script

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

```bash
npm run reset:demo
```

Prints a safe summary. Never prints keys.

### Production API Route

```bash
curl -X POST https://your-domain.vercel.app/api/admin/reset-demo \
  -H "x-demo-reset-secret: YOUR_DEMO_RESET_SECRET"
```

Returns:

```json
{
  "ok": true,
  "message": "Phoenix demo data reset.",
  "state": {
    "daily_decision_status": "approved",
    "publish_job_status": "scheduled",
    "force_publish": false,
    "carousel_slides": 8,
    "learning_logs": 5
  }
}
```

---

## Security

- Route requires `x-demo-reset-secret` header matching `DEMO_RESET_SECRET` env var.
- Returns `401 Unauthorized` if secret is missing or incorrect.
- Returns `503` if Supabase is not configured (reset requires live database).
- No keys or secrets are returned in any response.
- Service role key is server-side only.

---

## Environment Variables

Add to `.env.local` and Vercel:

```
DEMO_RESET_SECRET=your_chosen_secret_here
```

Choose any strong secret string. This is not a Supabase key.

---

## Vercel Setup

1. Go to Vercel → Project → Settings → Environment Variables.
2. Add `DEMO_RESET_SECRET` (same value you use locally).
3. Redeploy.

---

## Notes

- Reset is **idempotent** — safe to run multiple times.
- Uses fixed UUIDs from `supabase/seed.sql` — same records every time.
- Only deletes and re-inserts the seed records (UUID-matched). Does not touch other data.
- `decision_date` is set to today's date at reset time.
- `scheduled_at` is set to today at 20:00 at reset time.
