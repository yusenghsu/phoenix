// Cron: 17:00 Taiwan time (UTC 09:00).
// Triggers carousel generation for the selected topic.
// Skeleton only — no Runway, no OpenAI, no image generation.
import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest, getTaiwanRunDate, logCronTriggered, buildCronResponse } from "@/lib/daily-workflow/cron";
import { getOrCreateDailyRun, updateRunStatus } from "@/lib/daily-workflow/service";

export const runtime = "nodejs";
export const maxDuration = 60;

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
      jobType: "daily_generate",
      status: "triggered",
      message: "17:00 daily generate cron triggered",
      payload: { run_date: runDate, dev_mode: auth.devMode, previous_status: run.status },
    });

    // No topic selected — skip
    if (!run.selected_topic_id) {
      await updateRunStatus(run.id, "skipped_no_selection", { skipped_at: new Date().toISOString() });
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_generate",
        status: "skipped_no_selection",
        message: "No topic selected by 17:00 — skipping generation",
        payload: { run_date: runDate },
      });
      return NextResponse.json(buildCronResponse({
        jobType: "daily_generate",
        status: "skipped_no_selection",
        runDate,
        runId: run.id,
        devMode: auth.devMode,
        message: "Skipped — no topic selected",
      }));
    }

    // Topic selected — mark as queued (actual generation not implemented yet)
    const updatedRun = await updateRunStatus(run.id, "generation_queued", {
      generation_queued_at: new Date().toISOString(),
    });
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_generate",
      status: "generation_queued",
      message: "Topic selected — generation queued (skeleton: no images or videos generated yet)",
      payload: { run_date: runDate, selected_topic_id: run.selected_topic_id },
    });

    return NextResponse.json(buildCronResponse({
      jobType: "daily_generate",
      status: updatedRun.status,
      runDate,
      runId: run.id,
      devMode: auth.devMode,
      message: "Generation queued (skeleton — no Runway or OpenAI calls made)",
      detail: { selected_topic_id: run.selected_topic_id },
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
