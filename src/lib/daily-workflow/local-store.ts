// Local file-based store for the /debug/daily-runs page.
// Server-side only. Uses the same JSON-file pattern as the launch-pack manifest.
//
// This is the dev fallback when the Supabase migration has not yet been applied.
// When phoenix_daily_runs tables exist in Supabase, the production cron jobs
// will write directly to Supabase instead of this file.
import "server-only";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { DailyRun, DailyRunStatus } from "./types";

const STORE_DIR = path.join(process.cwd(), "public", "generated", "daily-runs");
const STORE_PATH = path.join(STORE_DIR, "runs.json");

interface LocalStore {
  runs: Record<string, DailyRun>; // keyed by run_date
}

export async function readStore(): Promise<LocalStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as LocalStore;
  } catch {
    return { runs: {} };
  }
}

export async function writeStore(data: LocalStore): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function localGetOrCreateRun(runDate: string): Promise<DailyRun> {
  const store = await readStore();
  if (store.runs[runDate]) return store.runs[runDate];

  const now = new Date().toISOString();
  const run: DailyRun = {
    id: randomUUID(),
    run_date: runDate,
    status: "idle",
    profile_key: "yuseng_teacher",
    selected_topic_id: null,
    scheduled_idea_at: null,
    scheduled_generation_at: null,
    scheduled_publish_at: null,
    started_at: null,
    finished_at: null,
    error_code: null,
    error_message: null,
    metadata: {},
    created_at: now,
    updated_at: now,
  };
  store.runs[runDate] = run;
  await writeStore(store);
  return run;
}

export async function localGetTodayRun(today: string): Promise<DailyRun | null> {
  const store = await readStore();
  return store.runs[today] ?? null;
}

export async function localUpdateRunStatus(
  runId: string,
  status: DailyRunStatus,
  metadata?: Record<string, unknown>
): Promise<DailyRun> {
  const store = await readStore();
  const entry = Object.values(store.runs).find((r) => r.id === runId);
  if (!entry) throw new Error(`Run not found: ${runId}`);

  const now = new Date().toISOString();
  const updated: DailyRun = {
    ...entry,
    status,
    updated_at: now,
    metadata: metadata ? { ...entry.metadata, ...metadata } : entry.metadata,
  };
  if (["ideas_generating", "generating", "publishing"].includes(status)) {
    updated.started_at = now;
  }
  if (["published", "failed", "skipped_no_selection", "skipped_not_ready"].includes(status)) {
    updated.finished_at = now;
  }
  store.runs[entry.run_date] = updated;
  await writeStore(store);
  return updated;
}
