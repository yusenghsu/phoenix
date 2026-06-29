// Dev-only route — returns 403 in production.
// POST /api/debug/final-launch/compose-slide { slide_id }
// Generic compose: scales Runway intermediate to 1080×1350, burns text overlay, outputs H.264 MP4.

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { composeSlide } from "@/lib/launch/compose-video";
import { updateSlide, slideRouteIdToManifestKey, GENERATED_DIR } from "@/lib/launch/manifest";
import { getSlideConfig } from "@/lib/launch/slide-motion-config";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { status: "failed", error: "Debug route not available in production." },
      { status: 403 }
    );
  }

  let body: { slide_id?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ status: "failed", error: "Invalid JSON body." }, { status: 400 });
  }

  const { slide_id } = body;

  if (!slide_id || !/^slide-0[1-8]$/.test(slide_id)) {
    return NextResponse.json(
      { status: "failed", error: "slide_id must be slide-01 through slide-08." },
      { status: 400 }
    );
  }

  const manifestKey = slideRouteIdToManifestKey(slide_id);
  if (!manifestKey) {
    return NextResponse.json(
      { status: "failed", error: `Cannot resolve manifest key for ${slide_id}.` },
      { status: 400 }
    );
  }

  const config = getSlideConfig(slide_id);
  if (!config) {
    return NextResponse.json(
      { status: "failed", error: `No slide config found for ${slide_id}.` },
      { status: 400 }
    );
  }

  const inputFile = `${slide_id}-runway-intermediate.mp4`;
  const outputFile = `${slide_id}-final.mp4`;
  const outputUrl = `/generated/final-launch-pack/${outputFile}`;
  const inputPath = path.join(GENERATED_DIR, inputFile);
  const outputPath = path.join(GENERATED_DIR, outputFile);

  try {
    await fs.access(inputPath);
  } catch {
    return NextResponse.json(
      {
        status: "failed",
        error: `Runway intermediate video not found: ${inputFile}. Generate and save motion first.`,
      },
      { status: 400 }
    );
  }

  try {
    await composeSlide(inputPath, outputPath, config.composeText);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[compose-slide] ${slide_id} composition failed:`, msg);
    return NextResponse.json({ status: "failed", error: msg }, { status: 500 });
  }

  let outputSize = 0;
  try {
    const stat = await fs.stat(outputPath);
    outputSize = stat.size;
    if (outputSize < 50_000) {
      return NextResponse.json(
        { status: "failed", error: `Output file too small (${outputSize} bytes) — ffmpeg may have failed silently.` },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { status: "failed", error: "Output file was not created." },
      { status: 500 }
    );
  }

  await updateSlide(manifestKey, {
    final_video_url: outputUrl,
    final_composition_status: "composed",
    final_ratio_status: "passed_4_5",
  });

  console.log(`[compose-slide] ${slide_id} final MP4 saved`, { outputSize, outputUrl });

  return NextResponse.json({
    status: "composed",
    slide_id,
    final_video_url: outputUrl,
    final_composition_status: "composed",
    final_ratio_status: "passed_4_5",
    output_size_bytes: outputSize,
  });
}
