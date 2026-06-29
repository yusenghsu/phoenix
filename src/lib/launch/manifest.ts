// Server-side only — never import in client components.
// Reads and writes the local dev manifest for generated slide assets.
// The manifest is saved to public/generated/final-launch-pack/manifest.json.
// It is dev-only — no production writes, no DB, no secrets.

import fs from "fs/promises";
import path from "path";

export const GENERATED_DIR = path.join(
  process.cwd(),
  "public",
  "generated",
  "final-launch-pack"
);
const MANIFEST_PATH = path.join(GENERATED_DIR, "manifest.json");

export interface ManifestSlide01 {
  keyframe_url?: string;
  runway_motion_status?: "generated" | "missing";
  runway_intermediate_video_url?: string;
  runway_task_id?: string;
  provider: "runway";
  provider_requested_ratio: "832:1104";
  provider_ratio_status: "accepted_intermediate" | "unknown";
  provider_ratio_source: "declared_runway_request_ratio" | "metadata" | "unknown";
  final_composition_status: "needed" | "missing";
  final_ratio_status: "unknown";
  updated_at: string;
}

export interface ManifestData {
  slide_01?: ManifestSlide01;
}

export async function readManifest(): Promise<ManifestData> {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, "utf-8");
    return JSON.parse(raw) as ManifestData;
  } catch {
    return {};
  }
}

export async function writeManifest(data: ManifestData): Promise<void> {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function updateSlide01(
  updates: Partial<Omit<ManifestSlide01, "updated_at">>
): Promise<ManifestData> {
  const current = await readManifest();
  const existing: ManifestSlide01 = current.slide_01 ?? {
    provider: "runway",
    provider_requested_ratio: "832:1104",
    provider_ratio_status: "unknown",
    provider_ratio_source: "unknown",
    final_composition_status: "missing",
    final_ratio_status: "unknown",
    updated_at: new Date().toISOString(),
  };
  const updated: ManifestData = {
    ...current,
    slide_01: {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    },
  };
  await writeManifest(updated);
  return updated;
}
