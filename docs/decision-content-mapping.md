# Decision Content Mapping

## Purpose

Ensure Phoenix displays decision data from Supabase correctly across all pages.

---

## Mapping

| Field | Source | Used In |
|---|---|---|
| `selected_topic` | `daily_decisions.selected_topic` | Home page title, Decision page topic |
| `main_judgment` | `daily_decisions.main_judgment` | Home page WHY TODAY, Decision page confidence card |
| `risk` | `daily_decisions.risk` | Decision page "Risk if we skip today" section only |
| `confidence_score` | `daily_decisions.confidence_score` | Confidence score display |
| `decision_factors` | `daily_decisions.decision_factors` (JSON array) | Decision Factors cards |
| `decision_candidates` | `decision_candidates` table | Candidates / Decision Matrix |
| `carousel_slides` | `carousel_slides` table | Carousel page 8 slides |
| `caption` | `carousel_drafts.caption` | Carousel page caption |
| `hashtags` | `carousel_drafts.hashtags` | Carousel page hashtags |
| `learning_logs` | `learning_logs` table | History page learnings |

---

## Rule

**Risk is never used as WHY TODAY text.**

`daily_decisions.risk` describes the consequence of skipping today's post. It belongs only in the Risk section on the decision page.

`daily_decisions.main_judgment` is the human-readable explanation of why Phoenix selected this topic. It is used as WHY TODAY on the home page and as the recommendation rationale on the decision page.

---

## API Field Mapping

### `GET /api/data?type=today`

| Response Field | Source |
|---|---|
| `topic` | `selected_topic` |
| `score` | `confidence_score` |
| `grade` | computed from `confidence_score` |
| `mainJudgment` | `main_judgment` |
| `whyToday` | `main_judgment` (same as mainJudgment — WHY TODAY display) |
| `status` | `status` |

### `GET /api/data?type=decision`

| Response Field | Source |
|---|---|
| `topic` | `selected_topic` |
| `confidence` | `confidence_score` |
| `mainJudgment` | `main_judgment` |
| `risk` | `risk` |
| `factors` | `decision_factors` |
| `rejected` | filtered `decision_candidates` (selected=false) |
| `matrix` | all `decision_candidates` |
| `status` | `status` |

### `GET /api/data?type=carousel`

| Response Field | Source |
|---|---|
| `captionBrief` | first paragraph of `carousel_drafts.caption` |
| `captionFull` | `carousel_drafts.caption` |
| `hashtags` | `carousel_drafts.hashtags` |
| `slides` | `carousel_slides` (slideNumber, headline, body) |
| `decisionStatus` | `daily_decisions.status` |

---

## Fallback Behaviour

If Supabase is not configured or returns no data, all pages fall back to mock data. The mock data uses the same field structure as the live data, so the mapping is consistent.

If `main_judgment` is empty, the fallback text is:
> Phoenix 已完成今日草稿決策，等待小佑審核。

If `carousel_slides` is empty, the carousel page falls back to the seed slide design.

---

## Debug

Use `GET /api/debug/write-status` to verify:

- `daily_decision.selected_topic`
- `daily_decision.status`
- `daily_decision.main_judgment_preview` (first 80 chars)
- `daily_decision.risk`
- `publish_job.status`
- `publish_job.force_publish`
- `carousel_slides_count`

No secrets or keys are returned by this route.
