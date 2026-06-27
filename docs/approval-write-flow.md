# Approval Write Flow

## Purpose

Issue #020 makes Phoenix approval actions write to Supabase.

---

## Actions

| Action | Trigger | DB Write |
|---|---|---|
| Approve | `/carousel` → Approve & Publish | `daily_decisions.status = scheduled`, `publish_jobs` upsert |
| Reject | `/decision` → Reject | `daily_decisions.status = rejected`, `learning_logs` insert |
| Force Publish | `/decision` → Force Publish | `daily_decisions.status = scheduled`, `publish_jobs` upsert (force_publish: true), `learning_logs` insert |

---

## Rules

- Phoenix never publishes without explicit approval.
- Approve creates a scheduled publish job.
- Reject records the rejection and keeps Phoenix from publishing.
- Force Publish records a manual override.
- No real Instagram publishing happens yet.
- All writes are server-side only.
- If Supabase env is missing or write fails, a safe mock fallback is returned and the UI continues normally.

---

## API Routes

| Method | Route | Action |
|---|---|---|
| POST | `/api/actions/approve` | Approve today's decision |
| POST | `/api/actions/reject` | Reject today's decision |
| POST | `/api/actions/force-publish` | Force publish today's decision |
| GET | `/api/debug/write-status` | Read today's decision + publish_job status |

---

## Response Format

Success:
```json
{ "ok": true, "action": "approve" }
```

Fallback (no env or write failed):
```json
{
  "ok": true,
  "source": "mock_fallback",
  "message": "Supabase write skipped because environment is missing or write failed."
}
```

---

## Security

- Server-side only via `src/lib/data/actions.ts` (uses `server-only`)
- No service role key in client
- No secrets returned by any route
- Mock fallback if env missing
