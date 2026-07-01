// Read-only cron observability. Never calls cron handlers, never publishes, never mutates state.
import { NextRequest, NextResponse } from "next/server";
import { getTodayRun, getRunDetails } from "@/lib/daily-workflow/service";
import { createServerClient } from "@/lib/supabase/server";
import type { DailyRun, JobEvent } from "@/lib/daily-workflow/types";

export const runtime = "nodejs";

// Compute next occurrence of HH:MM in Asia/Taipei after "now".
function nextTaipeiTime(hour: number, minute: number): string {
  const now = new Date();
  // Build today's target in Taipei as a UTC instant
  const taipeiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const candidate = new Date(taipeiNow);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate <= taipeiNow) candidate.setDate(candidate.getDate() + 1);
  // Reconstruct as UTC from the Taipei wall-clock
  const offset = now.getTime() - taipeiNow.getTime();
  return new Date(candidate.getTime() + offset).toISOString();
}

// Pull the most recent event(s) for a given job_type from the global events table.
async function latestEventsByType(
  db: ReturnType<typeof createServerClient>,
  jobType: string,
  limit = 1
): Promise<JobEvent[]> {
  if (!db) return [];
  const { data } = await db
    .from("phoenix_job_events")
    .select("*")
    .eq("job_type", jobType)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as JobEvent[];
}

const ARMABLE_JOB_STATUSES = ["dry_run_ready", "ready_to_publish", "pending"];
const PUBLISHED_STATUSES = ["published", "manual_published"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const runIdParam = searchParams.get("run_id") ?? undefined;

  // ── Runtime ───────────────────────────────────────────────────────────────
  const nowIso = new Date().toISOString();
  const currentTaiwanTime = new Date().toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });

  const runtime = {
    nodeEnv: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelUrl: process.env.VERCEL_URL ?? null,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    currentTaiwanTime,
    checkedAt: nowIso,
  };

  // ── Cron schedule (static) ────────────────────────────────────────────────
  const cronSchedule = [
    {
      time: "03:00 Asia/Taipei",
      purpose: "daily_ideas",
      label: "主題候選生成",
      provider: "OpenAI only",
      callsInstagram: false,
      expectedResult: "5 topic candidates saved to DB",
    },
    {
      time: "17:00 Asia/Taipei",
      purpose: "daily_generate",
      label: "8-slide carousel generation",
      provider: "OpenAI (keyframe) + Runway (motion) + Supabase upload",
      callsInstagram: false,
      consumesCredits: true,
      expectedResult: "8/8 READY run",
    },
    {
      time: "20:00 Asia/Taipei",
      purpose: "daily_publish",
      label: "Instagram publish",
      provider: "Meta Graph API (gated)",
      callsInstagram: true,
      gatedByEnvFlag: true,
      expectedResult: "published post or dry-run (depending on flag)",
    },
  ];

  // ── Next scheduled times ──────────────────────────────────────────────────
  const nextSchedule = {
    ideas: nextTaipeiTime(3, 0),
    generate: nextTaipeiTime(17, 0),
    publish: nextTaipeiTime(20, 0),
  };

  // ── Last cron executions (read from job events) ───────────────────────────
  const db = createServerClient();

  let lastIdeasEvent: JobEvent | null = null;
  let lastGenerateEvent: JobEvent | null = null;
  let lastPublishEvent: JobEvent | null = null;

  try {
    const [ideasEvents, generateEvents, publishEvents] = await Promise.all([
      latestEventsByType(db, "daily_ideas"),
      latestEventsByType(db, "daily_generate"),
      latestEventsByType(db, "daily_publish"),
    ]);
    lastIdeasEvent = ideasEvents[0] ?? null;
    lastGenerateEvent = generateEvents[0] ?? null;
    lastPublishEvent = publishEvents[0] ?? null;
  } catch { /* non-critical */ }

  const stripSecrets = (payload: Record<string, unknown>): Record<string, unknown> => {
    const safe: Record<string, unknown> = {};
    const blocklist = ["access_token", "token", "secret", "authorization", "key", "password", "credential"];
    for (const [k, v] of Object.entries(payload)) {
      if (blocklist.some((b) => k.toLowerCase().includes(b))) continue;
      safe[k] = v;
    }
    return safe;
  };

  const summarizeEvent = (e: JobEvent | null) => {
    if (!e) return null;
    return {
      triggeredAt: e.created_at,
      jobType: e.job_type,
      status: e.status,
      runId: e.run_id ?? null,
      message: e.message ?? null,
      payload: stripSecrets(e.payload ?? {}),
    };
  };

  const lastExecutions = {
    ideas: summarizeEvent(lastIdeasEvent),
    generate: summarizeEvent(lastGenerateEvent),
    publish: summarizeEvent(lastPublishEvent),
  };

  // ── 20:00 decision audit (read current run state) ─────────────────────────
  const autoPublishEnabled = process.env.PHOENIX_AUTO_PUBLISH_ENABLED === "true";

  let auditRunId: string | null = runIdParam ?? null;
  let auditRunDate: string | null = null;
  let auditRunStatus: string | null = null;
  let mediaReadyCount = 0;
  let publishJobStatus: string | null = null;
  let hasPlatformMediaId = false;

  try {
    if (!auditRunId) {
      const todayRun = await getTodayRun();
      if (todayRun) {
        auditRunId = todayRun.id;
      } else if (db) {
        const { data } = await db
          .from("phoenix_daily_runs")
          .select("*")
          .in("status", ["ready_to_publish", "published", "dry_run_ready", "manual_published"])
          .order("run_date", { ascending: false })
          .limit(1)
          .single();
        if (data) auditRunId = (data as DailyRun).id;
      }
    }

    if (auditRunId) {
      const { run, slides, publishJobs } = await getRunDetails(auditRunId);
      auditRunDate = run.run_date;
      auditRunStatus = run.status;
      const readySlides = slides.filter((s) => s.final_ratio_status === "passed_4_5");
      mediaReadyCount = readySlides.filter((s) => s.final_video_url?.startsWith("https://")).length;
      const igJob = publishJobs.find((j) => j.platform === "instagram");
      if (igJob) {
        publishJobStatus = igJob.status;
        hasPlatformMediaId = !!igJob.platform_media_id;
      }
    }
  } catch { /* non-critical */ }

  const alreadyPublished =
    PUBLISHED_STATUSES.includes(auditRunStatus ?? "") ||
    hasPlatformMediaId ||
    (publishJobStatus !== null && PUBLISHED_STATUSES.includes(publishJobStatus));

  const duplicateGuardActive = alreadyPublished;

  let wouldPublish = false;
  let publishDecisionReason = "";

  if (!autoPublishEnabled) {
    wouldPublish = false;
    publishDecisionReason = "PHOENIX_AUTO_PUBLISH_ENABLED=false — 20:00 cron dry-run only，不會呼叫 Instagram。";
  } else if (!auditRunId) {
    wouldPublish = false;
    publishDecisionReason = "No active run found — nothing to publish.";
  } else if (alreadyPublished) {
    wouldPublish = false;
    publishDecisionReason = "Duplicate guard active: run already has platform_media_id or published status.";
  } else if (mediaReadyCount < 8) {
    wouldPublish = false;
    publishDecisionReason = `Media not ready: ${mediaReadyCount}/8 public HTTPS URLs.`;
  } else if (publishJobStatus !== null && !ARMABLE_JOB_STATUSES.includes(publishJobStatus)) {
    wouldPublish = false;
    publishDecisionReason = `Publish job not eligible (status: ${publishJobStatus}).`;
  } else {
    wouldPublish = true;
    publishDecisionReason = "All gates pass — 20:00 cron would attempt a real Instagram publish.";
  }

  const publishAudit = {
    autoPublishEnabled,
    runId: auditRunId,
    runDate: auditRunDate,
    runStatus: auditRunStatus,
    mediaReadyCount,
    publishJobStatus,
    alreadyPublished,
    duplicateGuardActive,
    wouldPublish,
    reason: publishDecisionReason,
  };

  return NextResponse.json({
    runtime,
    cronSchedule,
    lastExecutions,
    publishAudit,
    nextSchedule,
  });
}
