// Dev-only. Production launch checklist for daily Instagram auto-publish.
// Read-only — never calls /media or /media_publish. Never returns tokens or credentials.
import { NextRequest, NextResponse } from "next/server";
import { checkInstagramReadiness } from "@/lib/social/instagram-readiness";
import { getTodayRun, getRunDetails } from "@/lib/daily-workflow/service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const runIdParam = searchParams.get("run_id") ?? undefined;

  // ── Graph API + env readiness (read-only Graph API calls) ─────────────────
  let readiness: Awaited<ReturnType<typeof checkInstagramReadiness>> | null = null;
  try {
    readiness = await checkInstagramReadiness({ runId: runIdParam });
  } catch { /* non-critical */ }

  // ── Run + publish job data ─────────────────────────────────────────────────
  let runId: string | null = runIdParam ?? null;
  let runDate: string | null = null;
  let slideCount = 0;
  let publicUrlCount = 0;
  let publishJobStatus: string | null = null;
  let hasPlatformMediaId = false;
  let publishedAt: string | null = null;
  let hasPublishJob = false;

  try {
    if (!runId) {
      const todayRun = await getTodayRun();
      runId = todayRun?.id ?? null;
    }
    if (runId) {
      const { run, slides, publishJobs } = await getRunDetails(runId);
      runDate = run.run_date;
      const readySlides = slides.filter((s) => s.final_ratio_status === "passed_4_5");
      slideCount = readySlides.length;
      publicUrlCount = readySlides.filter((s) => s.final_video_url?.startsWith("https://")).length;
      const igJob = publishJobs.find((j) => j.platform === "instagram");
      if (igJob) {
        hasPublishJob = true;
        publishJobStatus = igJob.status;
        hasPlatformMediaId = !!igJob.platform_media_id;
        publishedAt = igJob.published_at;
      }
    }
  } catch { /* non-critical */ }

  // ── Derived checklist values ───────────────────────────────────────────────
  const autoPublishEnabled = process.env.PHOENIX_AUTO_PUBLISH_ENABLED === "true";

  const metaEnv = {
    accessToken: !!process.env.META_ACCESS_TOKEN,
    igUserId: !!process.env.META_IG_USER_ID,
    pageId: !!process.env.META_PAGE_ID,
    graphApiVersion: !!process.env.META_GRAPH_API_VERSION,
    version: process.env.META_GRAPH_API_VERSION ?? null,
  };

  const graphApiCheck = readiness?.checks.find((c) => c.key === "graph_api_read");
  const pageBindingCheck = readiness?.checks.find((c) => c.key === "page_ig_binding");

  const graphApi = {
    readTest: {
      status: (graphApiCheck?.status ?? "unknown") as "pass" | "fail" | "warning" | "unknown",
      message: graphApiCheck?.message ?? "未檢查",
    },
    username: readiness?.account?.username ?? null,
    pageBinding: {
      status: (pageBindingCheck?.status ?? "unknown") as "pass" | "fail" | "warning" | "unknown",
      message: pageBindingCheck?.message ?? "未檢查",
    },
  };

  const media = {
    runId,
    runDate,
    slideCount,
    publicUrlCount,
    isReady: slideCount === 8 && publicUrlCount === 8,
  };

  const alreadyPublished =
    publishJobStatus === "published" ||
    publishJobStatus === "manual_published" ||
    hasPlatformMediaId;

  const ELIGIBLE_STATUSES = ["dry_run_ready", "ready_to_publish", "pending"];
  const publishJobBlocked = hasPublishJob && (
    publishJobStatus === "published" || publishJobStatus === "manual_published"
  );
  const publishJobFailed = publishJobStatus === "failed";
  const publishJobEligible =
    !hasPublishJob ||
    (publishJobStatus !== null && ELIGIBLE_STATUSES.includes(publishJobStatus));

  const publishJob = {
    hasJob: hasPublishJob,
    status: publishJobStatus,
    isEligible: publishJobEligible,
    isBlocked: publishJobBlocked,
    isFailed: publishJobFailed,
    hasPlatformMediaId,
    publishedAt,
  };

  const deployment = {
    isVercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    nodeEnv: process.env.NODE_ENV,
  };

  const cronSchedule = {
    ideasAt: "03:00 Asia/Taipei",
    generateAt: "17:00 Asia/Taipei",
    publishAt: "20:00 Asia/Taipei",
    publishGatedByEnvFlag: true,
  };

  const failureSafety = {
    preservesItemContainerIds: true,
    preservesCarouselContainerId: true,
    preservesSanitizedError: true,
    noInfiniteRetry: true,
    noAutoRegeneration: true,
    hasManualResetPath: true,
    hasCarouselRetryPath: true,
  };

  // ── Final recommendation ───────────────────────────────────────────────────
  const allMetaEnvReady =
    metaEnv.accessToken && metaEnv.igUserId && metaEnv.pageId && metaEnv.graphApiVersion;
  const graphApiReady =
    graphApi.readTest.status === "pass" && graphApi.pageBinding.status === "pass";

  let recommendation: {
    status: "not_ready" | "dry_run_ready" | "armed" | "already_published";
    message: string;
    level: "info" | "warning" | "danger" | "success";
  };

  if (alreadyPublished) {
    recommendation = {
      status: "already_published",
      message:
        "今日 run 已發布。Duplicate publish guard 已啟用 — 20:00 cron 不會重複發布。若要啟用 auto-publish 給下一個 run，請在 production 設定 PHOENIX_AUTO_PUBLISH_ENABLED=true。",
      level: "warning",
    };
  } else if (!allMetaEnvReady || !media.isReady || publishJobBlocked) {
    recommendation = {
      status: "not_ready",
      message: "尚未達到正式上線條件 — 請確認 Meta env、8/8 public MP4、publish job 狀態。",
      level: "info",
    };
  } else if (autoPublishEnabled && allMetaEnvReady && graphApiReady && media.isReady && publishJobEligible) {
    recommendation = {
      status: "armed",
      message:
        "Real auto-publish is armed. 20:00 cron 將真實發布到 Instagram。請確認今日內容已準備就緒再離開。",
      level: "danger",
    };
  } else {
    recommendation = {
      status: "dry_run_ready",
      message:
        "Ready for dry-run. Not ready for real auto-publish until PHOENIX_AUTO_PUBLISH_ENABLED=true is set in production env.",
      level: "success",
    };
  }

  return NextResponse.json({
    autoPublishEnabled,
    metaEnv,
    graphApi,
    media,
    publishJob,
    cronSchedule,
    failureSafety,
    deployment,
    recommendation,
    runIdUsed: runId,
    runDateUsed: runDate,
  });
}
