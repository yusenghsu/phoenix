# Save OpenAI Decision as Draft

## Purpose

Allows manual saving of an OpenAI dry-run decision into Supabase as a draft.

This is a human-confirmed write — not automatic, not scheduled.

---

## Route

```
POST /api/debug/save-openai-decision-draft
```

Header:

```
x-openai-save-secret: your_secret
```

---

## What It Does

1. Reads user, creator_dna, recent posts, and recent decisions from Supabase.
2. Calls `runOpenAIDecisionEngine()` with live context.
3. Saves the result to Supabase:

| Table | Status |
|---|---|
| `daily_decisions` | status = `draft` |
| `decision_candidates` | 4 records |
| `carousel_drafts` | 1 record |
| `carousel_slides` | 8 records |
| `publish_jobs` | status = `pending`, force_publish = `false` |
| `learning_logs` | 1 record |

4. Does NOT publish, approve, or schedule.

---

## Idempotency

| Existing status | Behavior |
|---|---|
| None | Creates new draft |
| `draft` | Deletes old draft and creates new one |
| `approved` / `scheduled` / `published` | Returns 409 — safe, no overwrite |

---

## Response

Success:

```json
{
  "ok": true,
  "source": "openai",
  "writes": true,
  "message": "OpenAI decision saved as draft.",
  "decision": {
    "selectedTopic": "...",
    "status": "draft"
  },
  "carouselSlides": 8,
  "publishJob": {
    "status": "pending",
    "forcePublish": false
  }
}
```

Already approved/scheduled:

```json
{
  "ok": false,
  "message": "Today already has an approved or scheduled decision. Reset demo or reject first before saving a new OpenAI draft."
}
```

HTTP 409.

---

## Rules

- Manual only — no automation
- Writes to Supabase (draft state)
- Creates pending publish job
- Does not publish
- Does not affect cron
- Does not overwrite approved/scheduled/published decisions
- No secrets returned

---

## Safety

- Protected by `OPENAI_SAVE_SECRET`
- Service role key is server-side only
- No secrets in any response
- No Instagram publishing
- No automatic approval
- Phoenix never publishes without explicit creator approval

---

## How to Use

Via the `/debug/openai-review` page:

1. Run a dry run first.
2. Review the decision.
3. Enter `OPENAI_SAVE_SECRET` in the Save section.
4. Click **Save as Draft**.

Or via curl:

```bash
curl -s -X POST http://localhost:3000/api/debug/save-openai-decision-draft \
  -H "x-openai-save-secret: YOUR_OPENAI_SAVE_SECRET" | jq .
```
