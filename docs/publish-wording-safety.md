# Publish Wording Safety

Phoenix does not publish to Instagram yet.

Until Instagram publishing is connected:
- use "Schedule" not "Publish" as an action label
- "Published" is only used when database status is `published`
- Do not imply that clicking a button sends anything to Instagram

---

## Correct Labels by Context

| Context | Label |
|---|---|
| Carousel approve button (non-draft) | Approve & Schedule |
| Carousel approve button (draft) | Approve Draft |
| Carousel approving state | Scheduling... |
| Decision secondary action | Force Schedule |
| Home navigation button | View Schedule |
| Publish page — pending | Draft not approved yet. |
| Publish page — scheduled | Scheduled. |
| Publish page — published | Published. |

---

## Status → UI Mapping (Publish Page)

| `publish_jobs.status` | Heading | Copy |
|---|---|---|
| `pending` | Draft not approved yet. | 這份草稿還沒有獲得審核，尚未排程發布。 |
| `scheduled` | Scheduled. | Phoenix has scheduled this carousel for the planned posting time. Instagram publishing is not connected yet. |
| `published` | Published. | Phoenix 已將這篇發布到 Instagram。 |

---

## Rule

**"Published" only appears when `daily_decisions.status = published` or `publish_jobs.status = published`.**

Approving a decision sets status to `scheduled`, not `published`. The UI must reflect this distinction.

Do not use:
- Publish Now
- Publish (as a button action)
- 已發布 / 發布完成 (unless truly published)
