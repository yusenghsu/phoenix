# Draft Decision Main Flow

## Purpose

Integrates the OpenAI-saved draft decision (`daily_decisions.status = draft`) into Phoenix's main user flow across all pages.

When a draft is saved (via `/debug/openai-review`), every main page reflects the draft state with appropriate UI and actions.

---

## Status Lifecycle

```
draft → scheduled (approved) → published
draft → rejected
```

| Status | Meaning |
|---|---|
| `draft` | Saved by OpenAI save-draft route. Not yet approved. |
| `rejected` | Creator rejected. Cron will re-analyze tonight. |
| `scheduled` | Approved. Publish job has `scheduled_at = today 20:00`. |
| `published` | Published to Instagram. |

---

## Page Behavior by Status

### Home (`/`)

| Status | UI |
|---|---|
| `draft` | Orange notice: "Phoenix 已為你準備了一份草稿決策，等待你審核後排程發布。" → **Review Draft** (→ /decision) + **View Carousel** |
| `rejected` | Notice: "今天的決策已被拒絕。Phoenix 將在今晚 03:00 重新分析。" → **View History** |
| `scheduled` / `published` / mock | Existing flow: **View Today's Carousel**, **View Decision**, **Publish** |

### Decision (`/decision`)

| Status | Action buttons (row 2) |
|---|---|
| `draft` | **Reject** + **Approve Draft** |
| other | **Reject** + **Force Publish** |

- **Approve Draft** → POST `/api/actions/approve` → `daily_decisions.status = scheduled`, `publish_jobs.status = scheduled`, `scheduled_at = today 20:00` → redirect `/publish`
- **Reject** → POST `/api/actions/reject` → `daily_decisions.status = rejected`, `publish_jobs.status = cancelled`

### Carousel (`/carousel`)

| Status | Approve button text |
|---|---|
| `draft` | "Approve Draft" / "Approving..." |
| other | "Approve & Publish" / "Scheduling..." |

Same action: POST `/api/actions/approve` → redirect `/publish`.

### Publish (`/publish`)

| `publish_jobs.status` | UI |
|---|---|
| `pending` | Orange icon + "Draft not approved yet." + **Back to Decision** CTA |
| `scheduled` / `published` | Existing green success UI |

### History (`/history`)

`DecisionBadge` supports "Draft" status (dim orange style).  
Today's record badge reflects live DB status.

---

## API Changes

### `GET /api/data?type=today`

Added field: `status` (from `daily_decisions.status`)

### `GET /api/data?type=decision`

Added field: `status`

### `GET /api/data?type=carousel`

Added field: `decisionStatus`

### `GET /api/data?type=history`

Added field: `todayStatus`

---

## Action Changes

### `POST /api/actions/reject`

Now also cancels `publish_jobs.status = cancelled` (best-effort, does not fail if no job exists).

---

## Rules

- Draft flow never bypasses approval — creator must explicitly click **Approve Draft** or **Approve & Publish**
- Reject always cancels the pending publish job
- All fallbacks to mock data if Supabase is not configured
- No API / OpenAI / Instagram calls during approval flow
