// Dev-only. One-time manual Instagram carousel publish + failed job reset.
// Returns 403 in production. Never returns or logs META_ACCESS_TOKEN.
// Safety gates enforced by publishInstagramCarousel() — real publish requires PHOENIX_AUTO_PUBLISH_ENABLED=true.
import { NextRequest, NextResponse } from "next/server";
import {
  getRunDetails,
  getSelectedTopic,
  createPublishJob,
  updatePublishJobById,
  logJobEvent,
  updateRunStatus,
} from "@/lib/daily-workflow/service";
import { publishInstagramCarousel } from "@/lib/social/instagram-publisher";
import type { PublishStatus } from "@/lib/daily-workflow/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    run_id?: string;
  };
  const runId = body.run_id;
  if (!runId) {
    return NextResponse.json({ error: "run_id is required." }, { status: 400 });
  }

  // ── Action: reset a failed publish job (no media id/permalink) ──────────────
  if (body.action === "reset_failed_job") {
    try {
      const { publishJobs } = await getRunDetails(runId);
      const job = publishJobs.find((j) => j.platform === "instagram");

      if (!job) {
        return NextResponse.json({ error: "No Instagram publish job found." }, { status: 404 });
      }
      if (job.platform_media_id) {
        return NextResponse.json(
          { error: "Cannot reset — job has platform_media_id (already published to Instagram)." },
          { status: 409 }
        );
      }

      await updatePublishJobById(job.id, {
        status: "dry_run_ready",
        error_code: null,
        error_message: null,
      });

      await logJobEvent({
        run_id: runId,
        job_type: "manual_publish",
        status: "reset",
        message: `Publish job reset to dry_run_ready via debug dashboard (was: ${job.status})`,
        payload: { previous_status: job.status, source: "debug_dashboard" },
      }).catch(() => {});

      const details = await getRunDetails(runId);
      return NextResponse.json({ status: "ok", storage_mode: "supabase", ...details });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ ok: false, status: "error", error: msg }, { status: 500 });
    }
  }

  // ── Action: manual publish ───────────────────────────────────────────────────
  try {
    const { run, slides, publishJobs } = await getRunDetails(runId);

    // Guard: 8 READY slides required
    const readySlides = slides.filter((s) => s.final_ratio_status === "passed_4_5");
    if (readySlides.length < 8) {
      return NextResponse.json({
        ok: false,
        status: "not_ready",
        message: `Only ${readySlides.length}/8 slides READY — cannot publish`,
        ready_count: readySlides.length,
      }, { status: 400 });
    }

    // Guard: never republish
    const existingJob = publishJobs.find((j) => j.platform === "instagram");
    if (existingJob?.status === "published" || existingJob?.status === "manual_published") {
      return NextResponse.json({
        ok: false,
        status: "already_published",
        message: "This run has already been published to Instagram.",
      }, { status: 409 });
    }

    // Get or create publish job
    let publishJob = existingJob ?? null;
    if (!publishJob) {
      publishJob = await createPublishJob({
        run_id: runId,
        platform: "instagram",
        status: "pending",
        scheduled_at: new Date().toISOString(),
        metadata: { created_by: "manual_publish_debug" },
      });
    }

    await logJobEvent({
      run_id: runId,
      job_type: "manual_publish",
      status: "triggered",
      message: "Manual Instagram publish triggered via debug dashboard",
      payload: {
        run_date: run.run_date,
        source: "debug_dashboard",
        ready_slide_count: readySlides.length,
      },
    }).catch(() => {});

    const selectedTopic = await getSelectedTopic(runId);
    const caption = selectedTopic?.draft_caption ?? "";

    // Run publish — safety gates live inside publishInstagramCarousel()
    const publishResult = await publishInstagramCarousel({
      runId,
      caption,
      slides: readySlides.map((s) => ({
        slideNo: s.slide_no,
        finalVideoUrl: s.final_video_url ?? "",
        mimeType: "video/mp4",
      })),
    });

    // Fetch permalink after a real successful publish — never logs token
    let permalink: string | null = null;
    if (publishResult.status === "published" && publishResult.platformMediaId) {
      try {
        const version = process.env.META_GRAPH_API_VERSION ?? "v23.0";
        const permaParams = new URLSearchParams({
          fields: "id,permalink",
          access_token: process.env.META_ACCESS_TOKEN!,
        });
        const permaRes = await fetch(
          `https://graph.facebook.com/${version}/${publishResult.platformMediaId}?${permaParams}`
        );
        if (permaRes.ok) {
          const permaData = (await permaRes.json()) as { permalink?: string };
          permalink = permaData.permalink ?? null;
        }
      } catch { /* non-critical */ }
    }

    // Determine final publish job status
    // Code-2 carousel failure is not permanently failed — keep as failed but note transience
    const finalJobStatus: PublishStatus =
      publishResult.status === "published" ? "manual_published" : (publishResult.status as PublishStatus);

    await updatePublishJobById(publishJob.id, {
      status: finalJobStatus,
      caption: caption || undefined,
      error_code: publishResult.errorCode,
      error_message: publishResult.errorMessage,
      ...(publishResult.platformMediaId
        ? { platform_media_id: publishResult.platformMediaId, published_at: new Date().toISOString() }
        : {}),
      metadata: {
        created_by: "manual_publish_debug",
        dry_run: publishResult.dryRun,
        preflight: publishResult.preflight,
        error_code: publishResult.errorCode,
        error_message: publishResult.errorMessage,
        container_ids_count: publishResult.containerIds.length,
        carousel_container_id: publishResult.carouselContainerId,
        carousel_container_attempts: publishResult.carouselContainerAttempts,
        item_container_count: publishResult.itemContainerStatuses.length,
        permalink,
        ...(publishResult.stage ? { error_stage: publishResult.stage } : {}),
      },
    });

    if (publishResult.status === "published") {
      await updateRunStatus(runId, "published", { published_at: new Date().toISOString() });
      await logJobEvent({
        run_id: runId,
        job_type: "manual_publish",
        status: "succeeded",
        message: `Instagram carousel published manually. media_id: ${publishResult.platformMediaId}`,
        payload: {
          platform_media_id: publishResult.platformMediaId,
          carousel_container_id: publishResult.carouselContainerId,
          container_count: publishResult.containerIds.length,
          carousel_attempts: publishResult.carouselContainerAttempts,
          permalink,
        },
      }).catch(() => {});
    } else {
      await logJobEvent({
        run_id: runId,
        job_type: "manual_publish",
        status: publishResult.status,
        message: publishResult.errorMessage ?? publishResult.status,
        payload: {
          dry_run: publishResult.dryRun,
          error_code: publishResult.errorCode,
          stage: publishResult.stage,
          item_container_count: publishResult.itemContainerStatuses.length,
          carousel_attempts: publishResult.carouselContainerAttempts,
        },
      }).catch(() => {});
    }

    const details = await getRunDetails(runId);

    return NextResponse.json({
      ok: publishResult.ok,
      status: publishResult.status,
      dryRun: publishResult.dryRun,
      platformMediaId: publishResult.platformMediaId,
      permalink,
      carouselContainerId: publishResult.carouselContainerId,
      containerCount: publishResult.containerIds.length,
      carouselContainerAttempts: publishResult.carouselContainerAttempts,
      itemContainerStatuses: publishResult.itemContainerStatuses,
      errorCode: publishResult.errorCode,
      errorMessage: publishResult.errorMessage,
      stage: publishResult.stage,
      preflight: publishResult.preflight,
      storage_mode: "supabase",
      ...details,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, status: "error", error: msg }, { status: 500 });
  }
}
