// Dev-only API for the daily-runs debug dashboard.
// Returns 403 in production.
// Storage strategy: Supabase primary, local JSON fallback when tables are missing.
import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateDailyRun,
  getTodayRun,
  updateRunStatus,
  getRunDetails,
  logJobEvent,
  getTaiwanDateString,
} from "@/lib/daily-workflow/service";
import {
  localGetOrCreateRun,
  localGetTodayRun,
  localUpdateRunStatus,
} from "@/lib/daily-workflow/local-store";
import type { DailyRun } from "@/lib/daily-workflow/types";

// Check if phoenix_daily_runs is accessible.
async function isSupabaseReady(): Promise<boolean> {
  try {
    await getTodayRun();
    return true;
  } catch {
    return false;
  }
}

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("run_id");
    const today = getTaiwanDateString();
    const supabaseReady = await isSupabaseReady();

    if (runId) {
      if (supabaseReady) {
        const details = await getRunDetails(runId);
        return NextResponse.json({ status: "ok", storage_mode: "supabase", ...details });
      }
      // Fallback: return run from local store with empty child collections
      const run = await localGetTodayRun(today);
      if (!run || run.id !== runId) {
        return NextResponse.json({ status: "error", error: "Run not found." }, { status: 404 });
      }
      return NextResponse.json({ status: "ok", storage_mode: "local", run, candidates: [], slides: [], publishJobs: [], events: [] });
    }

    if (supabaseReady) {
      const run = await getTodayRun();
      return NextResponse.json({ status: "ok", storage_mode: "supabase", run: run ?? null, today });
    }

    const run = await localGetTodayRun(today);
    return NextResponse.json({ status: "ok", storage_mode: "local", run: run ?? null, today });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  try {
    const body = (await req.json()) as { action?: string; run_id?: string };
    const today = getTaiwanDateString();
    const supabaseReady = await isSupabaseReady();

    if (body.action === "create_today") {
      let run: DailyRun;
      if (supabaseReady) {
        run = await getOrCreateDailyRun(today);
        // Log creation event (non-critical)
        try {
          await logJobEvent({
            run_id: run.id,
            job_type: "daily_run_created",
            status: "ok",
            message: `Daily run created for ${today} via debug dashboard`,
            payload: { source: "debug_dashboard", run_date: today },
          });
        } catch { /* non-critical */ }
        return NextResponse.json({ status: "ok", storage_mode: "supabase", run });
      }
      run = await localGetOrCreateRun(today);
      return NextResponse.json({ status: "ok", storage_mode: "local", run });
    }

    if (body.action === "reset" && body.run_id) {
      if (supabaseReady) {
        const run = await updateRunStatus(body.run_id, "idle", { reset_at: new Date().toISOString() });
        try {
          await logJobEvent({
            run_id: run.id,
            job_type: "daily_run_reset",
            status: "ok",
            message: `Run reset to idle via debug dashboard`,
            payload: { source: "debug_dashboard" },
          });
        } catch { /* non-critical */ }
        return NextResponse.json({ status: "ok", storage_mode: "supabase", run });
      }
      const run = await localUpdateRunStatus(body.run_id, "idle", { reset_at: new Date().toISOString() });
      return NextResponse.json({ status: "ok", storage_mode: "local", run });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}
