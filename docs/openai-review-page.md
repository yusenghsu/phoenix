# OpenAI Decision Review Page

## Purpose

Internal page for reviewing OpenAI dry-run brand decisions.

Lets the creator see the full decision output — topic, factors, candidates, carousel, caption — without any Supabase writes or publishing.

---

## Route

```
/debug/openai-review
```

Not linked from any nav. Access by URL only.

---

## Rules

- Dry run only
- No Supabase writes
- No publishing
- No cron impact
- Protected by `OPENAI_DRY_RUN_SECRET` (entered on-page, never stored)
- No secrets stored client-side

---

## How to Use

1. Open `/debug/openai-review`
2. Enter `OPENAI_DRY_RUN_SECRET`
3. Click **Run OpenAI Dry Run**
4. Review recommendation, candidates, carousel, caption, and learning log

---

## What It Shows

| Section | Content |
|---|---|
| Recommendation | Selected topic, confidence score, main judgment, risk |
| Decision Factors | Market Signal, Creator DNA Fit, Brand Memory, Share Worthiness |
| Candidates | All 4 topics evaluated, scores, risk level, rejection reasons |
| Carousel Draft | 8 slides with headline and body |
| Caption | Full Instagram caption |
| Hashtags | 5 hashtags |
| Learning Log | What Phoenix learned from this decision |
| Safety Status | writes=false, publishing=disabled, cron impact=none |

---

## Safety

- This page is for review only.
- It does not approve, schedule, publish, or save anything.
- Secret is sent as a request header — never stored in localStorage or the database.
- If OpenAI is unavailable, mock fallback is shown with a notice.
