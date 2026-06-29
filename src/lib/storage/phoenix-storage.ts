// Phoenix Storage Abstraction — server-side only.
//
// IMPORTANT: Vercel production cannot rely on the local writable public/ folder.
//   - Local debug: files written to public/generated/ (ephemeral, not committed)
//   - Production daily workflow: ALL assets must be stored in Supabase Storage
//     (or equivalent durable object storage) so they survive across deploys.
//
// #076 will wire up the actual upload logic for final MP4 → Supabase Storage.
// For now this is the contract/skeleton the rest of the pipeline depends on.

import "server-only";

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
export function getPublicUrl(bucket: string, path: string): string {
  const db = createServerClient();
  if (!db) throw new Error("Supabase client unavailable.");
  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Default bucket name for generated Phoenix assets.
export const PHOENIX_ASSETS_BUCKET = "phoenix-generated-assets";
