// Server-side only. Instagram carousel publish service.
// v1: dry-run / preflight only. Never calls Instagram in this version.
// Real IG API call requires PHOENIX_AUTO_PUBLISH_ENABLED=true + META env + public HTTPS media URLs.
// Never log META_ACCESS_TOKEN or any credential.
import "server-only";

export interface InstagramSlideInput {
  slideNo: number;
  finalVideoUrl: string;
  mimeType: string;
}

export interface InstagramPublishInput {
  runId: string;
  caption: string;
  slides: InstagramSlideInput[];
  dryRun?: boolean;
}

export interface InstagramPublishPreflight {
  autoPublishEnabled: boolean;
  hasMetaConfig: boolean;
  mediaUrlsPublic: boolean;
  blockedUrls: string[];
}

export interface InstagramPublishResult {
  ok: boolean;
  dryRun: boolean;
  status: string;
  containerIds: string[];
  carouselContainerId: string | null;
  platformMediaId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  preflight: InstagramPublishPreflight;
}

function isPublicUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return false;        // relative/local path
  if (url.startsWith("data:")) return false;     // data URI
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url)) return false;
  if (!url.startsWith("https://")) return false; // must be https
  return true;
}

export async function publishInstagramCarousel(
  input: InstagramPublishInput
): Promise<InstagramPublishResult> {
  const { caption, slides } = input;

  // Read safety switches — never expose values in logs or responses
  const autoPublishEnabled = process.env.PHOENIX_AUTO_PUBLISH_ENABLED === "true";
  const hasMetaConfig = Boolean(
    process.env.META_ACCESS_TOKEN && process.env.META_IG_USER_ID
  );

  // Media URL preflight — check all slides
  const blockedUrls = slides
    .map((s) => s.finalVideoUrl)
    .filter((url) => !isPublicUrl(url));
  const mediaUrlsPublic = blockedUrls.length === 0;

  const preflight: InstagramPublishPreflight = {
    autoPublishEnabled,
    hasMetaConfig,
    mediaUrlsPublic,
    blockedUrls,
  };

  const base = {
    containerIds: [] as string[],
    carouselContainerId: null,
    platformMediaId: null,
    preflight,
  };

  // ── Preflight checks (in order of actionability) ──────────────────────────

  // 1. Local / non-public media URLs — most common in dev; most actionable feedback
  if (!mediaUrlsPublic) {
    return {
      ...base,
      ok: true,
      dryRun: true,
      status: "blocked_local_media_url",
      errorCode: "local_media_url",
      errorMessage:
        "Final videos are local debug assets. Upload to public storage before real Instagram publishing.",
    };
  }

  // 2. Auto-publish safety switch not enabled (media URLs are all public at this point)
  if (!autoPublishEnabled) {
    return {
      ...base,
      ok: true,
      dryRun: true,
      status: "dry_run_ready",
      errorCode: "auto_publish_disabled",
      errorMessage: "All media URLs are public. Auto publish disabled — dry run ready.",
    };
  }

  // 3. Missing META credentials
  if (!hasMetaConfig) {
    return {
      ...base,
      ok: true,
      dryRun: true,
      status: "dry_run_missing_env",
      errorCode: "missing_env",
      errorMessage:
        "META_ACCESS_TOKEN or META_IG_USER_ID not configured — set both to enable publishing",
    };
  }

  // ── All preflight checks passed ───────────────────────────────────────────
  // Real IG API call not implemented in v1.
  // When ready: POST each slide container, POST carousel container, POST publish.
  // Log only task IDs and status — never log tokens or credentials.
  void caption; // will be used in real publish
  return {
    ...base,
    ok: false,
    dryRun: false,
    status: "failed",
    errorCode: "not_implemented",
    errorMessage:
      "All preflight checks passed — real Instagram publishing not yet implemented in v1",
  };
}
