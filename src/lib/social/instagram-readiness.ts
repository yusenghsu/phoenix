// Server-side only. Instagram publish readiness checker.
// Reads account info via Graph API GET — never calls /media or /media_publish.
// Never logs or returns META_ACCESS_TOKEN or any credential.
import "server-only";

import { getRunDetails } from "@/lib/daily-workflow/service";

export interface ReadinessCheck {
  key: string;
  label: string;
  status: "pass" | "fail" | "warning";
  message: string;
}

export interface IGAccountInfo {
  igUserId?: string;
  username?: string;
  accountType?: string;
  mediaCount?: number;
}

export interface MediaPreflight {
  total: number;
  publicCount: number;
  localCount: number;
  invalidUrls: string[];
}

export interface InstagramReadinessResult {
  ok: boolean;
  canAttemptPublish: boolean;
  autoPublishEnabled: boolean;
  checks: ReadinessCheck[];
  account?: IGAccountInfo;
  missingEnv: string[];
  mediaPreflight: MediaPreflight;
}

function isPublicUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/")) return false;
  if (url.startsWith("data:")) return false;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url)) return false;
  if (!url.startsWith("https://")) return false;
  return true;
}

export async function checkInstagramReadiness(
  input: { runId?: string }
): Promise<InstagramReadinessResult> {
  const checks: ReadinessCheck[] = [];
  const missingEnv: string[] = [];
  let account: IGAccountInfo | undefined;

  // 1. PHOENIX_AUTO_PUBLISH_ENABLED
  const autoPublishEnabled = process.env.PHOENIX_AUTO_PUBLISH_ENABLED === "true";
  checks.push({
    key: "auto_publish_enabled",
    label: "PHOENIX_AUTO_PUBLISH_ENABLED",
    status: autoPublishEnabled ? "warning" : "pass",
    message: autoPublishEnabled
      ? "Auto publish ENABLED — 20:00 cron will attempt real Instagram publish"
      : "Auto publish disabled — 20:00 cron remains dry-run only",
  });

  // 2. META_ACCESS_TOKEN (existence only — value never returned or logged)
  const hasAccessToken = Boolean(process.env.META_ACCESS_TOKEN);
  if (!hasAccessToken) missingEnv.push("META_ACCESS_TOKEN");
  checks.push({
    key: "meta_access_token",
    label: "META_ACCESS_TOKEN",
    status: hasAccessToken ? "pass" : "fail",
    message: hasAccessToken ? "Token present (value hidden)" : "Missing — required for Instagram API",
  });

  // 3. META_IG_USER_ID
  const hasIgUserId = Boolean(process.env.META_IG_USER_ID);
  if (!hasIgUserId) missingEnv.push("META_IG_USER_ID");
  checks.push({
    key: "meta_ig_user_id",
    label: "META_IG_USER_ID",
    status: hasIgUserId ? "pass" : "fail",
    message: hasIgUserId ? "Set" : "Missing — required for Instagram API",
  });

  // 4. META_GRAPH_API_VERSION
  const apiVersion = process.env.META_GRAPH_API_VERSION ?? "v23.0";
  const hasApiVersion = Boolean(process.env.META_GRAPH_API_VERSION);
  checks.push({
    key: "meta_graph_api_version",
    label: "META_GRAPH_API_VERSION",
    status: hasApiVersion ? "pass" : "warning",
    message: hasApiVersion ? `Set: ${apiVersion}` : `Not set — using default: ${apiVersion}`,
  });

  // 5. Media URLs from run (requires runId)
  let mediaPreflight: MediaPreflight = { total: 0, publicCount: 0, localCount: 0, invalidUrls: [] };

  if (input.runId) {
    try {
      const { slides, publishJobs } = await getRunDetails(input.runId);
      const readySlides = slides.filter((s) => s.final_ratio_status === "passed_4_5");
      const finalUrls = readySlides.map((s) => s.final_video_url ?? "");
      const publicCount = finalUrls.filter(isPublicUrl).length;
      const localCount = finalUrls.filter(
        (url) => url.startsWith("/") || /localhost/.test(url)
      ).length;
      const invalidUrls = finalUrls.filter((url) => !isPublicUrl(url));

      mediaPreflight = { total: readySlides.length, publicCount, localCount, invalidUrls };

      const allPublic = readySlides.length === 8 && publicCount === 8;
      checks.push({
        key: "media_urls",
        label: "Final MP4 URLs（8 張）",
        status: allPublic ? "pass" : readySlides.length === 0 ? "fail" : "warning",
        message: allPublic
          ? "8/8 final MP4s are public HTTPS URLs"
          : `${publicCount}/${readySlides.length} public — ${invalidUrls.length} not public`,
      });

      // 6. Publish job status
      const igJob = publishJobs.find((j) => j.platform === "instagram");
      if (igJob) {
        checks.push({
          key: "publish_job",
          label: "Publish Job",
          status: igJob.status === "published" ? "warning" : igJob.status === "failed" ? "warning" : "pass",
          message:
            igJob.status === "published"
              ? `Already published (${igJob.published_at?.slice(0, 16) ?? "—"}) — re-publishing not recommended`
              : igJob.status === "failed"
              ? `Previous attempt failed: ${igJob.error_code ?? "unknown"}`
              : `Status: ${igJob.status}`,
        });
      } else {
        checks.push({
          key: "publish_job",
          label: "Publish Job",
          status: "warning",
          message: "No publish job yet — will be created when 20:00 cron runs",
        });
      }
    } catch (err) {
      checks.push({
        key: "media_urls",
        label: "Final MP4 URLs",
        status: "fail",
        message: `Could not load run: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  } else {
    checks.push({
      key: "media_urls",
      label: "Final MP4 URLs（8 張）",
      status: "warning",
      message: "No run ID — cannot check media URLs",
    });
  }

  // 7. Graph API read test (GET only — reads account info, never creates media)
  if (hasAccessToken && hasIgUserId) {
    const igUserId = process.env.META_IG_USER_ID!;
    const accessToken = process.env.META_ACCESS_TOKEN!;

    try {
      // access_token in query param is standard Meta Graph API — never stored or logged
      const params = new URLSearchParams({
        fields: "id,username,account_type,media_count",
        access_token: accessToken,
      });
      const readRes = await fetch(
        `https://graph.facebook.com/${apiVersion}/${igUserId}?${params}`,
        { method: "GET" }
      );

      if (readRes.ok) {
        const data = (await readRes.json()) as {
          id?: string;
          username?: string;
          account_type?: string;
          media_count?: number;
        };
        account = {
          igUserId: data.id,
          username: data.username,
          accountType: data.account_type,
          mediaCount: data.media_count,
        };
        checks.push({
          key: "graph_api_read",
          label: "Graph API Read Test",
          status: "pass",
          message: `Connected as @${data.username ?? igUserId} (${data.account_type ?? "unknown"})`,
        });
      } else {
        const errData = (await readRes.json().catch(() => ({}))) as {
          error?: { code?: number; message?: string; type?: string; fbtrace_id?: string };
        };
        const err = errData.error;
        const fbtrace = err?.fbtrace_id ? ` | trace: ${err.fbtrace_id}` : "";
        checks.push({
          key: "graph_api_read",
          label: "Graph API Read Test",
          status: "fail",
          message: `API error ${err?.code ?? readRes.status}: ${err?.message ?? "unknown"}${fbtrace}`,
        });
      }
    } catch (err) {
      checks.push({
        key: "graph_api_read",
        label: "Graph API Read Test",
        status: "fail",
        message: `Network error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  } else {
    checks.push({
      key: "graph_api_read",
      label: "Graph API Read Test",
      status: "fail",
      message: "Not tested — META_ACCESS_TOKEN or META_IG_USER_ID missing",
    });
  }

  const hasFail = checks.some((c) => c.status === "fail");
  const mediaOk = mediaPreflight.total === 8 && mediaPreflight.publicCount === 8;
  const canAttemptPublish =
    !hasFail && mediaOk && hasAccessToken && hasIgUserId && autoPublishEnabled;

  return {
    ok: !hasFail,
    canAttemptPublish,
    autoPublishEnabled,
    checks,
    account,
    missingEnv,
    mediaPreflight,
  };
}
