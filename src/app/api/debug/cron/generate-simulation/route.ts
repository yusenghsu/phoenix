// Read-only simulation of 17:00 daily_generate decision.
// Never calls OpenAI, Runway, or Instagram. Never creates or mutates any run.
import { NextResponse } from "next/server";
import { getTodayRun, getTaiwanDateString } from "@/lib/daily-workflow/service";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PUBLISHED_STATUSES = ["published", "manual_published"];
const STALE_PENDING_STATUSES = ["waiting_for_selection", "ideas_ready", "selected", "ideas_generating"];

type SimulationState =
  | "ready_to_generate_today"
  | "would_auto_select_then_generate"
  | "blocked_stale_run"
  | "blocked_already_published"
  | "blocked_no_candidates"
  | "no_fresh_run";

export async function GET() {
  const currentTaiwanDate = getTaiwanDateString();
  const checkedAt = new Date().toISOString();

  const db = createServerClient();
  if (!db) {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }

  // ── Today's run (read-only — never creates) ────────────────────────────────
  let todayRun: { id: string; run_date: string; status: string; selected_topic_id: string | null } | null = null;
  try {
    const r = await getTodayRun();
    if (r) todayRun = { id: r.id, run_date: r.run_date, status: r.status, selected_topic_id: r.selected_topic_id };
  } catch { /* non-critical */ }

  // ── Details: candidates, slides, publish jobs ──────────────────────────────
  let candidateCount = 0;
  let selectionSource: string | null = null;
  let readySlideCount = 0;
  let alreadyPublished = false;
  let hasPlatformMediaId = false;

  if (todayRun) {
    alreadyPublished = PUBLISHED_STATUSES.includes(todayRun.status);
    try {
      const [candidatesRes, slidesRes, jobsRes, selectionsRes] = await Promise.all([
        db.from("phoenix_topic_candidates").select("id").eq("run_id", todayRun.id),
        db.from("phoenix_carousel_slides").select("final_ratio_status").eq("run_id", todayRun.id),
        db.from("phoenix_publish_jobs")
          .select("status, platform_media_id")
          .eq("run_id", todayRun.id)
          .eq("platform", "instagram")
          .limit(1),
        todayRun.selected_topic_id
          ? db.from("phoenix_topic_selections")
              .select("source")
              .eq("run_id", todayRun.id)
              .order("selected_at", { ascending: false })
              .limit(1)
          : Promise.resolve({ data: [] }),
      ]);
      candidateCount = (candidatesRes.data ?? []).length;
      readySlideCount = ((slidesRes.data ?? []) as { final_ratio_status: string }[])
        .filter((s) => s.final_ratio_status === "passed_4_5").length;
      const igJob = ((jobsRes.data ?? []) as { status: string; platform_media_id: string | null }[])[0];
      if (igJob) {
        if (PUBLISHED_STATUSES.includes(igJob.status)) alreadyPublished = true;
        if (igJob.platform_media_id) hasPlatformMediaId = true;
      }
      selectionSource = ((selectionsRes.data ?? []) as { source: string }[])[0]?.source ?? null;
    } catch { /* non-critical */ }
  }

  // ── Stale run detection ────────────────────────────────────────────────────
  // Separate from today's run — warns when old runs are waiting.
  let staleRun: { id: string; run_date: string; status: string } | null = null;
  try {
    const { data } = await db
      .from("phoenix_daily_runs")
      .select("id, run_date, status")
      .in("status", STALE_PENDING_STATUSES)
      .lt("run_date", currentTaiwanDate)
      .order("run_date", { ascending: false })
      .limit(1);
    if (data?.[0]) staleRun = data[0] as { id: string; run_date: string; status: string };
  } catch { /* non-critical */ }

  // ── If no today run: check if there's a non-today candidate run ────────────
  let latestNonTodayRun: { id: string; run_date: string; status: string } | null = null;
  if (!todayRun) {
    try {
      const { data } = await db
        .from("phoenix_daily_runs")
        .select("id, run_date, status")
        .lt("run_date", currentTaiwanDate)
        .order("run_date", { ascending: false })
        .limit(1);
      if (data?.[0]) {
        const r = data[0] as { id: string; run_date: string; status: string };
        if (!PUBLISHED_STATUSES.includes(r.status)) latestNonTodayRun = r;
      }
    } catch { /* non-critical */ }
  }

  // ── Simulate 17:00 decision ────────────────────────────────────────────────
  let simulationState: SimulationState;
  let wouldGenerate: boolean;
  let reason: string;
  let selectedTopicStatus: "manual" | "auto_possible" | "none" = "none";

  if (!todayRun) {
    if (latestNonTodayRun) {
      simulationState = "blocked_stale_run";
      wouldGenerate = false;
      reason = `找到候選 run（${latestNonTodayRun.run_date}），但不是今天的 run，17:00 不會使用舊 run。`;
    } else {
      simulationState = "no_fresh_run";
      wouldGenerate = false;
      reason = "今天尚無 fresh daily run，17:00 不會生成。";
    }
  } else if (alreadyPublished || hasPlatformMediaId) {
    simulationState = "blocked_already_published";
    wouldGenerate = false;
    reason = "此 run 已發布，不可生成。";
  } else if (candidateCount === 0) {
    simulationState = "blocked_no_candidates";
    wouldGenerate = false;
    reason = "今天沒有主題候選，17:00 不會生成。";
  } else if (todayRun.selected_topic_id) {
    simulationState = "ready_to_generate_today";
    wouldGenerate = true;
    reason = "今天的 run 已準備好，17:00 可生成。";
    selectedTopicStatus = "manual";
  } else {
    simulationState = "would_auto_select_then_generate";
    wouldGenerate = true;
    reason = "今天的 run 尚未手動選題，但已有候選，17:00 會自動選第 1 個後生成。";
    selectedTopicStatus = "auto_possible";
  }

  return NextResponse.json({
    currentTaiwanDate,
    checkedAt,
    todayRun,
    candidateCount,
    selectionSource,
    selectedTopicStatus,
    readySlideCount,
    alreadyPublished,
    hasPlatformMediaId,
    staleRunDetected: !!staleRun,
    staleRun,
    latestNonTodayRun,
    simulationState,
    wouldGenerate,
    reason,
  });
}
