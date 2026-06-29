// Cron: 03:00 Taiwan time (UTC 19:00 previous day).
// Triggers daily topic idea generation skeleton.
// This skeleton logs the event and advances run status.
// Actual OpenAI topic generation is NOT implemented in this issue.
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
      jobType: "daily_ideas",
      status: "triggered",
      message: "03:00 daily ideas cron triggered",
      payload: { run_date: runDate, dev_mode: auth.devMode, previous_status: run.status },
    });

    // Advance status: idle → ideas_generating → waiting_for_selection (skeleton only)
    let updatedRun = run;
    if (run.status === "idle") {
      updatedRun = await updateRunStatus(run.id, "ideas_generating", { cron_triggered_at: new Date().toISOString() });
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_ideas",
        status: "placeholder",
        message: "Ideas generation not implemented yet — advancing to waiting_for_selection",
        payload: { run_date: runDate },
      });
      updatedRun = await updateRunStatus(run.id, "waiting_for_selection");
    }

    return NextResponse.json(buildCronResponse({
      jobType: "daily_ideas",
      status: updatedRun.status,
      runDate,
      runId: run.id,
      devMode: auth.devMode,
      message: run.status === "idle"
        ? "Run advanced to waiting_for_selection (skeleton — no topics generated yet)"
        : `Run already in status: ${run.status} — no status change`,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
