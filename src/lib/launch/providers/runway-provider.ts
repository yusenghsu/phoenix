// Server-side only — never import in client components.
// Reads RUNWAY_API_KEY from process.env (not NEXT_PUBLIC).
// Based on Runway Gen-3 Alpha Turbo REST API (2024-11-06).

const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";
const RUNWAY_VERSION = "2024-11-06";
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 36; // 3-minute ceiling

// Text-to-video uses 9:16 (768×1280) — Runway's closest portrait ratio to 4:5.
// The output ratio must be validated after generation; do not assume it matches 4:5.
const RUNWAY_PORTRAIT_RATIO = "768:1280";

type RunwayTaskStatus =
  | "PENDING"
  | "THROTTLED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

interface RunwayTask {
  id: string;
  status: RunwayTaskStatus;
  output?: string[];
  failure?: string;
  failureCode?: string;
  progress?: number;
}

export function isRunwayConfigured(): boolean {
  return Boolean(process.env.RUNWAY_API_KEY);
}

function makeHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "X-Runway-Version": RUNWAY_VERSION,
    "Content-Type": "application/json",
  };
}

async function pollTask(
  taskId: string,
  headers: Record<string, string>,
  label: string
): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, { headers });
    if (!pollRes.ok) {
      console.warn(`[runway][${label}] poll ${attempt + 1} HTTP ${pollRes.status} — retrying`);
      continue;
    }

    const task = (await pollRes.json()) as RunwayTask;
    console.log(`[runway][${label}] poll ${attempt + 1}: status=${task.status} progress=${task.progress ?? "?"}%`);

    if (task.status === "SUCCEEDED") {
      const videoUrl = task.output?.[0];
      if (!videoUrl) throw new Error("Runway SUCCEEDED but output[0] is missing");
      return videoUrl;
    }

    if (task.status === "FAILED" || task.status === "CANCELLED") {
      throw new Error(`Runway task ${task.status}: ${task.failure ?? task.failureCode ?? "no details"}`);
    }
  }

  throw new Error(`Runway generation timed out after ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s`);
}

// ── Text-to-video (existing) ───────────────────────────────────────────────────

export async function generateRunwayVideo({
  slideId,
  prompt,
  durationSeconds,
}: {
  slideId: string;
  prompt: string;
  durationSeconds: 4 | 5 | 6;
}): Promise<{ video_url: string; generated_at: string }> {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) throw new Error("RUNWAY_API_KEY not configured. Add it to .env.local.");

  const model = process.env.RUNWAY_MODEL ?? "gen3a_turbo";
  const duration = durationSeconds === 4 || durationSeconds === 6 ? 5 : durationSeconds;
  const headers = makeHeaders(apiKey);

  console.log(`[runway][txt2vid] creating task — model=${model} duration=${duration}s slide=${slideId}`);

  const createRes = await fetch(`${RUNWAY_API_BASE}/text_to_video`, {
    method: "POST",
    headers,
    body: JSON.stringify({ promptText: prompt, model, ratio: RUNWAY_PORTRAIT_RATIO, duration }),
  });

  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "(unreadable)");
    throw new Error(`Runway task creation failed ${createRes.status}: ${body}`);
  }

  const { id: taskId } = (await createRes.json()) as { id: string };
  console.log(`[runway][txt2vid] task created: ${taskId}`);

  const videoUrl = await pollTask(taskId, headers, "txt2vid");
  return { video_url: videoUrl, generated_at: new Date().toISOString() };
}

// ── Image-to-video (first-frame motion pipeline) ──────────────────────────────
// Accepts a 4:5 keyframe as a base64 data URI and generates motion via Runway.
// Output ratio is NOT guaranteed — the keyframe controls composition framing,
// but the final video dimensions must be validated post-generation.

export async function generateRunwayVideoFromKeyframe({
  slideId,
  keyframeDataUri,
  prompt,
  durationSeconds,
}: {
  slideId: string;
  keyframeDataUri: string; // data:image/png;base64,...
  prompt: string;
  durationSeconds: 4 | 5 | 6;
}): Promise<{ video_url: string; generated_at: string }> {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) throw new Error("RUNWAY_API_KEY not configured. Add it to .env.local.");

  const model = process.env.RUNWAY_MODEL ?? "gen3a_turbo";
  const duration = durationSeconds === 4 || durationSeconds === 6 ? 5 : durationSeconds;
  const headers = makeHeaders(apiKey);

  console.log(`[runway][img2vid] creating task — model=${model} duration=${duration}s slide=${slideId}`);

  const createRes = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
    method: "POST",
    headers,
    body: JSON.stringify({ promptImage: keyframeDataUri, promptText: prompt, model, duration }),
  });

  if (!createRes.ok) {
    const body = await createRes.text().catch(() => "(unreadable)");
    throw new Error(`Runway image-to-video failed ${createRes.status}: ${body}`);
  }

  const { id: taskId } = (await createRes.json()) as { id: string };
  console.log(`[runway][img2vid] task created: ${taskId}`);

  const videoUrl = await pollTask(taskId, headers, "img2vid");
  return { video_url: videoUrl, generated_at: new Date().toISOString() };
}
