// Dev-only route — returns 403 in production.
// Accepts a 4:5 keyframe and generates motion via Runway image-to-video.
// Persists the intermediate video for any slide-0[1-8].

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  isRunwayConfigured,
  generateRunwayVideoFromKeyframe,
  RunwayFailureError,
} from "@/lib/launch/providers/runway-provider";
import {
  updateSlide,
  readManifest,
  slideRouteIdToManifestKey,
  GENERATED_DIR,
  type ManifestSlide,
} from "@/lib/launch/manifest";

export const runtime = "nodejs";
export const maxDuration = 180;

async function resolveToDataUri(keyframeUrl: string): Promise<string> {
  if (keyframeUrl.startsWith("data:")) return keyframeUrl;

  if (keyframeUrl.startsWith("/")) {
    const filePath = path.join(process.cwd(), "public", keyframeUrl);
    const buffer = await fs.readFile(filePath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  }

  const res = await fetch(keyframeUrl);
  if (!res.ok) throw new Error(`Cannot fetch keyframe: ${keyframeUrl} → ${res.status}`);
  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "image/png";
  return `data:${contentType};base64,${Buffer.from(buffer).toString("base64")}`;
}

interface RequestBody {
  slide_id: string;
  keyframe_url: string;
  motion_prompt?: string;
  motion_prompt_mode?: string;
  duration_seconds?: number;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { status: "failed", error: "Debug route not available in production." },
      { status: 403 }
    );
  }

  if (!isRunwayConfigured()) {
    return NextResponse.json({
      status: "failed",
      error: "RUNWAY_API_KEY not configured. Add it to .env.local to enable motion generation.",
    });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ status: "failed", error: "Invalid JSON body." }, { status: 400 });
  }

  const { slide_id, keyframe_url, motion_prompt, motion_prompt_mode, duration_seconds = 5 } = body;

  if (!slide_id || !keyframe_url) {
    return NextResponse.json(
      { status: "failed", error: "slide_id and keyframe_url are required." },
      { status: 400 }
    );
  }

  const validDurations = new Set([4, 5, 6]);
  const safeSeconds = validDurations.has(duration_seconds) ? (duration_seconds as 4 | 5 | 6) : 5;

  const defaultPrompt =
    "Turn this 4:5 vertical keyframe into a subtle cinematic motion background. " +
    "Keep the composition. Very slow push-in camera movement, minimal subject movement, " +
    "keep the left side clean and dark. No text, no logo, no fast motion.";

  // Read current attempt count before generation (non-critical)
  const manifestKey = slideRouteIdToManifestKey(slide_id);
  let currentAttemptCount = 0;
  if (manifestKey) {
    try {
      const currentManifest = await readManifest();
      currentAttemptCount = currentManifest[manifestKey]?.motion_attempt_count ?? 0;
    } catch { /* non-critical */ }
  }

  const safePromptMode = (["low_risk", "normal", "safe"].includes(motion_prompt_mode ?? "")
    ? motion_prompt_mode
    : "normal") as ManifestSlide["motion_prompt_mode"];

  try {
    const keyframeDataUri = await resolveToDataUri(keyframe_url);

    const { video_url, generated_at } = await generateRunwayVideoFromKeyframe({
      slideId: slide_id,
      keyframeDataUri,
      prompt: motion_prompt ?? defaultPrompt,
      durationSeconds: safeSeconds,
    });

    // Persist intermediate video for any slide-0[1-8]
    let localVideoUrl = video_url;
    if (manifestKey) {
      try {
        const videoRes = await fetch(video_url);
        if (videoRes.ok) {
          const buffer = Buffer.from(await videoRes.arrayBuffer());
          await fs.mkdir(GENERATED_DIR, { recursive: true });
          const localFilename = `${slide_id}-runway-intermediate.mp4`;
          await fs.writeFile(path.join(GENERATED_DIR, localFilename), buffer);
          localVideoUrl = `/generated/final-launch-pack/${localFilename}`;
          await updateSlide(manifestKey, {
            runway_motion_status: "generated",
            runway_intermediate_video_url: localVideoUrl,
            provider_ratio_status: "accepted_intermediate",
            provider_ratio_source: "declared_runway_request_ratio",
            final_composition_status: "needed",
            final_ratio_status: "unknown",
            motion_prompt_mode: safePromptMode,
            motion_attempt_count: currentAttemptCount + 1,
            last_failure: null,
          });
          console.log("[generate-motion-from-keyframe] video persisted:", localVideoUrl);
        }
      } catch (persistErr) {
        console.warn("[generate-motion-from-keyframe] persist failed (non-critical):", persistErr);
      }
    }

    return NextResponse.json({
      slide_id,
      status: "video_generated",
      provider: "runway",
      background_video_url: localVideoUrl,
      generated_at,
    });
  } catch (err) {
    if (err instanceof RunwayFailureError) {
      console.error(`[generate-motion-from-keyframe] RunwayFailureError`, {
        slide_id,
        taskId: err.taskId,
        runwayStatus: err.runwayStatus,
        failureCode: err.failureCode,
        failureMessage: err.failureMessage,
      });

      // Persist failure info to manifest (non-critical)
      if (manifestKey) {
        try {
          await updateSlide(manifestKey, {
            motion_prompt_mode: safePromptMode,
            motion_attempt_count: currentAttemptCount + 1,
            last_failure: {
              failure_code: err.failureCode ?? undefined,
              failure_message: err.failureMessage ?? undefined,
              task_id: err.taskId,
              timestamp: new Date().toISOString(),
            },
          });
        } catch { /* non-critical */ }
      }

      return NextResponse.json(
        {
          slide_id,
          status: "failed",
          provider: "runway",
          task_id: err.taskId,
          runway_status: err.runwayStatus,
          failure_code: err.failureCode ?? "unknown",
          failure_message: err.failureMessage ?? "An unexpected error occurred.",
          error: err.message,
          debug_hint: "Check Runway Dashboard → Request History for this task ID.",
        },
        { status: 500 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[generate-motion-from-keyframe] ${slide_id}:`, msg);
    return NextResponse.json({ slide_id, status: "failed", error: msg }, { status: 500 });
  }
}
