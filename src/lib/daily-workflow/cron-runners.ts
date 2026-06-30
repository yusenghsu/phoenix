// Shared cron execution logic — server-side only.
// Called by both the real cron routes (with auth) and the debug proxy (dev only).
// Never import in client components. Never expose secrets.
import "server-only";
import {
  getOrCreateDailyRun,
  updateRunStatus,
  createTopicCandidates,
  createPublishJob,
  updatePublishJobById,
  logJobEvent,
  deleteRunCandidates,
  forceResetRunForRegeneration,
  getRunDetails,
  getSelectedTopic,
} from "./service";
import { publishInstagramCarousel } from "@/lib/social/instagram-publisher";
import type { PublishStatus } from "./types";
import { generateDailyCarousel } from "./daily-carousel-generator";
import type { DraftSlide } from "./topic-generator";
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
//
// Decision order:
//  1. Count existing candidates
//  2. force=true → always delete + reset + regenerate (not blocked by any status)
//  3. candidates >= 5 → advance to waiting_for_selection, skip
//  4. status=ideas_generating + 0 candidates → stale check (devMode always recovers)
//  5. status=idle → generate
//  6. any other status → skip

export async function runDailyIdeas(devMode: boolean, force = false): Promise<CronRunResult> {
  const runDate = getTaiwanRunDate();
  let runId: string | undefined;
  let stage = "get_or_create_run";

  try {
    let run = await getOrCreateDailyRun(runDate);
    runId = run.id;
    const db = createServerClient();

    stage = "log_triggered_event";
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_ideas",
      status: "triggered",
      message: force ? "daily ideas cron triggered (force regenerate)" : "03:00 daily ideas cron triggered",
      payload: { run_date: runDate, dev_mode: devMode, previous_status: run.status, force },
    });

    // Count existing candidates — this drives all decisions below
    stage = "count_existing_candidates";
    let existingCount = 0;
    if (db) {
      const { data: existing } = await db
        .from("phoenix_topic_candidates")
        .select("id")
        .eq("run_id", run.id);
      existingCount = existing?.length ?? 0;
    }

    // ── FORCE PATH: ignore status, always regenerate ──────────────────────────
    if (force) {
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_ideas",
        status: "force_regenerate_requested",
        message: `Force regenerate requested (current status: ${run.status}, existing candidates: ${existingCount})`,
        payload: { run_date: runDate, previous_status: run.status, existing_count: existingCount },
      });

      stage = "force_delete_candidates";
      const deleted = await deleteRunCandidates(run.id);
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_ideas",
        status: "candidates_deleted",
        message: `Deleted ${deleted} existing candidates`,
        payload: { run_date: runDate, deleted_count: deleted },
      });

      stage = "force_reset_run";
      run = await forceResetRunForRegeneration(run.id);
      existingCount = 0;
      // Fall through to generation below
    }
    // ── NORMAL PATH: decisions based on candidate count + status ─────────────
    else if (existingCount >= 5) {
      // Already have enough candidates — advance status and skip
      if (["idle", "ideas_generating", "ideas_ready"].includes(run.status)) {
        await updateRunStatus(run.id, "waiting_for_selection");
      }
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_ideas",
        status: "skipped_existing_candidates",
        message: `Already have ${existingCount} candidates — advancing to waiting_for_selection`,
        payload: { run_date: runDate, candidate_count: existingCount },
      });
      return {
        ok: true,
        job_type: "daily_ideas",
        status: "waiting_for_selection",
        run_date: runDate,
        run_id: run.id,
        dev_mode: devMode,
        message: `Already have ${existingCount} candidates — waiting for selection`,
        skipped: true,
        existing_candidate_count: existingCount,
      };
    } else if (run.status === "ideas_generating" && existingCount === 0) {
      // Stuck in ideas_generating with no candidates — check if stale
      const updatedAt = run.updated_at ? new Date(run.updated_at).getTime() : 0;
      const staleThresholdMs = 2 * 60 * 1000;
      const isStale = Date.now() - updatedAt > staleThresholdMs;

      if (isStale || devMode) {
        // Dev always recovers; production recovers after 2 min
        run = await updateRunStatus(run.id, "idle");
        await logCronTriggered({
          runId: run.id,
          jobType: "daily_ideas",
          status: "stale_recovered",
          message: "Recovered stale ideas_generating run with no candidates",
          payload: { run_date: runDate, stale: isStale, dev_mode: devMode },
        });
        // Fall through to generation below
      } else {
        // Production: generation started < 2 min ago — let it complete
        return {
          ok: true,
          job_type: "daily_ideas",
          status: "ideas_generating",
          run_date: runDate,
          run_id: run.id,
          dev_mode: devMode,
          message: "Generation already in progress (started < 2 min ago)",
        };
      }
    } else if (run.status !== "idle") {
      // Any other non-idle, non-stuck status — skip
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_ideas",
        status: "skipped_non_idle",
        message: `Run in status: ${run.status} — skipping`,
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
    // else: run.status === "idle" → fall through to generation

    // ── GENERATION PHASE (reached by force, stale recovery, or idle) ──────────

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
      force: force || undefined,
    });

    // Generate candidates via OpenAI (fallback to demo — never throws)
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
      payload: { run_date: runDate, count: result.candidates.length, used_fallback: result.usedFallback, force },
    });

    // Advance to ideas_ready → waiting_for_selection
    stage = "update_status_ideas_ready";
    await updateRunStatus(run.id, "ideas_ready");

    stage = "update_status_waiting_for_selection";
    const updatedRun = await updateRunStatus(run.id, "waiting_for_selection");
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_ideas",
      status: "waiting_for_selection",
      message: "Run is now waiting for topic selection",
      payload: { run_date: runDate, force },
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
      force_regenerated: force,
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
          payload: { stage, error: true, run_date: runDate, force },
        });
      } catch { /* don't mask the real error */ }
    }
    return buildError({ route: "daily_ideas", stage, error: err, runDate, runId, devMode });
  }
}

// ── daily-generate ────────────────────────────────────────────────────────────
// Generates 8 motion carousel slides from selected topic.
// Pipeline per slide: keyframe (OpenAI) → motion (Runway) → 4:5 compose (ffmpeg).
// Sequential — no parallel Runway calls. Stops on any slide failure.
// Resumes by skipping slides already at final_ratio_status = "passed_4_5".
// No LINE, no Instagram.

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

    stage = "check_not_already_generating";
    if (run.status === "generating") {
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_generate",
        status: "locked",
        message: "Generation already in progress — duplicate call ignored",
        payload: { run_date: runDate, dev_mode: devMode, current_status: run.status },
      });
      return {
        ok: true,
        job_type: "daily_generate",
        status: "locked",
        run_date: runDate,
        run_id: run.id,
        dev_mode: devMode,
        message: "Generation already in progress — not starting a second job",
        locked: true,
        skipped: true,
      };
    }

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

    // Already fully complete — return early
    if (run.status === "ready_to_publish" || run.status === "published") {
      return {
        ok: true,
        job_type: "daily_generate",
        status: run.status,
        run_date: runDate,
        run_id: run.id,
        dev_mode: devMode,
        message: `Already ${run.status} — skipping`,
        skipped: true,
      };
    }

    // Load existing slides for resume logic
    stage = "load_existing_slides";
    const { slides: existingSlides } = await getRunDetails(run.id);
    const alreadyReadyCount = existingSlides.filter((s) => s.final_ratio_status === "passed_4_5").length;
    if (alreadyReadyCount === 8) {
      stage = "update_status_ready_to_publish";
      await updateRunStatus(run.id, "ready_to_publish", { generation_complete_at: new Date().toISOString() });
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_generate",
        status: "generation_complete",
        message: "8/8 slides already READY — advancing to ready_to_publish",
        payload: { run_date: runDate, ready_count: 8 },
      });
      return {
        ok: true,
        job_type: "daily_generate",
        status: "ready_to_publish",
        run_date: runDate,
        run_id: run.id,
        dev_mode: devMode,
        message: "8/8 slides READY — ready_to_publish",
        ready_count: 8,
        skipped: true,
      };
    }

    // Load selected topic with draft_slides
    stage = "load_selected_topic";
    const selectedTopic = await getSelectedTopic(run.id);
    if (!selectedTopic) {
      throw new Error("Selected topic not found in phoenix_topic_candidates");
    }
    const draftSlides = (selectedTopic.draft_slides ?? []) as DraftSlide[];
    if (draftSlides.length < 8) {
      throw new Error(`Selected topic has only ${draftSlides.length} draft slides — expected 8`);
    }

    // Mark as generation_queued then generating
    stage = "update_status_generation_queued";
    await updateRunStatus(run.id, "generation_queued", { generation_queued_at: new Date().toISOString() });
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_generate",
      status: "generation_queued",
      message: `Topic selected — starting carousel generation (${alreadyReadyCount}/8 slides already READY)`,
      payload: { run_date: runDate, selected_topic_id: run.selected_topic_id, already_ready: alreadyReadyCount },
    });

    stage = "update_status_generating";
    await updateRunStatus(run.id, "generating");

    // ── Run full pipeline ─────────────────────────────────────────────────────
    stage = "generate_carousel";
    const genResult = await generateDailyCarousel({
      runId: run.id,
      runDate,
      draftSlides,
      existingSlides,
    });

    const totalReady = genResult.ready_count + alreadyReadyCount;

    // Log generation outcome
    if (genResult.stopped_early) {
      await logCronTriggered({
        runId: run.id,
        jobType: "daily_generate",
        status: "generation_partial",
        message: `Stopped at slide ${genResult.stop_slide_no} — ${totalReady}/8 READY. Error: ${genResult.stop_reason ?? "unknown"}`,
        payload: { run_date: runDate, ready_count: totalReady, stop_slide_no: genResult.stop_slide_no, stop_reason: genResult.stop_reason },
      });
      return {
        ok: false,
        job_type: "daily_generate",
        status: "generating",
        run_date: runDate,
        run_id: run.id,
        dev_mode: devMode,
        message: `Generation stopped at slide ${genResult.stop_slide_no} — ${totalReady}/8 READY`,
        ready_count: totalReady,
        stop_slide_no: genResult.stop_slide_no,
        stage: "generate_carousel",
        errorCode: "slide_generation_failed",
        errorMessage: genResult.stop_reason,
        devHint: `Check server logs for slide ${genResult.stop_slide_no}. Retry 測試 17:00 生成 Cron to resume.`,
      };
    }

    // All 8 slides processed successfully
    stage = "update_status_ready_to_publish";
    await updateRunStatus(run.id, "ready_to_publish", {
      generation_complete_at: new Date().toISOString(),
      ready_slide_count: totalReady,
    });
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_generate",
      status: "generation_complete",
      message: `8/8 slides READY — ready_to_publish`,
      payload: { run_date: runDate, ready_count: totalReady },
    });

    return {
      ok: true,
      job_type: "daily_generate",
      status: "ready_to_publish",
      run_date: runDate,
      run_id: run.id,
      dev_mode: devMode,
      message: "8/8 slides READY — generation complete",
      ready_count: totalReady,
    };

  } catch (err) {
    if (runId) {
      try {
        await updateRunStatus(runId, "failed", { error_at: new Date().toISOString(), failed_stage: stage });
      } catch { /* don't mask the real error */ }
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
// Instagram carousel publish preflight.
// v1: dry-run / preflight only — never calls Instagram.
// Safety switch: PHOENIX_AUTO_PUBLISH_ENABLED must = "true" to proceed past dry-run.
// Blocked by: local media URLs, missing META env, safety switch.
// No LINE, no real IG post in v1.

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

    // Already published — skip
    if (run.status === "published") {
      return {
        ok: true,
        job_type: "daily_publish",
        status: "skipped_already_published",
        run_date: runDate,
        run_id: run.id,
        dev_mode: devMode,
        message: "Already published today — skipped",
        skipped: true,
      };
    }

    // Load run details: slides + existing publish jobs
    stage = "load_run_details";
    const { slides, publishJobs } = await getRunDetails(run.id);

    stage = "count_ready_slides";
    const readySlides = slides.filter((s) => s.final_ratio_status === "passed_4_5");
    const readyCount = readySlides.length;

    if (readyCount < 8) {
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

    // Get or create publish job — never duplicate
    stage = "get_or_create_publish_job";
    let publishJob = publishJobs.find((j) => j.platform === "instagram") ?? null;

    if (publishJob?.status === "published") {
      return {
        ok: true,
        job_type: "daily_publish",
        status: "skipped_already_published",
        run_date: runDate,
        run_id: run.id,
        dev_mode: devMode,
        message: "Instagram publish job already published — skipped",
        skipped: true,
      };
    }

    if (!publishJob) {
      publishJob = await createPublishJob({
        run_id: run.id,
        platform: "instagram",
        status: "pending",
        scheduled_at: new Date().toISOString(),
        metadata: { created_by: "daily_publish_cron" },
      });
    }

    // Get caption from selected topic
    stage = "load_caption";
    const selectedTopic = await getSelectedTopic(run.id);
    const caption = selectedTopic?.draft_caption ?? "";

    // Run Instagram publish preflight
    stage = "run_preflight";
    const publishResult = await publishInstagramCarousel({
      runId: run.id,
      caption,
      slides: readySlides.map((s) => ({
        slideNo: s.slide_no,
        finalVideoUrl: s.final_video_url ?? "",
        mimeType: "video/mp4",
      })),
    });

    // Update publish job with preflight result
    stage = "update_publish_job";
    await updatePublishJobById(publishJob.id, {
      status: publishResult.status as PublishStatus,
      caption: caption || undefined,
      error_code: publishResult.errorCode,
      error_message: publishResult.errorMessage,
      ...(publishResult.platformMediaId
        ? { platform_media_id: publishResult.platformMediaId, published_at: new Date().toISOString() }
        : {}),
      metadata: {
        created_by: "daily_publish_cron",
        dry_run: publishResult.dryRun,
        preflight: publishResult.preflight,
        error_code: publishResult.errorCode,
        error_message: publishResult.errorMessage,
      },
    });

    // Log publish event
    await logCronTriggered({
      runId: run.id,
      jobType: "daily_publish",
      status: publishResult.status,
      message: `Instagram preflight result: ${publishResult.status} — ${publishResult.errorMessage ?? "ok"}`,
      payload: {
        run_date: runDate,
        dry_run: publishResult.dryRun,
        error_code: publishResult.errorCode,
        auto_publish_enabled: publishResult.preflight.autoPublishEnabled,
        has_meta_config: publishResult.preflight.hasMetaConfig,
        media_urls_public: publishResult.preflight.mediaUrlsPublic,
      },
    });

    // Update run status
    stage = "update_run_status";
    if (publishResult.status === "published") {
      await updateRunStatus(run.id, "published", { published_at: new Date().toISOString() });
    } else {
      await updateRunStatus(run.id, "ready_to_publish", {
        last_publish_attempt: new Date().toISOString(),
        last_publish_status: publishResult.status,
      });
    }

    return {
      ok: publishResult.ok,
      job_type: "daily_publish",
      status: publishResult.status,
      run_date: runDate,
      run_id: run.id,
      dev_mode: devMode,
      message: publishResult.errorMessage ?? publishResult.status,
      dry_run: publishResult.dryRun,
      preflight: publishResult.preflight,
      ready_count: readyCount,
      ...(publishResult.ok === false
        ? {
            stage: "run_preflight",
            errorCode: publishResult.errorCode ?? undefined,
            errorMessage: publishResult.errorMessage ?? undefined,
            devHint: "Check preflight.blockedUrls or set PHOENIX_AUTO_PUBLISH_ENABLED=true and META env vars.",
          }
        : {}),
    };

  } catch (err) {
    if (runId) {
      try {
        await updateRunStatus(runId, "failed", { error_at: new Date().toISOString(), failed_stage: stage });
      } catch { /* don't mask the real error */ }
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
