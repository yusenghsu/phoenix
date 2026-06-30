// Server-side only. Instagram carousel publish service.
// Real publish requires: PHOENIX_AUTO_PUBLISH_ENABLED=true + META env + public HTTPS media URLs.
// Never log META_ACCESS_TOKEN, Authorization headers, or credentials of any kind.
import "server-only";

import { logJobEvent } from "@/lib/daily-workflow/service";

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
  stage?: string;
  preflight: InstagramPublishPreflight;
}

function isPublicUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return false;
  if (url.startsWith("data:")) return false;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url)) return false;
  if (!url.startsWith("https://")) return false;
  return true;
}

// Extract sanitized error info from IG Graph API error response.
// Never includes tokens, authorization headers, or raw request bodies.
function sanitizeIgError(
  data: Record<string, unknown>,
  stage: string
): { errorCode: string | null; errorMessage: string | null; stage: string } {
  const err = data.error as Record<string, unknown> | undefined;
  if (!err) {
    return { errorCode: "ig_api_error", errorMessage: "Instagram API returned an error", stage };
  }
  const fbtrace = err.fbtrace_id ? ` | trace: ${String(err.fbtrace_id)}` : "";
  return {
    errorCode: String(err.code ?? err.type ?? "ig_api_error"),
    errorMessage: `${String(err.message ?? "Unknown IG API error")}${fbtrace}`,
    stage,
  };
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

  // Media URL preflight — all slides must have public HTTPS URLs
  const blockedUrls = slides.map((s) => s.finalVideoUrl).filter((url) => !isPublicUrl(url));
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

  // 1. Local / non-public media URLs
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

  // 2. Auto-publish safety switch not enabled (all URLs are public at this point)
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

  // ── All preflight checks passed → real Instagram publish ──────────────────

  // Read credentials once — never log them
  const igUserId = process.env.META_IG_USER_ID!;
  const accessToken = process.env.META_ACCESS_TOKEN!;
  const version = process.env.META_GRAPH_API_VERSION ?? "v23.0";
  // token is in POST body — never in URL or logs
  const apiBase = `https://graph.facebook.com/${version}/${igUserId}`;

  const logEvent = async (status: string, message: string, payload?: Record<string, unknown>) => {
    try {
      await logJobEvent({ run_id: input.runId, job_type: "daily_publish", status, message, payload });
    } catch { /* non-critical — never halt publish for a log failure */ }
  };

  await logEvent("publish_started", `Starting real Instagram carousel publish (${slides.length} slides)`, { slide_count: slides.length });

  // Step 1: Create one video media container per slide
  const containerIds: string[] = [];

  for (const slide of slides) {
    const res = await fetch(`${apiBase}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        media_type: "VIDEO",
        video_url: slide.finalVideoUrl,
        is_carousel_item: true,
      }),
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const igErr = sanitizeIgError(errData, "create_item_container");
      await logEvent("failed", `Item container failed at slide ${slide.slideNo}: ${igErr.errorMessage}`, {
        slide_no: slide.slideNo,
        error_code: igErr.errorCode,
        stage: igErr.stage,
      });
      return { ...base, ok: false, dryRun: false, status: "failed", containerIds, ...igErr };
    }

    const data = (await res.json()) as { id?: string };
    if (!data.id) {
      await logEvent("failed", `No container ID returned for slide ${slide.slideNo}`, { slide_no: slide.slideNo });
      return {
        ...base, ok: false, dryRun: false, status: "failed", containerIds,
        errorCode: "missing_container_id",
        errorMessage: `No container ID returned for slide ${slide.slideNo}`,
        stage: "create_item_container",
      };
    }
    containerIds.push(data.id);
  }

  await logEvent("carousel_items_created", `${containerIds.length} item containers created`, {
    container_count: containerIds.length,
  });

  // Step 2: Create the carousel container
  const carouselRes = await fetch(`${apiBase}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      media_type: "CAROUSEL",
      children: containerIds.join(","),
      caption,
    }),
  });

  if (!carouselRes.ok) {
    const errData = (await carouselRes.json().catch(() => ({}))) as Record<string, unknown>;
    const igErr = sanitizeIgError(errData, "create_carousel_container");
    await logEvent("failed", `Carousel container failed: ${igErr.errorMessage}`, {
      error_code: igErr.errorCode,
      stage: igErr.stage,
    });
    return { ...base, ok: false, dryRun: false, status: "failed", containerIds, ...igErr };
  }

  const carouselData = (await carouselRes.json()) as { id?: string };
  const carouselContainerId = carouselData.id ?? null;
  if (!carouselContainerId) {
    await logEvent("failed", "No carousel container ID returned", {});
    return {
      ...base, ok: false, dryRun: false, status: "failed", containerIds, carouselContainerId: null,
      errorCode: "missing_carousel_id",
      errorMessage: "No carousel container ID returned from Instagram API",
      stage: "create_carousel_container",
    };
  }

  await logEvent("carousel_container_created", "Carousel container created", {
    carousel_container_id: carouselContainerId,
  });

  // Step 3: Publish the carousel
  const publishRes = await fetch(`${apiBase}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      creation_id: carouselContainerId,
    }),
  });

  if (!publishRes.ok) {
    const errData = (await publishRes.json().catch(() => ({}))) as Record<string, unknown>;
    const igErr = sanitizeIgError(errData, "media_publish");
    await logEvent("failed", `Publish failed: ${igErr.errorMessage}`, {
      error_code: igErr.errorCode,
      stage: igErr.stage,
    });
    return { ...base, ok: false, dryRun: false, status: "failed", containerIds, carouselContainerId, ...igErr };
  }

  const publishData = (await publishRes.json()) as { id?: string };
  const platformMediaId = publishData.id ?? null;

  await logEvent("published", "Instagram carousel published successfully", {
    platform_media_id: platformMediaId,
    carousel_container_id: carouselContainerId,
    container_count: containerIds.length,
  });

  return {
    ok: true,
    dryRun: false,
    status: "published",
    containerIds,
    carouselContainerId,
    platformMediaId,
    errorCode: null,
    errorMessage: null,
    preflight,
  };
}
