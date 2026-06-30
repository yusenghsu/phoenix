// Phoenix Storage Abstraction — server-side only.
//
// IMPORTANT: Vercel production cannot rely on the local writable public/ folder.
//   - Local debug: files written to public/generated/ (ephemeral, not committed)
//   - Production daily workflow: ALL assets must be stored in Supabase Storage
//     (or equivalent durable object storage) so they survive across deploys.

import "server-only";

import * as fs from "fs";
import * as path from "path";
import { createServerClient } from "@/lib/supabase/server";

export interface UploadInput {
  bucket: string;
  path: string;
  body: Buffer | Blob | ArrayBuffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  publicUrl: string;
  storagePath: string;
  bucket: string;
}

export interface LocalUploadInput {
  localPath: string;   // URL path like /generated/daily-runs/... (without "public" prefix)
  storagePath: string; // Destination path inside Supabase Storage bucket
  contentType: string;
  upsert?: boolean;
}

export interface LocalUploadResult {
  ok: boolean;
  bucket: string;
  storagePath: string;
  publicUrl: string;
  errorCode?: string;
  errorMessage?: string;
}

// Default bucket name for generated Phoenix assets.
export const PHOENIX_ASSETS_BUCKET = "phoenix-generated-assets";

// Only files under this URL prefix may be uploaded.
const ALLOWED_URL_PREFIX = "/generated/daily-runs/";

// Upload a generated asset to Supabase Storage.
// Returns the public URL and storage path for recording in phoenix_generated_assets.
export async function uploadGeneratedAsset(input: UploadInput): Promise<UploadResult> {
  const db = createServerClient();
  if (!db) throw new Error("Supabase client unavailable — check environment variables.");

  const { error } = await db.storage
    .from(input.bucket)
    .upload(input.path, input.body, {
      contentType: input.contentType,
      upsert: true,
      metadata: input.metadata,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = db.storage.from(input.bucket).getPublicUrl(input.path);
  return {
    publicUrl: urlData.publicUrl,
    storagePath: input.path,
    bucket: input.bucket,
  };
}

// Get the public URL for an already-uploaded asset.
export function getPublicUrl(bucket: string, storagePath: string): string {
  const db = createServerClient();
  if (!db) throw new Error("Supabase client unavailable.");
  const { data } = db.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

// Ensure the named bucket exists, creating it (public) if it does not.
// Returns { ok: false } if creation fails — caller should surface the error.
export async function ensureBucketExists(
  bucketName: string
): Promise<{ ok: boolean; created?: boolean; errorMessage?: string }> {
  const db = createServerClient();
  if (!db) return { ok: false, errorMessage: "Supabase client unavailable — check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY" };

  const { data: buckets, error: listError } = await db.storage.listBuckets();
  if (listError) return { ok: false, errorMessage: `Cannot list buckets: ${listError.message}` };

  const exists = (buckets ?? []).some((b) => b.name === bucketName);
  if (exists) return { ok: true, created: false };

  const { error: createError } = await db.storage.createBucket(bucketName, {
    public: true,
    allowedMimeTypes: ["video/mp4"],
    fileSizeLimit: "500MB",
  });

  if (createError) {
    return {
      ok: false,
      errorMessage:
        `Cannot create bucket "${bucketName}": ${createError.message}. ` +
        `Create it manually in Supabase Dashboard → Storage → New bucket (name: ${bucketName}, public: true).`,
    };
  }

  return { ok: true, created: true };
}

// Upload a local debug file from public/generated/daily-runs/ to Supabase Storage.
// Security: only files under /generated/daily-runs/ are allowed.
// Never reads arbitrary system files.
export async function uploadLocalFileToSupabaseStorage(
  input: LocalUploadInput
): Promise<LocalUploadResult> {
  const bucket = process.env.PHOENIX_STORAGE_BUCKET ?? PHOENIX_ASSETS_BUCKET;
  const base: Omit<LocalUploadResult, "ok"> = { bucket, storagePath: input.storagePath, publicUrl: "" };

  // Security guard: only allow the daily-runs local path
  if (!input.localPath.startsWith(ALLOWED_URL_PREFIX)) {
    return { ...base, ok: false, errorCode: "path_not_allowed", errorMessage: `localPath must start with ${ALLOWED_URL_PREFIX}` };
  }

  // Resolve absolute path and verify it stays within the allowed directory
  const absPath = path.resolve(process.cwd(), "public" + input.localPath);
  const allowedBase = path.resolve(process.cwd(), "public/generated/daily-runs");
  if (!absPath.startsWith(allowedBase + path.sep) && absPath !== allowedBase) {
    return { ...base, ok: false, errorCode: "path_traversal", errorMessage: "Path traversal detected" };
  }

  // Only video/mp4 uploads are permitted
  if (input.contentType !== "video/mp4") {
    return { ...base, ok: false, errorCode: "invalid_content_type", errorMessage: "Only video/mp4 is allowed" };
  }

  if (!fs.existsSync(absPath)) {
    return { ...base, ok: false, errorCode: "file_not_found", errorMessage: `File not found: ${absPath}` };
  }

  const db = createServerClient();
  if (!db) {
    return { ...base, ok: false, errorCode: "supabase_unavailable", errorMessage: "Supabase client unavailable" };
  }

  const fileBuffer = fs.readFileSync(absPath);

  const { error } = await db.storage
    .from(bucket)
    .upload(input.storagePath, fileBuffer, {
      contentType: input.contentType,
      upsert: input.upsert ?? true,
    });

  if (error) {
    return { ...base, ok: false, errorCode: "upload_failed", errorMessage: error.message };
  }

  const { data: urlData } = db.storage.from(bucket).getPublicUrl(input.storagePath);
  return { ok: true, bucket, storagePath: input.storagePath, publicUrl: urlData.publicUrl };
}
