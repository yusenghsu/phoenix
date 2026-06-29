// Dev-only route — returns 403 in production.
// Accepts a 4:5 keyframe (relative path or data URI) and generates motion via Runway image-to-video.
// The keyframe is resolved to a base64 data URI before being sent to Runway.
// Output ratio must be validated by the client after generation — no ratio is guaranteed from input dimensions.

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  isRunwayConfigured,
  generateRunwayVideoFromKeyframe,
  RunwayFailureError,
} from "@/lib/launch/providers/runway-provider";
import { updateSlide01, GENERATED_DIR } from "@/lib/launch/manifest";

export const runtime = "nodejs";
export const maxDuration = 180;

const SLIDE1_MOTION_PROMPT =
  "Turn this 4:5 vertical keyframe into a subtle cinematic motion background. " +
  "Keep the composition and aspect ratio. The young insurance salesperson stays on the right side, " +
  "looking at the phone. Add very slow push-in camera movement, soft passing car lights in the background, " +
  "subtle phone glow on the face, minimal subject movement, quiet night atmosphere, restrained emotional tension. " +
  "Keep the left side clean and dark for Chinese text overlay. " +
  "No text, no logo, no fast motion, no exaggerated acting, no warped face, no distorted hands.";

async function resolveToDataUri(keyframeUrl: string): Promise<string> {
  if (keyframeUrl.startsWith("data:")) return keyframeUrl;

  if (keyframeUrl.startsWith("/")) {
    // Relative URL from /public — read the actual file
    const filePath = path.join(process.cwd(), "public", keyframeUrl);
    const buffer = await fs.readFile(filePath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  }

  // Absolute URL — fetch and convert (handles http://localhost:3000/...)
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
      error:
        "RUNWAY_API_KEY not configured. Add it to .env.local to enable motion generation.",
    });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ status: "failed", error: "Invalid JSON body." }, { status: 400 });
  }

  const { slide_id, keyframe_url, motion_prompt = SLIDE1_MOTION_PROMPT, duration_seconds = 5 } = body;

  if (!slide_id || !keyframe_url) {
    return NextResponse.json(
      { status: "failed", error: "slide_id and keyframe_url are required." },
      { status: 400 }
    );
  }

  const validDurations = new Set([4, 5, 6]);
  const safeSeconds = validDurations.has(duration_seconds) ? (duration_seconds as 4 | 5 | 6) : 5;

  try {
    const keyframeDataUri = await resolveToDataUri(keyframe_url);

    const { video_url, generated_at } = await generateRunwayVideoFromKeyframe({
      slideId: slide_id,
      keyframeDataUri,
      prompt: motion_prompt,
      durationSeconds: safeSeconds,
    });

    // Persist Runway intermediate video locally so it survives page refresh
    let localVideoUrl = video_url;
    if (slide_id === "slide-1") {
      try {
        const videoRes = await fetch(video_url);
        if (videoRes.ok) {
          const buffer = Buffer.from(await videoRes.arrayBuffer());
          await fs.mkdir(GENERATED_DIR, { recursive: true });
          const localFilename = "slide-01-runway-intermediate.mp4";
          await fs.writeFile(path.join(GENERATED_DIR, localFilename), buffer);
          localVideoUrl = `/generated/final-launch-pack/${localFilename}`;
          await updateSlide01({
            runway_intermediate_video_url: localVideoUrl,
            provider_ratio_status: "accepted_intermediate",
            provider_ratio_source: "declared_runway_request_ratio",
            final_composition_status: "needed",
            final_ratio_status: "unknown",
          });
          console.log("[generate-motion-from-keyframe] video persisted locally:", localVideoUrl);
        }
      } catch (persistErr) {
        console.warn("[generate-motion-from-keyframe] video persist failed (non-critical), returning Runway URL:", persistErr);
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
      // Structured diagnostic — no secrets, no auth headers
      console.error(`[generate-motion-from-keyframe] RunwayFailureError`, {
        slide_id,
        taskId: err.taskId,
        runwayStatus: err.runwayStatus,
        failureCode: err.failureCode,
        failureMessage: err.failureMessage,
      });
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
