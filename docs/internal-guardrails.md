# Internal Guardrails

## Purpose

Protect internal Phoenix debug and maintenance endpoints in production.
All debug and internal API routes must be secret-protected — no open endpoints.

---

## Secrets

| Secret | Protects |
|---|---|
| `CRON_SECRET` | `/api/cron/daily-decision` only |
| `INTERNAL_DEBUG_SECRET` | `/api/debug/write-status`, `/api/debug/data-source` |
| `OPENAI_DRY_RUN_SECRET` | `/api/debug/openai-decision-dry-run` |
| `OPENAI_SAVE_SECRET` | `/api/debug/save-openai-decision-draft` |
| `DEMO_RESET_SECRET` | `/api/admin/reset-demo` |

---

## Production Rules

- All debug APIs return `401 Unauthorized` if secret is missing or incorrect.
- Cron requires `x-cron-secret` header.
- Debug routes using `INTERNAL_DEBUG_SECRET` require `x-internal-debug-secret` header.
- No secrets are ever returned in any response.
- No debug routes appear in main navigation.
- No automatic publishing — all decisions start as `draft`.
- No Instagram publishing connected.

---

## Development Bypass

Routes protected by `INTERNAL_DEBUG_SECRET` allow bypass in non-production:

- `NODE_ENV !== "production"` → request is allowed through even without the header.
- Response includes `"environment": "development"` to signal the bypass was used.
- Production never bypasses — secret always required.

---

## Route Reference

| Route | Method | Auth Header | Notes |
|---|---|---|---|
| `/api/cron/daily-decision` | GET / POST | `x-cron-secret` | Always creates draft, never publishes |
| `/api/debug/write-status` | GET | `x-internal-debug-secret` | Dev bypass allowed |
| `/api/debug/data-source` | GET | `x-internal-debug-secret` | Dev bypass allowed |
| `/api/debug/openai-decision-dry-run` | POST | `x-openai-dry-run-secret` | No writes |
| `/api/debug/save-openai-decision-draft` | POST | `x-openai-save-secret` | Writes draft only |
| `/api/admin/reset-demo` | POST | `x-demo-reset-secret` | Destructive — local/staging only |

---

## Internal Pages

| Page | Purpose | In Nav |
|---|---|---|
| `/debug/status` | View today's decision status via secret | No |
| `/debug/openai-review` | Run OpenAI dry run and save draft | No |

---

## What Is Never Exposed

- OpenAI API key
- Supabase service role key
- `CRON_SECRET`
- `INTERNAL_DEBUG_SECRET`
- Any other environment variable

---

## Guardrail Checklist

- [ ] `INTERNAL_DEBUG_SECRET` set in production env
- [ ] `CRON_SECRET` set in production env
- [ ] `OPENAI_DRY_RUN_SECRET` set in production env
- [ ] `OPENAI_SAVE_SECRET` set in production env
- [ ] `DEMO_RESET_SECRET` set in production env (or route disabled in prod)
- [ ] No debug routes linked from main UI
- [ ] No secrets committed to source control
