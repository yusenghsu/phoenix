// Server-side only. Syncs final MP4 files from local debug storage to Supabase Storage.
// Reads only files under public/generated/daily-runs/ — never arbitrary paths.
// Does not call OpenAI, Runway, or Instagram.
import "server-only";

import * as fs from "fs";
import * as path from "path";
import {
  getRunDetails,
  markSlideStatus,
  createGeneratedAsset,
  logJobEvent,
} from "./service";
import {
  uploadLocalFileToSupabaseStorage,
  ensureBucketExists,
  PHOENIX_ASSETS_BUCKET,
} from "@/lib/storage/phoenix-storage";

export interface SlideSyncResult {
  slideNo: number;
  status: "uploaded" | "skipped_https" | "skipped_not_ready" | "failed";
  publicUrl?: string;
  errorMessage?: string;
}

export interface StorageSyncResult {
  ok: boolean;
  uploaded: number;
  skipped: number;
  failed: number;
  slides: SlideSyncResult[];
  bucketName: string;
  errorMessage?: string;
}

const LOCAL_FINAL_VIDEO_PREFIX = "/generated/daily-runs/";

export async function syncDailyRunFinalVideosToStorage(runId: string): Promise<StorageSyncResult> {
  const bucketName = process.env.PHOENIX_STORAGE_BUCKET ?? PHOENIX_ASSETS_BUCKET;
  const slideResults: SlideSyncResult[] = [];
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  await logJobEvent({
    run_id: runId,
    job_type: "storage_sync",
    status: "started",
    message: "Starting sync of final MP4s to Supabase Storage",
    payload: { bucket: bucketName },
  });

  let run, slides;
  try {
    const details = await getRunDetails(runId);
    run = details.run;
    slides = details.slides;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logJobEvent({ run_id: runId, job_type: "storage_sync", status: "failed", message: msg });
    return { ok: false, uploaded: 0, skipped: 0, failed: 0, slides: [], bucketName, errorMessage: msg };
  }

  // Ensure bucket exists before processing any slides
  const bucketCheck = await ensureBucketExists(bucketName);
  if (!bucketCheck.ok) {
    const msg = `Bucket unavailable: ${bucketCheck.errorMessage}`;
    await logJobEvent({ run_id: runId, job_type: "storage_sync", status: "failed", message: msg });
    return { ok: false, uploaded: 0, skipped: 0, failed: 0, slides: [], bucketName, errorMessage: msg };
  }

  for (const slide of slides) {
    // Only process fully READY slides
    if (slide.final_composition_status !== "composed" || slide.final_ratio_status !== "passed_4_5") {
      slideResults.push({ slideNo: slide.slide_no, status: "skipped_not_ready" });
      skipped++;
      continue;
    }

    const url = slide.final_video_url;
    if (!url) {
      slideResults.push({ slideNo: slide.slide_no, status: "skipped_not_ready", errorMessage: "Missing final_video_url" });
      skipped++;
      continue;
    }

    // Already a public HTTPS URL — skip
    if (url.startsWith("https://")) {
      slideResults.push({ slideNo: slide.slide_no, status: "skipped_https", publicUrl: url });
      skipped++;
      await logJobEvent({
        run_id: runId,
        job_type: "storage_sync",
        status: "slide_skipped_https",
        message: `Slide ${slide.slide_no} already public`,
        payload: { slide_no: slide.slide_no },
      });
      continue;
    }

    if (!url.startsWith(LOCAL_FINAL_VIDEO_PREFIX)) {
      slideResults.push({ slideNo: slide.slide_no, status: "failed", errorMessage: `Unexpected URL format: ${url}` });
      failed++;
      continue;
    }

    const slidePadded = String(slide.slide_no).padStart(2, "0");
    const storagePath = `daily-runs/${run.run_date}/${runId}/slide-${slidePadded}-final.mp4`;

    const uploadResult = await uploadLocalFileToSupabaseStorage({
      localPath: url,
      storagePath,
      contentType: "video/mp4",
      upsert: true,
    });

    if (!uploadResult.ok) {
      slideResults.push({ slideNo: slide.slide_no, status: "failed", errorMessage: uploadResult.errorMessage });
      failed++;
      await logJobEvent({
        run_id: runId,
        job_type: "storage_sync",
        status: "failed",
        message: `Slide ${slide.slide_no} upload failed: ${uploadResult.errorMessage}`,
        payload: { slide_no: slide.slide_no, error_code: uploadResult.errorCode },
      });
      continue;
    }

    // Get file size for asset record (non-critical)
    let sizeBytes: number | undefined;
    try {
      const absPath = path.join(process.cwd(), "public", url);
      const stat = fs.statSync(absPath);
      sizeBytes = stat.size;
    } catch { /* non-critical */ }

    // Update the slide's final_video_url to the public URL
    await markSlideStatus(runId, slide.slide_no, { final_video_url: uploadResult.publicUrl });

    // Record the uploaded asset
    await createGeneratedAsset({
      run_id: runId,
      slide_id: slide.id,
      asset_type: "final_slide_mp4",
      storage_bucket: bucketName,
      storage_path: storagePath,
      public_url: uploadResult.publicUrl,
      mime_type: "video/mp4",
      size_bytes: sizeBytes,
    });

    slideResults.push({ slideNo: slide.slide_no, status: "uploaded", publicUrl: uploadResult.publicUrl });
    uploaded++;

    await logJobEvent({
      run_id: runId,
      job_type: "storage_sync",
      status: "slide_uploaded",
      message: `Slide ${slide.slide_no} uploaded`,
      payload: { slide_no: slide.slide_no, public_url: uploadResult.publicUrl, storage_path: storagePath },
    });
  }

  const allOk = failed === 0;
  await logJobEvent({
    run_id: runId,
    job_type: "storage_sync",
    status: allOk ? "completed" : "failed",
    message: `Storage sync done: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`,
    payload: { uploaded, skipped, failed },
  });

  return { ok: allOk, uploaded, skipped, failed, slides: slideResults, bucketName };
}
