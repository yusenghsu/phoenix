// Read-only rehearsal check for first real auto-publish.
// Never calls publish endpoints. Never mutates jobs. Never exposes token values.
import { NextRequest, NextResponse } from "next/server";
import { getTodayRun, getRunDetails } from "@/lib/daily-workflow/service";
import { createServerClient } from "@/lib/supabase/server";
import type { DailyRun } from "@/lib/daily-workflow/types";

export const runtime = "nodejs";

const ARMABLE_JOB_STATUSES = ["dry_run_ready", "ready_to_publish", "pending"];
const PUBLISHED_STATUSES = ["published", "manual_published"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const runIdParam = searchParams.get("run_id") ?? undefined;

  // ── Deployment context ────────────────────────────────────────────────────
  const deployment = {
    nodeEnv: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelUrl: process.env.VERCEL_URL ?? null,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  };

  const autoPublishEnabled = process.env.PHOENIX_AUTO_PUBLISH_ENABLED === "true";

  // ── Load run ──────────────────────────────────────────────────────────────
  let runId: string | null = runIdParam ?? null;
  let runDate: string | null = null;
  let publicUrlCount = 0;
  let publishJobStatus: string | null = null;
  let hasPlatformMediaId = false;
  let runStatus: string | null = null;

  try {
    if (!runId) {
      // Try today first, then fall back to latest ready/published
      const todayRun = await getTodayRun();
      if (todayRun) {
        runId = todayRun.id;
      } else {
        const db = createServerClient();
        if (db) {
          const { data } = await db
            .from("phoenix_daily_runs")
            .select("*")
            .in("status", ["ready_to_publish", "published", "dry_run_ready"])
            .order("run_date", { ascending: false })
            .limit(1)
            .single();
          if (data) runId = (data as DailyRun).id;
        }
      }
    }

    if (runId) {
      const { run, slides, publishJobs } = await getRunDetails(runId);
      runDate = run.run_date;
      runStatus = run.status;
      const readySlides = slides.filter((s) => s.final_ratio_status === "passed_4_5");
      publicUrlCount = readySlides.filter((s) => s.final_video_url?.startsWith("https://")).length;
      const igJob = publishJobs.find((j) => j.platform === "instagram");
      if (igJob) {
        publishJobStatus = igJob.status;
        hasPlatformMediaId = !!igJob.platform_media_id;
      }
    }
  } catch { /* non-critical — partial data still useful */ }

  // ── Fresh run armability check ────────────────────────────────────────────
  const alreadyPublished =
    PUBLISHED_STATUSES.includes(runStatus ?? "") ||
    hasPlatformMediaId ||
    (publishJobStatus !== null && PUBLISHED_STATUSES.includes(publishJobStatus));

  let isArmable = false;
  let blockedReason: string | null = null;

  if (!runId) {
    blockedReason = "No run found";
  } else if (alreadyPublished) {
    blockedReason =
      "此 run 已發布（status: " +
      (runStatus ?? publishJobStatus ?? "published") +
      "）— 不可作為第一次自動發布測試。請等待下一個新的 8/8 READY run。";
  } else if (publicUrlCount < 8) {
    blockedReason = `Media not ready: ${publicUrlCount}/8 public HTTPS URLs`;
  } else if (
    publishJobStatus !== null &&
    !ARMABLE_JOB_STATUSES.includes(publishJobStatus)
  ) {
    blockedReason = `Publish job status not eligible: ${publishJobStatus}`;
  } else {
    isArmable = true;
  }

  const freshRun = {
    runId,
    runDate,
    runStatus,
    publicUrlCount,
    publishJobStatus,
    hasPlatformMediaId,
    isArmable,
    blockedReason,
  };

  // ── Cron 20:00 simulation (no publish calls) ──────────────────────────────
  let cronWouldPublish = false;
  let cronReason = "";
  const duplicateGuardActive = alreadyPublished;

  if (!autoPublishEnabled) {
    cronWouldPublish = false;
    cronReason = "PHOENIX_AUTO_PUBLISH_ENABLED=false — 20:00 cron remains dry-run only";
  } else if (!runId) {
    cronWouldPublish = false;
    cronReason = "No active run found — nothing to publish";
  } else if (alreadyPublished) {
    cronWouldPublish = false;
    cronReason = "Duplicate guard: this run already has platform_media_id or published status";
  } else if (publicUrlCount < 8) {
    cronWouldPublish = false;
    cronReason = `Media not ready: ${publicUrlCount}/8 public HTTPS URLs (need 8)`;
  } else if (
    publishJobStatus !== null &&
    !ARMABLE_JOB_STATUSES.includes(publishJobStatus)
  ) {
    cronWouldPublish = false;
    cronReason = `Publish job not eligible (status: ${publishJobStatus})`;
  } else {
    cronWouldPublish = true;
    cronReason = "All gates pass — 20:00 cron would attempt a real Instagram publish";
  }

  const cronSimulation = {
    wouldPublish: cronWouldPublish,
    reason: cronReason,
    activeRunId: runId,
    activeRunDate: runDate,
    mediaReadyCount: publicUrlCount,
    publishJobStatus,
    alreadyPublished,
    duplicateGuardActive,
  };

  // ── Recommendation ────────────────────────────────────────────────────────
  type RecommendationStatus =
    | "safe_dry_run"
    | "blocked_already_published"
    | "ready_to_arm_next_run"
    | "armed_for_real_publish"
    | "not_ready";

  let recommendationStatus: RecommendationStatus;
  let recommendationMessage: string;
  let recommendationLevel: "info" | "success" | "warning" | "danger";

  if (alreadyPublished && !autoPublishEnabled) {
    recommendationStatus = "blocked_already_published";
    recommendationMessage =
      "目前 run 已發布，不能用來測第一次自動發布。請等待下一個新的 8/8 READY run。";
    recommendationLevel = "warning";
  } else if (autoPublishEnabled && isArmable && cronWouldPublish) {
    recommendationStatus = "armed_for_real_publish";
    recommendationMessage =
      "Production 已進入真發模式。20:00 cron 可能發布到 Instagram。請確認 run 未發布且 8/8 READY。";
    recommendationLevel = "danger";
  } else if (!autoPublishEnabled && isArmable) {
    recommendationStatus = "ready_to_arm_next_run";
    recommendationMessage =
      "下一個新的 8/8 READY run 可作為第一次自動發布測試。若要真發，請只在 Production Vercel env 設定 PHOENIX_AUTO_PUBLISH_ENABLED=true，並重新部署。";
    recommendationLevel = "success";
  } else if (!autoPublishEnabled) {
    recommendationStatus = "safe_dry_run";
    recommendationMessage =
      "目前是 dry-run 安全狀態。不要開 true，除非下一個新的 8/8 READY run 已準備好。";
    recommendationLevel = "info";
  } else {
    recommendationStatus = "not_ready";
    recommendationMessage = "尚未達到第一次自動發布條件。";
    recommendationLevel = "info";
  }

  const recommendation = {
    status: recommendationStatus,
    message: recommendationMessage,
    level: recommendationLevel,
  };

  return NextResponse.json({
    deployment,
    autoPublishEnabled,
    freshRun,
    cronSimulation,
    recommendation,
  });
}
