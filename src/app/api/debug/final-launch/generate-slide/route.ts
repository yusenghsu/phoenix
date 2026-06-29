import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { generateImageBackground } from "@/lib/launch/openai-image";
import { updateSlide, slideRouteIdToManifestKey, GENERATED_DIR } from "@/lib/launch/manifest";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { status: "failed", error: "Image generation is not available in production." },
      { status: 403 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { status: "failed", error: "OPENAI_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  let body: { slide_id: string; prompt: string; negative_prompt?: string; keyframe_mode?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ status: "failed", error: "Invalid JSON body" }, { status: 400 });
  }

  const { slide_id, prompt, negative_prompt = "", keyframe_mode } = body;
  if (!slide_id || !prompt) {
    return NextResponse.json({ status: "failed", error: "slide_id and prompt required" }, { status: 400 });
  }

  const fullPrompt = [
    prompt,
    "Cinematic vertical portrait 4:5 format. Taiwan realistic setting, real human scene.",
    "Premium dark warm mood, orange amber low-key lighting, shallow depth of field.",
    "No Chinese text, no English text, no logos, no watermarks, no anime, no cartoon.",
    negative_prompt ? `Avoid: ${negative_prompt}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const { image_url, generated_at, model_used } = await generateImageBackground({
      slideId: slide_id,
      prompt: fullPrompt,
    });

    // Persist keyframe for any slide-0X — copy to canonical filename and update manifest.
    // Returns the canonical URL so the client state always matches the manifest.
    let returnUrl = image_url;
    const manifestKey = slideRouteIdToManifestKey(slide_id);
    if (manifestKey) {
      try {
        const sourcePath = path.join(GENERATED_DIR, `${slide_id}-background.png`);
        const canonicalPath = path.join(GENERATED_DIR, `${slide_id}-keyframe.png`);
        await fs.copyFile(sourcePath, canonicalPath);
        const canonicalUrl = `/generated/final-launch-pack/${slide_id}-keyframe.png`;
        const manifestUpdates: Parameters<typeof updateSlide>[1] = { keyframe_url: canonicalUrl };
        if (keyframe_mode) {
          const isLowRisk = keyframe_mode === "low_risk";
          manifestUpdates.keyframe_mode = isLowRisk ? "low_risk" : "normal";
          manifestUpdates.low_risk_mode = isLowRisk;
        }
        await updateSlide(manifestKey, manifestUpdates);
        returnUrl = canonicalUrl; // single source of truth — UI and manifest agree
      } catch (manifestErr) {
        console.warn("[generate-slide] manifest update failed (non-critical):", manifestErr);
      }
    }

    return NextResponse.json({
      slide_id,
      image_url: returnUrl,
      generated_at,
      status: "generated",
      model_used,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[generate-slide] ${slide_id}:`, msg);
    return NextResponse.json({ slide_id, status: "failed", error: msg }, { status: 500 });
  }
}
