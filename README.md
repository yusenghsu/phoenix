# Phoenix Personal

AI brand coach and operating system for daily Instagram carousel decisions.

---

## What is Phoenix?

Phoenix is not a content generator.

Phoenix is an AI brand coach that wakes up at 03:00 every morning, analyzes the market and brand signals, makes the content decision for the day, prepares the Instagram carousel draft and caption, and waits for the creator's approval.

**The creator's role is to review, not to think.**

Decision > Generation.

---

## What Phoenix does

| Feature | Description |
|---|---|
| Today's Operating Brief | Daily morning summary — topic selected, carousel ready, timing suggested |
| Decision Engine | Full explanation of why Phoenix chose today's topic |
| Carousel Preview | 8-slide Instagram carousel draft with slide copy and caption |
| Publish Approval | One-tap approval flow |
| Teach Phoenix | Onboarding wizard to set Brand DNA, taste, and topics |
| Creator DNA | Phoenix's current understanding of the brand |
| History & Learning Log | Past decisions, results, and what Phoenix learned |

---

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Routes

| Path | Page |
|---|---|
| `/` | Today — Operating Brief |
| `/decision` | Decision Engine |
| `/carousel` | Carousel Preview |
| `/publish` | Publish Confirmation |
| `/teach` | Teach Phoenix (Onboarding) |
| `/settings` | Creator DNA |
| `/history` | Decision History |

---

## Prototype note

This is a local clickable V1 prototype.

No real Instagram API, OpenAI API, database, or publishing is connected.
All data is static mock data.
No login, no backend, no storage.

---

## Tech stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- No external AI or data dependencies
