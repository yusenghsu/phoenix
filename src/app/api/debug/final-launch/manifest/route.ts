// Dev-only route — returns 403 in production.
// GET  /api/debug/final-launch/manifest → returns manifest.json content
// DELETE /api/debug/final-launch/manifest?slide_id=slide-01 → clears that slide
// DELETE /api/debug/final-launch/manifest → clears all slides

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  readManifest,
  writeManifest,
  slideRouteIdToManifestKey,
  GENERATED_DIR,
} from "@/lib/launch/manifest";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { status: "failed", error: "Debug route not available in production." },
      { status: 403 }
    );
  }
  const manifest = await readManifest();
  return NextResponse.json({ status: "ok", manifest });
}

export async function DELETE(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { status: "failed", error: "Debug route not available in production." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const slideId = searchParams.get("slide_id"); // e.g. "slide-01"

  if (slideId) {
    // Delete only this slide's files and manifest key
    const manifestKey = slideRouteIdToManifestKey(slideId);
    if (!manifestKey) {
      return NextResponse.json(
        { status: "failed", error: `Invalid slide_id: ${slideId}` },
        { status: 400 }
      );
    }

    const filesToDelete = [
      `${slideId}-keyframe.png`,
      `${slideId}-runway-intermediate.mp4`,
      `${slideId}-final.mp4`,
    ];

    for (const filename of filesToDelete) {
      try {
        await fs.unlink(path.join(GENERATED_DIR, filename));
      } catch { /* File may not exist */ }
    }

    const manifest = await readManifest();
    const updated = { ...manifest };
    delete updated[manifestKey];
    await writeManifest(updated);

    return NextResponse.json({ status: "cleared", slide_id: slideId, deleted_files: filesToDelete });
  }

  // No slide_id — clear all
  const allSlideIds = ["slide-01","slide-02","slide-03","slide-04","slide-05","slide-06","slide-07","slide-08"];
  const deletedFiles: string[] = [];
  for (const id of allSlideIds) {
    for (const suffix of ["-keyframe.png", "-runway-intermediate.mp4", "-final.mp4"]) {
      const filename = `${id}${suffix}`;
      try {
        await fs.unlink(path.join(GENERATED_DIR, filename));
        deletedFiles.push(filename);
      } catch { /* File may not exist */ }
    }
  }

  await writeManifest({});
  return NextResponse.json({ status: "cleared", deleted_files: deletedFiles });
}
