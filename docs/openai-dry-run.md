# OpenAI Decision Dry Run

## Purpose

This endpoint lets Phoenix test OpenAI decision reasoning without writing to Supabase.

Use it to validate the OpenAI adapter before enabling it in the production cron.

---

## Route

```
POST /api/debug/openai-decision-dry-run
```

Header:

```
x-openai-dry-run-secret: your_secret
```

---

## Rules

- No database writes
- No publishing
- No cron impact
- No UI impact
- No secrets returned
- Read-only access to Supabase (user, creator_dna, recent posts, recent decisions)

---

## Response

Success with OpenAI:

```json
{
  "ok": true,
  "source": "openai",
  "mode": "dry_run",
  "writes": false,
  "decision": {
    "selectedTopic": "...",
    "confidenceScore": 85,
    "mainJudgment": "...",
    "risk": "...",
    "candidatesCount": 4,
    "carouselSlidesCount": 8,
    "captionPreview": "..."
  },
  "candidates": [...],
  "carouselSlides": [...],
  "hashtags": [...],
  "learningLog": "..."
}
```

Fallback (missing OpenAI key):

```json
{
  "ok": true,
  "source": "mock_fallback",
  "mode": "dry_run",
  "writes": false,
  "message": "OpenAI key missing. Returned mock decision instead."
}
```

Unauthorized:

```json
{ "ok": false, "message": "Unauthorized" }
```

HTTP 401.

---

## Local Test

1. Add to `.env.local`:

```
OPENAI_API_KEY=your_key_here
OPENAI_DRY_RUN_SECRET=your_chosen_secret
DECISION_ENGINE_PROVIDER=mock
```

2. Start dev server:

```bash
npm run dev
```

3. Test:

```bash
curl -s -X POST http://localhost:3000/api/debug/openai-decision-dry-run \
  -H "x-openai-dry-run-secret: your_chosen_secret" | jq .
```

---

## Production Test

```bash
curl -s -X POST https://phoenix-five-beta.vercel.app/api/debug/openai-decision-dry-run \
  -H "x-openai-dry-run-secret: YOUR_OPENAI_DRY_RUN_SECRET" | jq .
```

Requires `OPENAI_API_KEY` and `OPENAI_DRY_RUN_SECRET` set in Vercel Environment Variables.

---

## Safety

- Production cron still uses mock engine unless `DECISION_ENGINE_PROVIDER=openai` is explicitly set.
- Dry run never writes to Supabase.
- No API keys are returned in any response.
- Route returns 401 without the correct secret.
