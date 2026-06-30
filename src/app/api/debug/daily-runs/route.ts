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
  selectTopic,
  getTaiwanDateString,
  resetGenerationStatus,
} from "@/lib/daily-workflow/service";
import { syncDailyRunFinalVideosToStorage } from "@/lib/daily-workflow/storage-sync";
import { createServerClient } from "@/lib/supabase/server";
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

    if (body.action === "select_topic") {
      const { run_id, topic_candidate_id } = body as { run_id?: string; topic_candidate_id?: string };
      if (!run_id || !topic_candidate_id) {
        return NextResponse.json({ error: "run_id and topic_candidate_id are required." }, { status: 400 });
      }
      if (!supabaseReady) {
        return NextResponse.json({ error: "Supabase not available for topic selection." }, { status: 503 });
      }
      await selectTopic(run_id, topic_candidate_id, "dashboard", { source: "debug_dashboard" });

      // Fetch candidate title for the event message
      const db = createServerClient();
      let topicLabel = topic_candidate_id.slice(0, 8);
      if (db) {
        const { data: cand } = await db
          .from("phoenix_topic_candidates")
          .select("title, rank")
          .eq("id", topic_candidate_id)
          .single();
        if (cand) topicLabel = `#${cand.rank} ${cand.title}`;
      }

      try {
        await logJobEvent({
          run_id,
          job_type: "topic_selection",
          status: "selected",
          message: `Topic selected via dashboard: ${topicLabel}`,
          payload: { source: "dashboard", topic_candidate_id },
        });
      } catch { /* non-critical */ }

      const details = await getRunDetails(run_id);
      return NextResponse.json({ status: "ok", storage_mode: "supabase", ...details });
    }

    if (body.action === "reset_generation" && body.run_id) {
      if (!supabaseReady) {
        return NextResponse.json({ error: "Supabase not available." }, { status: 503 });
      }
      const db = createServerClient();
      if (!db) return NextResponse.json({ error: "DB unavailable." }, { status: 500 });

      const { data: currentRun } = await db
        .from("phoenix_daily_runs")
        .select("status")
        .eq("id", body.run_id)
        .single();

      if (!currentRun) return NextResponse.json({ error: "Run not found." }, { status: 404 });
      if (!["generating", "generation_queued"].includes(currentRun.status)) {
        return NextResponse.json({ error: `Cannot reset — current status: ${currentRun.status}` }, { status: 400 });
      }

      const run = await resetGenerationStatus(body.run_id);
      try {
        await logJobEvent({
          run_id: body.run_id,
          job_type: "daily_generate",
          status: "generation_reset_debug",
          message: "Stuck generation reset via debug dashboard — READY slides preserved",
          payload: { previous_status: currentRun.status, reset_at: new Date().toISOString(), source: "debug_dashboard" },
        });
      } catch { /* non-critical */ }

      const details = await getRunDetails(body.run_id);
      return NextResponse.json({ status: "ok", storage_mode: "supabase", ...details, run });
    }

    if (body.action === "sync_final_videos_to_storage" && body.run_id) {
      if (!supabaseReady) {
        return NextResponse.json({ error: "Supabase not available." }, { status: 503 });
      }
      const syncResult = await syncDailyRunFinalVideosToStorage(body.run_id);
      const details = await getRunDetails(body.run_id);
      return NextResponse.json({ status: "ok", storage_mode: "supabase", syncResult, ...details });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}
