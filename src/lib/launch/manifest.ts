// Server-side only — never import in client components.
// Reads and writes the local dev manifest for generated slide assets.
// The manifest is saved to public/generated/final-launch-pack/manifest.json.
// It is dev-only — no production writes, no DB, no secrets.

import fs from "fs/promises";
import path from "path";
import type { SlideId } from "./slide-motion-config";

export type { SlideId };

export const GENERATED_DIR = path.join(
  process.cwd(),
  "public",
  "generated",
  "final-launch-pack"
);
const MANIFEST_PATH = path.join(GENERATED_DIR, "manifest.json");

export interface ManifestSlide {
  keyframe_url?: string;
  keyframe_mode?: "low_risk" | "normal";
  low_risk_mode?: boolean;
  runway_motion_status?: "generated" | "missing";
  runway_intermediate_video_url?: string;
  runway_task_id?: string;
  provider: "runway";
  provider_requested_ratio: "832:1104";
  provider_ratio_status: "accepted_intermediate" | "unknown";
  provider_ratio_source: "declared_runway_request_ratio" | "metadata" | "unknown";
  final_composition_status: "needed" | "missing" | "composed";
  final_video_url?: string;
  final_ratio_status: "unknown" | "passed_4_5";
  motion_prompt_mode?: "low_risk" | "normal" | "safe";
  motion_attempt_count?: number;
  last_failure?: {
    failure_code?: string;
    failure_message?: string;
    task_id?: string;
    timestamp: string;
  } | null;
  updated_at: string;
}

// Backward-compat alias
export type ManifestSlide01 = ManifestSlide;

export interface ManifestData {
  slide_01?: ManifestSlide;
  slide_02?: ManifestSlide;
  slide_03?: ManifestSlide;
  slide_04?: ManifestSlide;
  slide_05?: ManifestSlide;
  slide_06?: ManifestSlide;
  slide_07?: ManifestSlide;
  slide_08?: ManifestSlide;
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

export async function updateSlide(
  slideId: SlideId,
  updates: Partial<Omit<ManifestSlide, "updated_at">>
): Promise<ManifestData> {
  const current = await readManifest();
  const existing: ManifestSlide = current[slideId] ?? {
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
    [slideId]: {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    },
  };
  await writeManifest(updated);
  return updated;
}

// Backward-compat wrapper
export async function updateSlide01(
  updates: Partial<Omit<ManifestSlide, "updated_at">>
): Promise<ManifestData> {
  return updateSlide("slide_01", updates);
}

// Converts route-param format "slide-01" → manifest key "slide_01".
// Returns undefined if the id is out of range.
export function slideRouteIdToManifestKey(routeId: string): SlideId | undefined {
  const match = /^slide-0([1-8])$/.exec(routeId);
  if (!match) return undefined;
  return `slide_0${match[1]}` as SlideId;
}
