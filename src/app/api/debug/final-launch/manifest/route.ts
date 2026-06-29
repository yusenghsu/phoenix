// Dev-only route — returns 403 in production.
// GET  /api/debug/final-launch/manifest → returns manifest.json content
// DELETE /api/debug/final-launch/manifest → clears slide_01, deletes local generated files

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { readManifest, writeManifest, GENERATED_DIR } from "@/lib/launch/manifest";

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

export async function DELETE() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { status: "failed", error: "Debug route not available in production." },
      { status: 403 }
    );
  }

  const filesToDelete = [
    "slide-01-keyframe.png",
    "slide-01-runway-intermediate.mp4",
  ];

  for (const filename of filesToDelete) {
    try {
      await fs.unlink(path.join(GENERATED_DIR, filename));
    } catch {
      // File may not exist — ignore
    }
  }

  const manifest = await readManifest();
  const updated = { ...manifest };
  delete updated.slide_01;
  await writeManifest(updated);

  return NextResponse.json({ status: "cleared", deleted_files: filesToDelete });
}
