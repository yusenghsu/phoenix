// Server-side only. Sequential 8-slide carousel pipeline for the daily workflow.
// Reuses final-launch-pack providers: runway-provider, compose-video.
// No parallel Runway calls. Stops on any slide failure.
// Resumes by skipping slides already at final_ratio_status = "passed_4_5".
// Writes observable progress events for dashboard polling.
import "server-only";
import fs from "fs/promises";
import path from "path";
import { openai } from "@/lib/openai";
import {
  generateRunwayVideoFromKeyframe,
  isRunwayConfigured,
  RunwayFailureError,
} from "@/lib/launch/providers/runway-provider";
import { composeSlide } from "@/lib/launch/compose-video";
import { createOrUpdateSlide, logJobEvent } from "./service";
import type { DraftSlide } from "./topic-generator";
import type { SlideComposeText } from "@/lib/launch/slide-motion-config";
import type { CarouselSlide, CreateOrUpdateSlideInput } from "./types";

const FOOTER_TEXT = "小佑老師｜保險業真話";

const ROLE_SCENE_MAP: Record<string, string> = {
  HOOK: "a young Taiwanese insurance salesperson with an uncertain expression, looking slightly downward at an unsent phone message",
  PAIN: "a Taiwanese person sitting alone with a concerned withdrawn expression, looking at their phone with worry",
  TRUTH: "a Taiwanese business person looking down at papers on a desk thoughtfully, reflecting on the situation",
  REFRAME: "a Taiwanese young person holding a phone with a distant contemplative expression, a moment of insight",
  POV: "a senior Taiwanese business professional standing with calm authority, experienced and grounded",
  METHOD: "two Taiwanese people in a calm face-to-face professional conversation, attentive and focused",
  ACTION: "a Taiwanese business person standing with quiet resolve and a slightly downward gaze, determined",
  CTA: "a Taiwanese person looking at their phone with a thoughtful expression, about to type something meaningful",
};

const COMMON_NEGATIVE =
  "text, readable signs, logos, watermark, cartoon, anime, luxury fashion look, " +
  "influencer style, overbright lighting, distorted hands, extra fingers, fake advertising style, stock photo look";

const COMMON_MOTION_PROMPT =
  "Turn this vertical portrait image into a subtle cinematic video. Keep the same composition. " +
  "Use a very slow push-in camera movement. Keep the person stable and natural. " +
  "Add only slight background light movement. " +
  "No text, no logos, no fast motion, no dramatic acting, no camera shake, no distortion.";

function buildKeyframePrompt(role: string): string {
  const scene = ROLE_SCENE_MAP[role] ?? ROLE_SCENE_MAP.HOOK;
  return (
    `realistic cinematic vertical 4:5 portrait image, Taiwan urban scene, ` +
    `${scene}, ` +
    `warm low-key orange ambient lighting, shallow depth of field, soft bokeh background, ` +
    `clean dark negative space on the left half of the frame for Chinese text overlay, ` +
    `documentary realism, premium dark orange mood, ` +
    `no readable text, no logos, no cartoon, no anime, no exaggerated expression, ` +
    COMMON_NEGATIVE
  );
}

function splitLines(text: string, maxLines: number): string[] {
  const parts = text.split(/(?<=[，。；？！])/).filter((t) => t.trim().length > 0);
  if (parts.length <= 1) return [text.trim()];
  if (parts.length > maxLines) {
    return [...parts.slice(0, maxLines - 1), parts.slice(maxLines - 1).join("")];
  }
  return parts.map((t) => t.trim());
}

function buildComposeText(titleText: string, bodyText: string): SlideComposeText {
  const mainLineTexts = splitLines(titleText, 2);
  const supportLineTexts = splitLines(bodyText, 2);
  return {
    mainLines: mainLineTexts.map((t) => ({ segments: [{ text: t, highlight: false }] })),
    supportLines: supportLineTexts,
    footerText: FOOTER_TEXT,
  };
}

// ── Progress event logging ────────────────────────────────────────────────────

interface ProgressPayload {
  runId: string;
  runDate: string;
  slideNo: number;
  slideRole: string;
  phase: string;
  readyCount: number;
  totalCount: number;
  runwayTaskId?: string;
  currentAssetUrl?: string;
  errorCode?: string;
  errorMessage?: string;
}

async function logProgress(status: string, message: string, p: ProgressPayload): Promise<void> {
  try {
    await logJobEvent({
      run_id: p.runId,
      job_type: "daily_generate",
      status,
      message,
      payload: {
        run_id: p.runId,
        run_date: p.runDate,
        slide_no: p.slideNo,
        slide_role: p.slideRole,
        phase: status,
        ready_count: p.readyCount,
        total_count: p.totalCount,
        runway_task_id: p.runwayTaskId ?? null,
        current_asset_url: p.currentAssetUrl ?? null,
        error_code: p.errorCode ?? null,
        error_message: p.errorMessage ?? null,
      },
    });
  } catch {
    // Non-critical — never let event logging break generation
  }
}

// ── Result types ──────────────────────────────────────────────────────────────

export interface SlideStepResult {
  slide_no: number;
  status: "ready" | "skipped" | "failed";
  error?: string;
}

export interface CarouselGenerationResult {
  slides: SlideStepResult[];
  ready_count: number;
  stopped_early: boolean;
  stop_reason?: string;
  stop_slide_no?: number;
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function generateDailyCarousel({
  runId,
  runDate,
  draftSlides,
  existingSlides,
}: {
  runId: string;
  runDate: string;
  draftSlides: DraftSlide[];
  existingSlides: CarouselSlide[];
}): Promise<CarouselGenerationResult> {
  const results: SlideStepResult[] = [];
  let stoppedEarly = false;
  let stopReason: string | undefined;
  let stopSlideNo: number | undefined;

  const totalCount = draftSlides.length;
  const alreadyReady = existingSlides.filter((s) => s.final_ratio_status === "passed_4_5").length;
  let newlyReady = 0;

  const outputDir = path.join(process.cwd(), "public", "generated", "daily-runs", runDate);
  await fs.mkdir(outputDir, { recursive: true });

  const existingByNo = new Map(existingSlides.map((s) => [s.slide_no, s]));

  const basePayload = (slideNo: number, slideRole: string): ProgressPayload => ({
    runId, runDate, slideNo, slideRole,
    phase: "",
    readyCount: alreadyReady + newlyReady,
    totalCount,
  });

  await logProgress("generation_started", `Starting generation — ${totalCount} slides, ${alreadyReady} already READY`, {
    ...basePayload(0, ""), readyCount: alreadyReady,
  });

  for (const draft of draftSlides) {
    const slideNo = draft.slide_no;
    const slideRole = draft.slide_role;
    const pad = String(slideNo).padStart(2, "0");
    const slideId = `slide-${pad}`;
    const existing = existingByNo.get(slideNo);

    // Skip slides already fully READY
    if (existing?.final_ratio_status === "passed_4_5") {
      results.push({ slide_no: slideNo, status: "skipped" });
      continue;
    }

    let keyframeGenerated = existing?.keyframe_status === "generated";
    let motionGenerated = existing?.motion_status === "generated";

    const p = (): ProgressPayload => ({
      ...basePayload(slideNo, slideRole),
      readyCount: alreadyReady + newlyReady,
    });

    await logProgress("slide_started", `Slide ${slideNo} (${slideRole}) — starting`, p());

    try {
      // ── Step 1: Keyframe ────────────────────────────────────────────────────
      let keyframeDataUri: string;
      const keyframeFilename = `${slideId}-keyframe.png`;
      const keyframePath = path.join(outputDir, keyframeFilename);
      const keyframeUrl = `/generated/daily-runs/${runDate}/${keyframeFilename}`;

      if (keyframeGenerated && existing?.keyframe_url) {
        const buf = await fs.readFile(path.join(process.cwd(), "public", existing.keyframe_url));
        keyframeDataUri = `data:image/png;base64,${buf.toString("base64")}`;
      } else {
        await createOrUpdateSlide(runId, slideNo, {
          slide_role: slideRole,
          title_text: draft.title_text,
          body_text: draft.body_text,
          keyframe_status: "generating",
        });
        await logProgress("keyframe_started", `Slide ${slideNo} — calling OpenAI image API`, {
          ...p(), currentAssetUrl: keyframeUrl,
        });

        const imageModel = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const imgResult = await (openai.images.generate as any)({
          model: imageModel,
          prompt: buildKeyframePrompt(slideRole),
          size: "1024x1536",
          quality: "low",
          n: 1,
        });

        const b64 = imgResult.data?.[0]?.b64_json as string | undefined;
        if (!b64) throw new Error(`OpenAI returned no image for slide ${slideNo}`);

        await fs.writeFile(keyframePath, Buffer.from(b64, "base64"));
        keyframeDataUri = `data:image/png;base64,${b64}`;

        await createOrUpdateSlide(runId, slideNo, {
          keyframe_status: "generated",
          keyframe_url: keyframeUrl,
        });
        keyframeGenerated = true;
        await logProgress("keyframe_generated", `Slide ${slideNo} — keyframe saved`, {
          ...p(), currentAssetUrl: keyframeUrl,
        });
      }

      // ── Step 2: Runway motion ───────────────────────────────────────────────
      let localVideoUrl: string;
      const intermediateFilename = `${slideId}-runway-intermediate.mp4`;
      const intermediatePath = path.join(outputDir, intermediateFilename);
      const intermediateUrl = `/generated/daily-runs/${runDate}/${intermediateFilename}`;

      if (motionGenerated && existing?.runway_intermediate_video_url) {
        localVideoUrl = existing.runway_intermediate_video_url;
      } else {
        if (!isRunwayConfigured()) {
          throw new Error("RUNWAY_API_KEY not configured — cannot generate motion");
        }

        await createOrUpdateSlide(runId, slideNo, { motion_status: "generating" });
        await logProgress("motion_started", `Slide ${slideNo} — submitting to Runway (polling up to 3 min)`, {
          ...p(),
        });

        const { video_url, task_id } = await generateRunwayVideoFromKeyframe({
          slideId,
          keyframeDataUri,
          prompt: COMMON_MOTION_PROMPT,
          durationSeconds: 5,
        });

        const videoRes = await fetch(video_url);
        if (!videoRes.ok) throw new Error(`Failed to download Runway video: ${videoRes.status}`);
        await fs.writeFile(intermediatePath, Buffer.from(await videoRes.arrayBuffer()));
        localVideoUrl = intermediateUrl;

        await createOrUpdateSlide(runId, slideNo, {
          motion_status: "generated",
          runway_task_id: task_id,
          runway_intermediate_video_url: localVideoUrl,
          provider_ratio_status: "accepted_intermediate",
          final_composition_status: "needed",
        });
        motionGenerated = true;
        await logProgress("motion_generated", `Slide ${slideNo} — Runway task ${task_id} complete`, {
          ...p(), runwayTaskId: task_id, currentAssetUrl: localVideoUrl,
        });
      }

      // ── Step 3: ffmpeg 4:5 composition ─────────────────────────────────────
      const finalFilename = `${slideId}-final.mp4`;
      const finalPath = path.join(outputDir, finalFilename);
      const finalUrl = `/generated/daily-runs/${runDate}/${finalFilename}`;

      await createOrUpdateSlide(runId, slideNo, { final_composition_status: "composing" });
      await logProgress("compose_started", `Slide ${slideNo} — starting ffmpeg 4:5 composition`, {
        ...p(), currentAssetUrl: localVideoUrl,
      });

      const composeText = buildComposeText(draft.title_text, draft.body_text);
      const inputPath = path.join(process.cwd(), "public", localVideoUrl);
      await composeSlide(inputPath, finalPath, composeText);

      await createOrUpdateSlide(runId, slideNo, {
        final_video_url: finalUrl,
        final_composition_status: "composed",
        final_ratio_status: "passed_4_5",
        error_code: null,
        error_message: null,
      });

      newlyReady++;
      await logProgress("slide_ready", `Slide ${slideNo} (${slideRole}) READY — ${alreadyReady + newlyReady}/${totalCount} total`, {
        ...p(), currentAssetUrl: finalUrl,
      });

      results.push({ slide_no: slideNo, status: "ready" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const errorCode = err instanceof RunwayFailureError ? "runway_failure" : "pipeline_error";
      const failedAt = !keyframeGenerated ? "keyframe" : !motionGenerated ? "motion" : "compose";
      console.error(`[daily-carousel] slide ${slideNo} failed at ${failedAt}:`, msg);

      const statusUpdate: CreateOrUpdateSlideInput = {
        error_code: errorCode,
        error_message: msg.slice(0, 500),
      };
      if (!keyframeGenerated) statusUpdate.keyframe_status = "failed";
      else if (!motionGenerated) statusUpdate.motion_status = "failed";
      else statusUpdate.final_composition_status = "failed";
      await createOrUpdateSlide(runId, slideNo, statusUpdate).catch(() => { /* non-critical */ });

      await logProgress("generation_failed", `Slide ${slideNo} failed at ${failedAt}: ${msg.slice(0, 200)}`, {
        runId, runDate, slideNo, slideRole,
        phase: `${failedAt}_failed`,
        readyCount: alreadyReady + newlyReady,
        totalCount,
        errorCode,
        errorMessage: msg.slice(0, 500),
      });

      results.push({ slide_no: slideNo, status: "failed", error: msg });
      stoppedEarly = true;
      stopReason = msg;
      stopSlideNo = slideNo;
      break;
    }
  }

  const readyCount = alreadyReady + newlyReady;

  if (!stoppedEarly) {
    await logProgress("generation_complete", `All ${readyCount}/${totalCount} slides READY`, {
      runId, runDate, slideNo: 0, slideRole: "",
      phase: "generation_complete",
      readyCount, totalCount,
    });
  }

  return { slides: results, ready_count: newlyReady, stopped_early: stoppedEarly, stop_reason: stopReason, stop_slide_no: stopSlideNo };
}
