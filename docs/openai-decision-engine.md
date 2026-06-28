# OpenAI Decision Engine

## Purpose

This adapter prepares Phoenix to use OpenAI for real brand decision reasoning.

Phoenix is not a content generator. It is a brand decision system.
Decision > Generation.

---

## Current Status

Issue #025 creates a dry-run adapter.
Production still defaults to mock unless `DECISION_ENGINE_PROVIDER=openai`.

---

## Architecture

```
runDecisionEngine(input)          [src/lib/decision/provider.ts]
  ├── if DECISION_ENGINE_PROVIDER=openai
  │     └── runOpenAIDecisionEngine(input)   [src/lib/decision/openai-engine.ts]
  │           ├── if OPENAI_API_KEY missing → fallback mock
  │           ├── call OpenAI API
  │           ├── validate JSON response
  │           └── if invalid → fallback mock
  └── else
        └── runMockDecisionEngine(input)     [src/lib/decision/mock-engine.ts]
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | For OpenAI provider | Your OpenAI secret key — server-side only |
| `OPENAI_MODEL` | No | Model to use. Default: `gpt-4o-mini` |
| `DECISION_ENGINE_PROVIDER` | No | `mock` (default) or `openai` |

---

## Safety

- `OPENAI_API_KEY` is never committed to git.
- `OPENAI_API_KEY` is never used client-side.
- `OPENAI_API_KEY` is never in `NEXT_PUBLIC_` vars.
- `openai-engine.ts` uses `server-only` — cannot be imported from client components.
- If key is missing or OpenAI fails, fallback to mock automatically.
- Phoenix never publishes without creator approval.

---

## Local Test

1. Add to `.env.local`:

```
OPENAI_API_KEY=your_key_here
DECISION_ENGINE_PROVIDER=openai
```

2. Run:

```bash
npm run test:decision
```

To test mock only (no key needed):

```bash
npm run test:decision
```

(Default provider is `mock`.)

---

## Output

The test prints:

```
Phoenix OpenAI decision test completed.
provider: mock
selected_topic: 退休不是 65 歲開始
confidence_score: 92
candidates: 4
carousel_slides: 8
```

No API key is printed. No secrets are logged.

---

## OpenAI Prompt Principles

The system prompt instructs Phoenix to:

- Recommend only ONE topic per day
- Reject high-traffic topics that don't fit Creator DNA
- Never recommend 心靈雞湯, 標題黨, or low-quality content
- Write in brand voice: direct, warm, insightful ("一針見血")
- Return structured JSON matching `DecisionEngineOutput`

---

## Dry Run API

Issue #027 adds a protected dry run endpoint for testing OpenAI decisions without saving results.

```
POST /api/debug/openai-decision-dry-run
Header: x-openai-dry-run-secret
```

See `docs/openai-dry-run.md` for full details.

---

## Future

- Replace mock daily cron with OpenAI provider when ready
- Add Instagram historical signals as input
- Add retry handling for OpenAI failures
- Add cost tracking and token limits
- Add decision audit log
