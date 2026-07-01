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

export interface InstagramContainerStatus {
  slideNo: number;
  creationId: string;
  statusCode: string | null; // FINISHED | IN_PROGRESS | ERROR | PUBLISHED | null
  status: string | null;
  createdAt: string;
}

export interface InstagramPublishResult {
  ok: boolean;
  dryRun: boolean;
  status: string;
  containerIds: string[];
  carouselContainerId: string | null;
  carouselStatusCode?: string | null;
  platformMediaId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  stage?: string;
  preflight: InstagramPublishPreflight;
  itemContainerStatuses: InstagramContainerStatus[];
  carouselContainerAttempts?: number;
  mediaPublishAttempts?: number;
}

export interface RetryCarouselResult {
  ok: boolean;
  dryRun: boolean;
  status: string;
  carouselContainerId: string;
  carouselStatusCode: string | null;
  platformMediaId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  stage?: string;
  mediaPublishAttempts?: number;
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

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// GET /{creationId}?fields=id,status_code,status — never logs access_token
async function checkInstagramContainerStatus(
  creationId: string,
  accessToken: string,
  apiVersion: string
): Promise<{ statusCode: string | null; status: string | null; error: string | null }> {
  try {
    const params = new URLSearchParams({
      fields: "id,status_code,status",
      access_token: accessToken,
    });
    const res = await fetch(
      `https://graph.facebook.com/${apiVersion}/${creationId}?${params}`,
      { method: "GET" }
    );
    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      return {
        statusCode: null,
        status: null,
        error: errData.error?.message ?? "container status check failed",
      };
    }
    const data = (await res.json()) as { status_code?: string; status?: string };
    return { statusCode: data.status_code ?? null, status: data.status ?? null, error: null };
  } catch (err) {
    return { statusCode: null, status: null, error: err instanceof Error ? err.message : String(err) };
  }
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
    itemContainerStatuses: [] as InstagramContainerStatus[],
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
  const itemContainerStatuses: InstagramContainerStatus[] = [];

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
      return {
        ...base,
        ok: false,
        dryRun: false,
        status: "failed",
        containerIds,
        itemContainerStatuses,
        ...igErr,
      };
    }

    const data = (await res.json()) as { id?: string };
    if (!data.id) {
      await logEvent("failed", `No container ID returned for slide ${slide.slideNo}`, { slide_no: slide.slideNo });
      return {
        ...base,
        ok: false,
        dryRun: false,
        status: "failed",
        containerIds,
        itemContainerStatuses,
        errorCode: "missing_container_id",
        errorMessage: `No container ID returned for slide ${slide.slideNo}`,
        stage: "create_item_container",
      };
    }

    containerIds.push(data.id);
    itemContainerStatuses.push({
      slideNo: slide.slideNo,
      creationId: data.id,
      statusCode: null,
      status: null,
      createdAt: new Date().toISOString(),
    });
  }

  await logEvent("carousel_items_created", `${containerIds.length} item containers created — polling until FINISHED`, {
    container_count: containerIds.length,
  });

  // Step 2: Poll all item containers until status_code = FINISHED
  // Max wait: 10 minutes total across all containers, 10s interval
  const POLL_INTERVAL_MS = 10_000;
  const POLL_MAX_MS = 10 * 60 * 1000;
  const pollStartTime = Date.now();
  const notReady = new Set(Array.from({ length: containerIds.length }, (_, i) => i));

  while (notReady.size > 0) {
    if (Date.now() - pollStartTime > POLL_MAX_MS) {
      const unreadySlides = [...notReady].map((i) => itemContainerStatuses[i].slideNo);
      await logEvent("container_poll_timeout", `Timeout: ${notReady.size} containers not FINISHED after 10 min`, {
        unready_slide_nos: unreadySlides,
        elapsed_ms: Date.now() - pollStartTime,
      });
      return {
        ...base,
        ok: false,
        dryRun: false,
        status: "failed",
        containerIds,
        itemContainerStatuses,
        errorCode: "container_poll_timeout",
        errorMessage: `${notReady.size} item containers (slides ${unreadySlides.join(", ")}) did not reach FINISHED status within 10 minutes`,
        stage: "poll_item_containers",
      };
    }

    for (const idx of [...notReady]) {
      const creationId = containerIds[idx];
      const pollResult = await checkInstagramContainerStatus(creationId, accessToken, version);
      itemContainerStatuses[idx].statusCode = pollResult.statusCode;
      itemContainerStatuses[idx].status = pollResult.status;

      if (pollResult.statusCode === "FINISHED") {
        notReady.delete(idx);
      } else if (pollResult.statusCode === "ERROR") {
        const slideNo = itemContainerStatuses[idx].slideNo;
        await logEvent("failed", `Container for slide ${slideNo} errored during status check`, {
          slide_no: slideNo,
          creation_id: creationId,
          status_code: pollResult.statusCode,
          error: pollResult.error,
        });
        return {
          ...base,
          ok: false,
          dryRun: false,
          status: "failed",
          containerIds,
          itemContainerStatuses,
          errorCode: "container_error",
          errorMessage: `Item container for slide ${slideNo} errored: ${pollResult.error ?? "unknown"}`,
          stage: "poll_item_containers",
        };
      }
    }

    if (notReady.size > 0) {
      const elapsed = Math.round((Date.now() - pollStartTime) / 1000);
      await logEvent("container_polling", `${containerIds.length - notReady.size}/${containerIds.length} containers FINISHED — waiting 10s (${elapsed}s elapsed)`, {
        not_ready_count: notReady.size,
        not_ready_slide_nos: [...notReady].map((i) => itemContainerStatuses[i].slideNo),
        elapsed_s: elapsed,
      });
      await sleepMs(POLL_INTERVAL_MS);
    }
  }

  await logEvent("containers_ready", `All ${containerIds.length} item containers FINISHED — creating carousel container`, {
    container_count: containerIds.length,
    elapsed_ms: Date.now() - pollStartTime,
  });

  // Step 3: Create the carousel container
  // Retry up to 3 extra times on code 2 (transient Meta error), with delays 10s / 20s / 40s
  const CAROUSEL_RETRY_DELAYS_MS = [10_000, 20_000, 40_000];
  let carouselContainerId: string | null = null;
  let carouselContainerAttempts = 0;
  let lastCarouselErr: { errorCode: string | null; errorMessage: string | null; stage: string } | null = null;
  let lastCarouselErrNumericCode: number | null = null;

  for (let attempt = 0; attempt <= CAROUSEL_RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const delay = CAROUSEL_RETRY_DELAYS_MS[attempt - 1];
      await logEvent("carousel_retry", `Carousel container attempt ${attempt + 1} — waiting ${delay / 1000}s after code ${lastCarouselErrNumericCode ?? "?"}`, {
        attempt: attempt + 1,
        delay_ms: delay,
        previous_error_code: lastCarouselErrNumericCode,
      });
      await sleepMs(delay);
    }

    carouselContainerAttempts = attempt + 1;

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

    if (carouselRes.ok) {
      const carouselData = (await carouselRes.json()) as { id?: string };
      if (carouselData.id) {
        carouselContainerId = carouselData.id;
        break;
      }
    }

    if (!carouselRes.ok || !carouselContainerId) {
      const errData = (await carouselRes.json().catch(() => ({}))) as Record<string, unknown>;
      lastCarouselErr = sanitizeIgError(errData, "create_carousel_container");
      const rawCode = (errData.error as Record<string, unknown> | undefined)?.code;
      lastCarouselErrNumericCode = rawCode != null ? Number(rawCode) : null;

      // Only retry on code 2 (transient / internal Meta error)
      if (lastCarouselErrNumericCode !== 2 || attempt >= CAROUSEL_RETRY_DELAYS_MS.length) break;
    }
  }

  if (!carouselContainerId) {
    const isTransient = lastCarouselErrNumericCode === 2;
    const hint = isTransient
      ? " — Meta code 2: transient/internal error. Child containers may still be indexing. Try pressing the manual publish button again."
      : "";
    await logEvent("failed", `Carousel container failed after ${carouselContainerAttempts} attempt(s): ${lastCarouselErr?.errorMessage}`, {
      error_code: lastCarouselErr?.errorCode,
      stage: "create_carousel_container",
      attempts: carouselContainerAttempts,
      item_container_count: containerIds.length,
      is_transient: isTransient,
    });
    return {
      ...base,
      ok: false,
      dryRun: false,
      status: "failed",
      containerIds,
      carouselContainerId: null,
      itemContainerStatuses,
      carouselContainerAttempts,
      errorCode: lastCarouselErr?.errorCode ?? "carousel_create_failed",
      errorMessage: `${lastCarouselErr?.errorMessage ?? "Unknown error"}${hint}`,
      stage: "create_carousel_container",
    };
  }

  await logEvent("carousel_container_created", `Carousel container created (attempt ${carouselContainerAttempts})`, {
    carousel_container_id: carouselContainerId,
    attempts: carouselContainerAttempts,
  });

  // Step 3.5: Poll carousel container until FINISHED before media_publish
  let carouselStatusCode: string | null = null;
  {
    const carouselPollStart = Date.now();
    while (true) {
      if (Date.now() - carouselPollStart > POLL_MAX_MS) {
        await logEvent("failed", "Carousel container not FINISHED after 10 min polling", {
          carousel_container_id: carouselContainerId,
          elapsed_ms: Date.now() - carouselPollStart,
        });
        return {
          ...base,
          ok: false,
          dryRun: false,
          status: "failed",
          containerIds,
          carouselContainerId,
          carouselStatusCode,
          itemContainerStatuses,
          carouselContainerAttempts,
          errorCode: "carousel_poll_timeout",
          errorMessage: "Carousel container did not reach FINISHED status within 10 minutes",
          stage: "poll_carousel_container",
        };
      }
      const poll = await checkInstagramContainerStatus(carouselContainerId!, accessToken, version);
      carouselStatusCode = poll.statusCode;
      if (carouselStatusCode === "FINISHED") break;
      if (carouselStatusCode === "ERROR") {
        await logEvent("failed", `Carousel container errored: ${poll.error}`, {
          carousel_container_id: carouselContainerId,
          status_code: carouselStatusCode,
        });
        return {
          ...base,
          ok: false,
          dryRun: false,
          status: "failed",
          containerIds,
          carouselContainerId,
          carouselStatusCode,
          itemContainerStatuses,
          carouselContainerAttempts,
          errorCode: "carousel_container_error",
          errorMessage: `Carousel container errored: ${poll.error ?? "unknown"}`,
          stage: "poll_carousel_container",
        };
      }
      const elapsed = Math.round((Date.now() - carouselPollStart) / 1000);
      await logEvent("carousel_polling", `Carousel container status: ${carouselStatusCode ?? "unknown"} — waiting 10s (${elapsed}s elapsed)`, {
        carousel_container_id: carouselContainerId,
        status_code: carouselStatusCode,
        elapsed_s: elapsed,
      });
      await sleepMs(POLL_INTERVAL_MS);
    }
    await logEvent("carousel_ready", "Carousel container FINISHED — calling media_publish", {
      carousel_container_id: carouselContainerId,
      elapsed_ms: Date.now() - carouselPollStart,
    });
  }

  // Step 4: Publish — retry up to 3 times on code 9007 (carousel not yet indexed)
  const MEDIA_PUBLISH_RETRY_DELAYS_MS = [20_000, 40_000, 80_000];
  let platformMediaId: string | null = null;
  let mediaPublishAttempts = 0;
  let lastPublishErr: { errorCode: string | null; errorMessage: string | null; stage: string } | null = null;
  let lastPublishErrNumericCode: number | null = null;

  for (let attempt = 0; attempt <= MEDIA_PUBLISH_RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const delay = MEDIA_PUBLISH_RETRY_DELAYS_MS[attempt - 1];
      await logEvent("media_publish_retry", `media_publish attempt ${attempt + 1} — waiting ${delay / 1000}s after code 9007`, {
        attempt: attempt + 1,
        delay_ms: delay,
        carousel_container_id: carouselContainerId,
      });
      await sleepMs(delay);
    }
    mediaPublishAttempts = attempt + 1;

    const publishRaw = (await fetch(`${apiBase}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken, creation_id: carouselContainerId }),
    }).then((r) => r.json()).catch(() => ({}))) as Record<string, unknown> & { id?: string };

    if (publishRaw.id) {
      platformMediaId = publishRaw.id;
      break;
    }

    lastPublishErr = sanitizeIgError(publishRaw, "media_publish");
    const rawCode = (publishRaw.error as Record<string, unknown> | undefined)?.code;
    lastPublishErrNumericCode = rawCode != null ? Number(rawCode) : null;
    if (lastPublishErrNumericCode !== 9007 || attempt >= MEDIA_PUBLISH_RETRY_DELAYS_MS.length) break;
  }

  if (!platformMediaId) {
    const hint = lastPublishErrNumericCode === 9007
      ? " — Code 9007: carousel not yet indexed. Use '重試發布現有 carousel container' to retry without recreating containers."
      : "";
    await logEvent("failed", `Publish failed after ${mediaPublishAttempts} attempt(s): ${lastPublishErr?.errorMessage}`, {
      error_code: lastPublishErr?.errorCode,
      stage: "media_publish",
      attempts: mediaPublishAttempts,
      carousel_container_id: carouselContainerId,
    });
    return {
      ...base,
      ok: false,
      dryRun: false,
      status: "failed",
      containerIds,
      carouselContainerId,
      carouselStatusCode,
      itemContainerStatuses,
      carouselContainerAttempts,
      mediaPublishAttempts,
      errorCode: lastPublishErr?.errorCode ?? "media_publish_failed",
      errorMessage: `${lastPublishErr?.errorMessage ?? "Unknown error"}${hint}`,
      stage: "media_publish",
    };
  }

  await logEvent("published", "Instagram carousel published successfully", {
    platform_media_id: platformMediaId,
    carousel_container_id: carouselContainerId,
    container_count: containerIds.length,
    media_publish_attempts: mediaPublishAttempts,
  });

  return {
    ok: true,
    dryRun: false,
    status: "published",
    containerIds,
    carouselContainerId,
    carouselStatusCode,
    platformMediaId,
    errorCode: null,
    errorMessage: null,
    preflight,
    itemContainerStatuses,
    carouselContainerAttempts,
    mediaPublishAttempts,
  };
}

// Retry media_publish using an existing carousel container ID (no item container recreation).
// Use this when a publish job has failed at media_publish with code 9007.
export async function retryExistingCarouselPublish(input: {
  runId: string;
  carouselContainerId: string;
}): Promise<RetryCarouselResult> {
  const autoPublishEnabled = process.env.PHOENIX_AUTO_PUBLISH_ENABLED === "true";
  const hasMetaConfig = Boolean(process.env.META_ACCESS_TOKEN && process.env.META_IG_USER_ID);

  if (!autoPublishEnabled) {
    return {
      ok: true,
      dryRun: true,
      status: "dry_run_ready",
      carouselContainerId: input.carouselContainerId,
      carouselStatusCode: null,
      platformMediaId: null,
      errorCode: "auto_publish_disabled",
      errorMessage: "Auto publish disabled — set PHOENIX_AUTO_PUBLISH_ENABLED=true to retry.",
    };
  }

  if (!hasMetaConfig) {
    return {
      ok: true,
      dryRun: true,
      status: "dry_run_missing_env",
      carouselContainerId: input.carouselContainerId,
      carouselStatusCode: null,
      platformMediaId: null,
      errorCode: "missing_env",
      errorMessage: "META_ACCESS_TOKEN or META_IG_USER_ID not configured.",
    };
  }

  const igUserId = process.env.META_IG_USER_ID!;
  const accessToken = process.env.META_ACCESS_TOKEN!;
  const version = process.env.META_GRAPH_API_VERSION ?? "v23.0";
  const apiBase = `https://graph.facebook.com/${version}/${igUserId}`;

  const logEvent = async (status: string, message: string, payload?: Record<string, unknown>) => {
    try {
      await logJobEvent({ run_id: input.runId, job_type: "daily_publish", status, message, payload });
    } catch { /* non-critical */ }
  };

  await logEvent("retry_carousel_started", "Retrying media_publish with existing carousel container", {
    carousel_container_id: input.carouselContainerId,
  });

  // Poll carousel container until FINISHED (max 10 min, 10s intervals)
  const POLL_INTERVAL_MS = 10_000;
  const POLL_MAX_MS = 10 * 60 * 1000;
  const pollStart = Date.now();
  let carouselStatusCode: string | null = null;

  while (true) {
    if (Date.now() - pollStart > POLL_MAX_MS) {
      await logEvent("failed", "Carousel container not FINISHED after 10 min polling", {
        carousel_container_id: input.carouselContainerId,
      });
      return {
        ok: false,
        dryRun: false,
        status: "failed",
        carouselContainerId: input.carouselContainerId,
        carouselStatusCode,
        platformMediaId: null,
        errorCode: "carousel_poll_timeout",
        errorMessage: "Carousel container did not reach FINISHED status within 10 minutes",
        stage: "poll_carousel_container",
      };
    }
    const poll = await checkInstagramContainerStatus(input.carouselContainerId, accessToken, version);
    carouselStatusCode = poll.statusCode;
    if (carouselStatusCode === "FINISHED") break;
    if (carouselStatusCode === "ERROR") {
      await logEvent("failed", `Carousel container errored: ${poll.error}`, {
        carousel_container_id: input.carouselContainerId,
        status_code: carouselStatusCode,
      });
      return {
        ok: false,
        dryRun: false,
        status: "failed",
        carouselContainerId: input.carouselContainerId,
        carouselStatusCode,
        platformMediaId: null,
        errorCode: "carousel_container_error",
        errorMessage: `Carousel container errored: ${poll.error ?? "unknown"}`,
        stage: "poll_carousel_container",
      };
    }
    const elapsed = Math.round((Date.now() - pollStart) / 1000);
    await logEvent("carousel_polling", `Carousel container status: ${carouselStatusCode ?? "unknown"} — waiting 10s (${elapsed}s elapsed)`, {
      carousel_container_id: input.carouselContainerId,
      elapsed_s: elapsed,
    });
    await sleepMs(POLL_INTERVAL_MS);
  }

  await logEvent("carousel_ready", "Carousel container FINISHED — retrying media_publish", {
    carousel_container_id: input.carouselContainerId,
    elapsed_ms: Date.now() - pollStart,
  });

  // Retry media_publish on code 9007 (max 3 retries, delays 20s/40s/80s)
  const MEDIA_PUBLISH_RETRY_DELAYS_MS = [20_000, 40_000, 80_000];
  let platformMediaId: string | null = null;
  let mediaPublishAttempts = 0;
  let lastPublishErr: { errorCode: string | null; errorMessage: string | null; stage: string } | null = null;
  let lastPublishErrNumericCode: number | null = null;

  for (let attempt = 0; attempt <= MEDIA_PUBLISH_RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const delay = MEDIA_PUBLISH_RETRY_DELAYS_MS[attempt - 1];
      await logEvent("media_publish_retry", `media_publish attempt ${attempt + 1} — waiting ${delay / 1000}s`, {
        attempt: attempt + 1,
        delay_ms: delay,
        carousel_container_id: input.carouselContainerId,
      });
      await sleepMs(delay);
    }
    mediaPublishAttempts = attempt + 1;

    const publishRaw = (await fetch(`${apiBase}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken, creation_id: input.carouselContainerId }),
    }).then((r) => r.json()).catch(() => ({}))) as Record<string, unknown> & { id?: string };

    if (publishRaw.id) {
      platformMediaId = publishRaw.id;
      break;
    }

    lastPublishErr = sanitizeIgError(publishRaw, "media_publish");
    const rawCode = (publishRaw.error as Record<string, unknown> | undefined)?.code;
    lastPublishErrNumericCode = rawCode != null ? Number(rawCode) : null;
    if (lastPublishErrNumericCode !== 9007 || attempt >= MEDIA_PUBLISH_RETRY_DELAYS_MS.length) break;
  }

  if (!platformMediaId) {
    await logEvent("failed", `Retry publish failed after ${mediaPublishAttempts} attempt(s): ${lastPublishErr?.errorMessage}`, {
      error_code: lastPublishErr?.errorCode,
      stage: "media_publish",
      attempts: mediaPublishAttempts,
      carousel_container_id: input.carouselContainerId,
    });
    return {
      ok: false,
      dryRun: false,
      status: "failed",
      carouselContainerId: input.carouselContainerId,
      carouselStatusCode,
      platformMediaId: null,
      errorCode: lastPublishErr?.errorCode ?? "media_publish_failed",
      errorMessage: lastPublishErr?.errorMessage ?? "Unknown error",
      stage: "media_publish",
      mediaPublishAttempts,
    };
  }

  await logEvent("published", "Instagram carousel published successfully via carousel retry", {
    platform_media_id: platformMediaId,
    carousel_container_id: input.carouselContainerId,
    media_publish_attempts: mediaPublishAttempts,
  });

  return {
    ok: true,
    dryRun: false,
    status: "published",
    carouselContainerId: input.carouselContainerId,
    carouselStatusCode,
    platformMediaId,
    errorCode: null,
    errorMessage: null,
    mediaPublishAttempts,
  };
}
