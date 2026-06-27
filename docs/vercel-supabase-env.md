# Vercel Supabase Environment Setup

## Purpose

讓 Phoenix production deployment 可以從 Supabase 讀取 seed data。

---

## Required Vercel Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only, never expose client-side) |

---

## Security Notes

- Never expose service role key client-side
- Never commit `.env.local`
- Never paste keys into chat
- Store keys only in Vercel Environment Variables
- Server-side read only

---

## Setup Steps

1. Open Vercel project
2. Go to **Settings**
3. Go to **Environment Variables**
4. Add `SUPABASE_URL` → paste the Supabase project URL
5. Add `SUPABASE_SERVICE_ROLE_KEY` → paste the service role key
6. Select **Production** (and Preview if needed)
7. Save
8. Go to **Deployments** → Redeploy the latest deployment

---

## Verification

After redeploy, open:

```
https://phoenix-five-beta.vercel.app/api/health/supabase
```

Expected response:

```json
{
  "ok": true,
  "source": "supabase",
  "counts": {
    "users": 1,
    "creator_dna": 1,
    "daily_decisions": 1,
    "carousel_slides": 8,
    "learning_logs": 5
  },
  "today": {
    "selected_topic": "退休不是 65 歲開始"
  }
}
```

If env is missing or read failed:

```json
{
  "ok": false,
  "source": "mock_or_missing_env",
  "message": "Supabase environment variables are missing or read failed."
}
```

---

## Local Verification

```
npm run check:supabase
```

See `docs/supabase-read-connection.md` for full local setup instructions.
