# Phoenix Seed Data

## Purpose

這份 seed data 是 Phoenix V2 的第一批真實資料，用來把 mock prototype 的內容轉成資料庫可儲存的結構。

---

## What it includes

- Mock user (小佑)
- Creator DNA
- Mock Instagram account
- Historical mock posts (5 筆)
- Daily decision (今日決策)
- Decision candidates (4 筆)
- Carousel draft
- Carousel slides (8 張)
- Publish job
- Learning logs (5 筆)

---

## Important Notes

- No real Instagram token is included.
- No OpenAI key is included.
- No real publishing happens.
- UI is not connected to Supabase yet.
- This is only the data foundation for V2.

---

## How to run

1. Open Supabase SQL Editor
2. Paste `supabase/seed.sql`
3. Run
4. Check tables in Table Editor

Safe to run multiple times — existing seed records are deleted before re-inserting.

---

## Fixed UUIDs reference

| Record | UUID |
|---|---|
| users / 小佑 | `a0000000-0000-0000-0000-000000000001` |
| creator_dna | `a0000000-0000-0000-0000-000000000002` |
| instagram_accounts | `a0000000-0000-0000-0000-000000000003` |
| instagram_posts 1–5 | `...000000000011` to `...000000000015` |
| daily_decisions | `a0000000-0000-0000-0000-000000000020` |
| decision_candidates 1–4 | `...000000000031` to `...000000000034` |
| carousel_drafts | `a0000000-0000-0000-0000-000000000040` |
| carousel_slides 1–8 | `...000000000051` to `...000000000058` |
| publish_jobs | `a0000000-0000-0000-0000-000000000060` |
| learning_logs 1–5 | `...000000000071` to `...000000000075` |
