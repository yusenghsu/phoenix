// Read-only cron observability. Never calls cron handlers, never publishes, never mutates state.
// Filters cron executions by status="triggered" (ONLY written by cron runners, never by manual publish).
// Manual publish / carousel retry events appear separately in manualPublishHistory.
import { NextRequest, NextResponse } from "next/server";
import { getTodayRun, getRunDetails } from "@/lib/daily-workflow/service";
import { createServerClient } from "@/lib/supabase/server";
import type { DailyRun, JobEvent } from "@/lib/daily-workflow/types";

export const runtime = "nodejs";

function nextTaipeiTime(hour: number, minute: number): string {
  const now = new Date();
  const taipeiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const candidate = new Date(taipeiNow);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate <= taipeiNow) candidate.setDate(candidate.getDate() + 1);
  const offset = now.getTime() - taipeiNow.getTime();
  return new Date(candidate.getTime() + offset).toISOString();
}

const CRON_TERMINAL_STATUSES = [
  "published", "failed", "dry_run", "dry_run_ready", "dry_run_missing_env",
  "skipped_already_published", "skipped_not_ready", "skipped_existing_candidates",
  "skipped_non_idle", "waiting_for_selection", "ideas_ready", "locked",
];

const STRIP_KEYS = ["access_token", "token", "secret", "authorization", "key", "password", "credential"];

const stripSecrets = (payload: Record<string, unknown>): Record<string, unknown> => {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (STRIP_KEYS.some((b) => k.toLowerCase().includes(b))) continue;
    safe[k] = v;
  }
  return safe;
};

const summarizeEvent = (e: JobEvent) => ({
  triggeredAt: e.created_at,
  jobType: e.job_type,
  status: e.status,
  runId: e.run_id ?? null,
  message: e.message ?? null,
  source: (e.payload as Record<string, unknown>)?.source ?? "unknown",
  payload: stripSecrets(e.payload ?? {}),
});

// Get the last CRON trigger event for a given job_type.
// status="triggered" is ONLY written by the real cron runners (logCronTriggered),
// never by manual publish, carousel retry, or the publisher's internal logEvent.
async function lastCronTrigger(
  db: ReturnType<typeof createServerClient>,
  jobType: string
): Promise<JobEvent | null> {
  if (!db) return null;
  const { data } = await db
    .from("phoenix_job_events")
    .select("*")
    .eq("job_type", jobType)
    .eq("status", "triggered")
    .order("created_at", { ascending: false })
    .limit(1);
  return (data?.[0] as JobEvent) ?? null;
}

// Get the terminal-status outcome for a specific run (same run_id as the trigger).
async function cronOutcomeForRun(
  db: ReturnType<typeof createServerClient>,
  jobType: string,
  runId: string
): Promise<JobEvent | null> {
  if (!db) return null;
  const { data } = await db
    .from("phoenix_job_events")
    .select("*")
    .eq("job_type", jobType)
    .eq("run_id", runId)
    .in("status", CRON_TERMINAL_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1);
  return (data?.[0] as JobEvent) ?? null;
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

  const db = createServerClient();

  // ── Last CRON executions — filtered to real cron triggers ─────────────────
  // "triggered" status is ONLY written by the real cron runners at the very start.
  // The publisher's internal logEvent writes different statuses (publish_started, published, etc.).
  // Manual publish route writes job_type="manual_publish", never job_type="daily_publish" triggered.
  let lastIdeasTrigger: JobEvent | null = null;
  let lastGenerateTrigger: JobEvent | null = null;
  let lastPublishTrigger: JobEvent | null = null;
  let lastIdeasOutcome: JobEvent | null = null;
  let lastGenerateOutcome: JobEvent | null = null;
  let lastPublishOutcome: JobEvent | null = null;

  try {
    [lastIdeasTrigger, lastGenerateTrigger, lastPublishTrigger] = await Promise.all([
      lastCronTrigger(db, "daily_ideas"),
      lastCronTrigger(db, "daily_generate"),
      lastCronTrigger(db, "daily_publish"),
    ]);

    // Fetch terminal-status outcome for the same run as the trigger
    const [ideasOutcome, generateOutcome, publishOutcome] = await Promise.all([
      lastIdeasTrigger?.run_id ? cronOutcomeForRun(db, "daily_ideas", lastIdeasTrigger.run_id) : Promise.resolve(null),
      lastGenerateTrigger?.run_id ? cronOutcomeForRun(db, "daily_generate", lastGenerateTrigger.run_id) : Promise.resolve(null),
      lastPublishTrigger?.run_id ? cronOutcomeForRun(db, "daily_publish", lastPublishTrigger.run_id) : Promise.resolve(null),
    ]);
    lastIdeasOutcome = ideasOutcome;
    lastGenerateOutcome = generateOutcome;
    lastPublishOutcome = publishOutcome;
  } catch { /* non-critical */ }

  const lastExecutions = {
    ideas: lastIdeasTrigger ? { trigger: summarizeEvent(lastIdeasTrigger), outcome: lastIdeasOutcome ? summarizeEvent(lastIdeasOutcome) : null } : null,
    generate: lastGenerateTrigger ? { trigger: summarizeEvent(lastGenerateTrigger), outcome: lastGenerateOutcome ? summarizeEvent(lastGenerateOutcome) : null } : null,
    publish: lastPublishTrigger ? { trigger: summarizeEvent(lastPublishTrigger), outcome: lastPublishOutcome ? summarizeEvent(lastPublishOutcome) : null } : null,
  };

  // ── Manual / Publish Action History ───────────────────────────────────────
  // job_type="manual_publish" is ONLY written by publish-manual/route.ts (reset, retry, manual publish).
  let manualPublishHistory: ReturnType<typeof summarizeEvent>[] = [];
  try {
    if (db) {
      const { data } = await db
        .from("phoenix_job_events")
        .select("*")
        .eq("job_type", "manual_publish")
        .order("created_at", { ascending: false })
        .limit(10);
      manualPublishHistory = ((data ?? []) as JobEvent[]).map(summarizeEvent);
    }
  } catch { /* non-critical */ }

  // ── 20:00 decision audit (current run state) ──────────────────────────────
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
    manualPublishHistory,
    publishAudit,
    nextSchedule,
  });
}
