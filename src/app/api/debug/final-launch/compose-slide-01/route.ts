// Dev-only route — returns 403 in production.
// POST /api/debug/final-launch/compose-slide-01
// Composes the saved Runway intermediate video into a final 1080×1350 4:5 MP4 with Chinese text overlay.
// No secrets. No API calls. Reads from and writes to public/generated/final-launch-pack/.

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { composeSlide01, SLIDE1_TEXT } from "@/lib/launch/compose-video";
import { updateSlide01, GENERATED_DIR } from "@/lib/launch/manifest";

export const runtime = "nodejs";
export const maxDuration = 120;

const INPUT_FILE = "slide-01-runway-intermediate.mp4";
const OUTPUT_FILE = "slide-01-final.mp4";
const OUTPUT_URL = `/generated/final-launch-pack/${OUTPUT_FILE}`;

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { status: "failed", error: "Debug route not available in production." },
      { status: 403 }
    );
  }

  const inputPath = path.join(GENERATED_DIR, INPUT_FILE);
  const outputPath = path.join(GENERATED_DIR, OUTPUT_FILE);

  // Verify input exists
  try {
    await fs.access(inputPath);
  } catch {
    return NextResponse.json(
      {
        status: "failed",
        error: `Runway intermediate video not found: ${INPUT_FILE}. Generate and save motion first.`,
      },
      { status: 400 }
    );
  }

  try {
    await composeSlide01(inputPath, outputPath, SLIDE1_TEXT);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[compose-slide-01] composition failed:", msg);
    return NextResponse.json(
      { status: "failed", error: msg },
      { status: 500 }
    );
  }

  // Verify output was created and has reasonable size
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

  await updateSlide01({
    final_video_url: OUTPUT_URL,
    final_composition_status: "composed",
    final_ratio_status: "passed_4_5",
  });

  console.log("[compose-slide-01] final MP4 saved", { outputSize, OUTPUT_URL });

  return NextResponse.json({
    status: "composed",
    final_video_url: OUTPUT_URL,
    final_composition_status: "composed",
    final_ratio_status: "passed_4_5",
    output_size_bytes: outputSize,
    text_overlay: SLIDE1_TEXT,
  });
}
