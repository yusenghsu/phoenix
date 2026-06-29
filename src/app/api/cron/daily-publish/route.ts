// Cron: 20:00 Taiwan time (UTC 12:00).
// Checks if 8/8 slides are READY and triggers publish skeleton.
// Does NOT call Instagram — no auto-publish in this issue.
import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest, getTaiwanRunDate, logCronTriggered, buildCronResponse } from "@/lib/daily-workflow/cron";
import { getOrCreateDailyRun, updateRunStatus, createPublishJob } from "@/lib/daily-workflow/service";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

async function countReadySlides(runId: string): Promise<number> {
  const db = createServerClient();
  if (!db) return 0;
  const { data } = await db
    .from("phoenix_carousel_slides")
    .select("id")
    .eq("run_id", runId)
    .eq("final_ratio_status", "passed_4_5");
  return data?.length ?? 0;
}

export async function GET(req: NextRequest) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason ?? "Unauthorized" }, { status: 401 });
  }

  const runDate = getTaiwanRunDate();

  try {
    const run = await getOrCreateDailyRun(runDate);

    await logCronTriggered({
      runId: run.id,
      jobType: "daily_publish",
      status: "triggered",
      message: "20:00 daily publish cron triggered",
      payload: { run_date: runDate, dev_mode: auth.devMode, previous_status: run.status },
    });

    const readyCount = await countReadySlides(run.id);
    const allReady = readyCount >= 8;

    if (!allReady) {
      await updateRunStatus(run.id, "skipped_not_ready", { skipped_at: new Date().toISOString(), ready_slide_count: readyCount });
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_publish",
        status: "skipped_not_ready",
        message: `Only ${readyCount}/8 slides READY — skipping publish`,
        payload: { run_date: runDate, ready_count: readyCount },
      });
      return NextResponse.json(buildCronResponse({
        jobType: "daily_publish",
        status: "skipped_not_ready",
        runDate,
        runId: run.id,
        devMode: auth.devMode,
        message: `Skipped — ${readyCount}/8 slides READY`,
        detail: { ready_count: readyCount },
      }));
    }

    // 8/8 READY — create publish job skeleton, do NOT call Instagram
    await createPublishJob({
      run_id: run.id,
      platform: "instagram",
      status: "pending",
      scheduled_at: new Date().toISOString(),
      metadata: { created_by: "daily_publish_cron", note: "skeleton — IG not wired yet" },
    });
    await updateRunStatus(run.id, "ready_to_publish", { ready_at: new Date().toISOString(), ready_slide_count: readyCount });
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_publish",
      status: "ready_to_publish",
      message: "8/8 slides READY — publish job created (skeleton: IG not called)",
      payload: { run_date: runDate, ready_count: readyCount },
    });

    return NextResponse.json(buildCronResponse({
      jobType: "daily_publish",
      status: "ready_to_publish",
      runDate,
      runId: run.id,
      devMode: auth.devMode,
      message: "8/8 READY — publish job created (skeleton — Instagram not called)",
      detail: { ready_count: readyCount },
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
