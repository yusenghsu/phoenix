// Shared cron execution logic — server-side only.
// Called by both the real cron routes (with auth) and the debug proxy (dev only).
// Never import in client components. Never expose secrets.
import "server-only";
import {
  getOrCreateDailyRun,
  updateRunStatus,
  createTopicCandidates,
  createPublishJob,
  logJobEvent,
  deleteRunCandidates,
  forceResetRunForRegeneration,
} from "./service";
import { getTaiwanRunDate, logCronTriggered } from "./cron";
import { getDailyMarketSignals } from "./market-signals";
import { generateDailyTopicCandidates } from "./topic-generator";
import { createServerClient } from "@/lib/supabase/server";
import type { BrandProfile } from "./types";

export interface CronRunResult {
  ok: boolean;
  job_type: string;
  status: string;
  run_date: string;
  run_id?: string;
  dev_mode: boolean;
  message: string;
  route?: string;
  stage?: string;
  errorCode?: string;
  errorMessage?: string;
  devHint?: string;
  skipped?: boolean;
  [key: string]: unknown;
}

function buildError(opts: {
  route: string;
  stage: string;
  error: unknown;
  runDate: string;
  runId?: string;
  devMode: boolean;
}): CronRunResult {
  const msg = opts.error instanceof Error ? opts.error.message : String(opts.error);
  // Sanitized — never prints secrets or auth headers
  console.error(`[${opts.route}] stage=${opts.stage}`, msg);
  return {
    ok: false,
    job_type: opts.route,
    status: "error",
    run_date: opts.runDate,
    run_id: opts.runId,
    dev_mode: opts.devMode,
    message: `Failed at stage: ${opts.stage}`,
    route: opts.route,
    stage: opts.stage,
    errorCode: "cron_runner_error",
    errorMessage: msg,
    devHint: `Check server console. Stage: ${opts.stage}`,
  };
}

// ── daily-ideas ───────────────────────────────────────────────────────────────
// Generates 5 topic candidates via OpenAI (or demo fallback) then waits for selection.
// No LINE, no Runway, no images, no Instagram.
// force=true: deletes existing candidates + resets run to idle before regenerating.

export async function runDailyIdeas(devMode: boolean, force = false): Promise<CronRunResult> {
  const runDate = getTaiwanRunDate();
  let runId: string | undefined;
  let stage = "get_or_create_run";

  try {
    let run = await getOrCreateDailyRun(runDate);
    runId = run.id;

    stage = "log_triggered_event";
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_ideas",
      status: "triggered",
      message: force ? "daily ideas cron triggered (force regenerate)" : "03:00 daily ideas cron triggered",
      payload: { run_date: runDate, dev_mode: devMode, previous_status: run.status, force },
    });

    // Force: delete existing candidates + reset run to idle
    if (force) {
      stage = "force_delete_candidates";
      const deleted = await deleteRunCandidates(run.id);
      stage = "force_reset_run";
      run = await forceResetRunForRegeneration(run.id);
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_ideas",
        status: "force_regenerated",
        message: `Force regenerate: deleted ${deleted} existing candidates, run reset to idle`,
        payload: { run_date: runDate, deleted_count: deleted },
      });
    }

    // Non-idle status — skip
    if (run.status !== "idle") {
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_ideas",
        status: run.status === "waiting_for_selection" ? "already_waiting" : "skipped_non_idle",
        message: `Run already in status: ${run.status} — skipping`,
        payload: { run_date: runDate },
      });
      return {
        ok: true,
        job_type: "daily_ideas",
        status: run.status,
        run_date: runDate,
        run_id: run.id,
        dev_mode: devMode,
        message: `Run already in status: ${run.status} — skipped`,
        skipped: true,
      };
    }

    // Check for existing candidates (avoid re-burning OpenAI without force)
    stage = "check_existing_candidates";
    const db = createServerClient();
    if (db) {
      const { data: existing } = await db
        .from("phoenix_topic_candidates")
        .select("id")
        .eq("run_id", run.id);
      if (existing && existing.length >= 5) {
        await updateRunStatus(run.id, "waiting_for_selection");
        await logCronTriggered({
          runId: run.id,
          jobType: "daily_ideas",
          status: "skipped_existing_candidates",
          message: `Already have ${existing.length} candidates — advancing to waiting_for_selection`,
          payload: { run_date: runDate, candidate_count: existing.length },
        });
        return {
          ok: true,
          job_type: "daily_ideas",
          status: "waiting_for_selection",
          run_date: runDate,
          run_id: run.id,
          dev_mode: devMode,
          message: `Already have ${existing.length} candidates — waiting for selection`,
          skipped: true,
          existing_candidate_count: existing.length,
        };
      }
    }

    // Load brand profile
    stage = "load_brand_profile";
    let brandProfile: BrandProfile | null = null;
    if (db) {
      const { data } = await db
        .from("phoenix_brand_profiles")
        .select("*")
        .eq("profile_key", run.profile_key)
        .single();
      brandProfile = data as BrandProfile | null;
    }

    // Get market signals
    stage = "get_market_signals";
    const marketSignals = await getDailyMarketSignals(runDate);
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_ideas",
      status: "market_signals_loaded",
      message: `Market signals loaded (source: ${marketSignals.source}, count: ${marketSignals.signals.length})`,
      payload: { run_date: runDate, source: marketSignals.source },
    });

    // Advance to ideas_generating
    stage = "update_status_ideas_generating";
    await updateRunStatus(run.id, "ideas_generating", {
      cron_triggered_at: new Date().toISOString(),
    });

    // Generate candidates (OpenAI or demo fallback — never throws)
    stage = "generate_candidates";
    const result = await generateDailyTopicCandidates({
      runDate,
      profileKey: run.profile_key,
      brandRole: brandProfile?.role ?? "保險業務訓練者 / 富邦人壽訓練組長 / 保險業內容創作者",
      brandAudience: brandProfile?.audience ?? "18-35 歲，保險新人、轉職者、對保險業有興趣但害怕被拒絕的人",
      toneRules: Array.isArray(brandProfile?.tone_rules)
        ? (brandProfile.tone_rules as string[])
        : ["真話", "不迎合", "不雞湯", "有主管視角", "能點破新人盲點", "但不要羞辱新人"],
      contentPillars: Array.isArray(brandProfile?.content_pillars)
        ? (brandProfile.content_pillars as string[])
        : ["新人心態破解", "業務實戰技巧", "保險業真相", "職涯建議"],
      constraints: Array.isArray(brandProfile?.constraints)
        ? (brandProfile.constraints as string[])
        : ["不要心靈雞湯", "不要標題黨", "不要過度吹捧"],
      marketSignals: marketSignals.signals,
      count: 5,
    });

    if (result.usedFallback) {
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_ideas",
        status: "fallback_demo_candidates",
        message: `OPENAI_API_KEY missing — generated deterministic demo candidates. Reason: ${result.fallbackReason ?? "unknown"}`,
        payload: { run_date: runDate, fallback_reason: result.fallbackReason },
      });
    }

    // Write candidates to Supabase
    stage = "create_candidates";
    await createTopicCandidates(run.id, result.candidates);
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_ideas",
      status: "candidates_generated",
      message: `${result.candidates.length} topic candidates generated and saved${result.usedFallback ? " (demo fallback)" : ""}`,
      payload: { run_date: runDate, count: result.candidates.length, used_fallback: result.usedFallback },
    });

    // Advance to ideas_ready then waiting_for_selection
    stage = "update_status_ideas_ready";
    await updateRunStatus(run.id, "ideas_ready");

    stage = "update_status_waiting_for_selection";
    const updatedRun = await updateRunStatus(run.id, "waiting_for_selection");
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_ideas",
      status: "waiting_for_selection",
      message: "Run is now waiting for topic selection",
      payload: { run_date: runDate },
    });

    return {
      ok: true,
      job_type: "daily_ideas",
      status: updatedRun.status,
      run_date: runDate,
      run_id: run.id,
      dev_mode: devMode,
      message: `${result.candidates.length} candidates generated${result.usedFallback ? " (demo fallback)" : ""} — waiting for selection`,
      candidate_count: result.candidates.length,
      used_fallback: result.usedFallback,
    };

  } catch (err) {
    if (runId) {
      try {
        await updateRunStatus(runId, "failed", {
          error_at: new Date().toISOString(),
          failed_stage: stage,
        });
      } catch { /* don't mask the real error */ }
      try {
        await logJobEvent({
          run_id: runId,
          job_type: "daily_ideas",
          status: "failed",
          message: err instanceof Error ? err.message : String(err),
          payload: { stage, error: true, run_date: runDate },
        });
      } catch { /* don't mask the real error */ }
    }
    return buildError({ route: "daily_ideas", stage, error: err, runDate, runId, devMode });
  }
}

// ── daily-generate ────────────────────────────────────────────────────────────
// Skeleton: no Runway, no OpenAI. Marks generation_queued if topic selected.

export async function runDailyGenerate(devMode: boolean): Promise<CronRunResult> {
  const runDate = getTaiwanRunDate();
  let runId: string | undefined;
  let stage = "get_or_create_run";

  try {
    const run = await getOrCreateDailyRun(runDate);
    runId = run.id;

    stage = "log_triggered_event";
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_generate",
      status: "triggered",
      message: "17:00 daily generate cron triggered",
      payload: { run_date: runDate, dev_mode: devMode, previous_status: run.status },
    });

    stage = "check_topic_selected";

    if (!run.selected_topic_id) {
      await updateRunStatus(run.id, "skipped_no_selection", { skipped_at: new Date().toISOString() });
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_generate",
        status: "skipped_no_selection",
        message: "No topic selected by 17:00 — skipping generation",
        payload: { run_date: runDate },
      });
      return {
        ok: true,
        job_type: "daily_generate",
        status: "skipped_no_selection",
        run_date: runDate,
        run_id: run.id,
        dev_mode: devMode,
        message: "Skipped — no topic selected",
        skipped: true,
      };
    }

    stage = "update_status_generation_queued";
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

    return {
      ok: true,
      job_type: "daily_generate",
      status: updatedRun.status,
      run_date: runDate,
      run_id: run.id,
      dev_mode: devMode,
      message: "Generation queued (skeleton — no Runway or OpenAI calls made)",
      selected_topic_id: run.selected_topic_id,
    };

  } catch (err) {
    if (runId) {
      try {
        await logJobEvent({
          run_id: runId,
          job_type: "daily_generate",
          status: "failed",
          message: err instanceof Error ? err.message : String(err),
          payload: { stage, error: true, run_date: runDate },
        });
      } catch { /* don't mask the real error */ }
    }
    return buildError({ route: "daily_generate", stage, error: err, runDate, runId, devMode });
  }
}

// ── daily-publish ─────────────────────────────────────────────────────────────
// Skeleton: no Instagram. Checks 8/8 slides READY and creates publish job skeleton.

export async function runDailyPublish(devMode: boolean): Promise<CronRunResult> {
  const runDate = getTaiwanRunDate();
  let runId: string | undefined;
  let stage = "get_or_create_run";

  try {
    const run = await getOrCreateDailyRun(runDate);
    runId = run.id;

    stage = "log_triggered_event";
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_publish",
      status: "triggered",
      message: "20:00 daily publish cron triggered",
      payload: { run_date: runDate, dev_mode: devMode, previous_status: run.status },
    });

    stage = "count_ready_slides";
    const db = createServerClient();
    let readyCount = 0;
    if (db) {
      const { data } = await db
        .from("phoenix_carousel_slides")
        .select("id")
        .eq("run_id", run.id)
        .eq("final_ratio_status", "passed_4_5");
      readyCount = data?.length ?? 0;
    }

    if (readyCount < 8) {
      stage = "update_status_skipped_not_ready";
      await updateRunStatus(run.id, "skipped_not_ready", {
        skipped_at: new Date().toISOString(),
        ready_slide_count: readyCount,
      });
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_publish",
        status: "skipped_not_ready",
        message: `Only ${readyCount}/8 slides READY — skipping publish`,
        payload: { run_date: runDate, ready_count: readyCount },
      });
      return {
        ok: true,
        job_type: "daily_publish",
        status: "skipped_not_ready",
        run_date: runDate,
        run_id: run.id,
        dev_mode: devMode,
        message: `Skipped — ${readyCount}/8 slides READY`,
        skipped: true,
        ready_count: readyCount,
      };
    }

    stage = "create_publish_job";
    await createPublishJob({
      run_id: run.id,
      platform: "instagram",
      status: "pending",
      scheduled_at: new Date().toISOString(),
      metadata: { created_by: "daily_publish_cron", note: "skeleton — IG not wired yet" },
    });

    stage = "update_status_ready_to_publish";
    await updateRunStatus(run.id, "ready_to_publish", {
      ready_at: new Date().toISOString(),
      ready_slide_count: readyCount,
    });
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_publish",
      status: "ready_to_publish",
      message: "8/8 slides READY — publish job created (skeleton: IG not called)",
      payload: { run_date: runDate, ready_count: readyCount },
    });

    return {
      ok: true,
      job_type: "daily_publish",
      status: "ready_to_publish",
      run_date: runDate,
      run_id: run.id,
      dev_mode: devMode,
      message: "8/8 READY — publish job created (skeleton — Instagram not called)",
      ready_count: readyCount,
    };

  } catch (err) {
    if (runId) {
      try {
        await logJobEvent({
          run_id: runId,
          job_type: "daily_publish",
          status: "failed",
          message: err instanceof Error ? err.message : String(err),
          payload: { stage, error: true, run_date: runDate },
        });
      } catch { /* don't mask the real error */ }
    }
    return buildError({ route: "daily_publish", stage, error: err, runDate, runId, devMode });
  }
}
