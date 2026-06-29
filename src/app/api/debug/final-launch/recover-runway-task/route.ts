// Dev-only route — returns 403 in production.
// Recovers an existing successful Runway task into the local manifest without re-generating.
// No API key is logged. No secrets are exposed in responses.

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { updateSlide, slideRouteIdToManifestKey, GENERATED_DIR } from "@/lib/launch/manifest";

export const runtime = "nodejs";
export const maxDuration = 60;

const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";
const RUNWAY_VERSION = "2024-11-06";
const TASK_ENDPOINT_TEMPLATE = "/v1/tasks/:id";

interface RequestBody {
  slide_id: string;
  task_id: string;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { status: "failed", error: "Debug route not available in production." },
      { status: 403 }
    );
  }

  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { status: "failed", error: "RUNWAY_API_KEY not configured." },
      { status: 500 }
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ status: "failed", error: "Invalid JSON body." }, { status: 400 });
  }

  const { slide_id, task_id } = body;
  if (!slide_id || !task_id) {
    return NextResponse.json(
      { status: "failed", error: "slide_id and task_id are required." },
      { status: 400 }
    );
  }

  const manifestKey = slideRouteIdToManifestKey(slide_id);
  if (!manifestKey) {
    return NextResponse.json(
      { status: "failed", error: `slide_id must be slide-01 through slide-08. Got: ${slide_id}` },
      { status: 400 }
    );
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "X-Runway-Version": RUNWAY_VERSION,
    "Content-Type": "application/json",
  };

  console.log("[Runway recover task]", { taskId: task_id, endpoint: TASK_ENDPOINT_TEMPLATE });

  const taskUrl = `${RUNWAY_API_BASE}/tasks/${task_id}`;
  const taskRes = await fetch(taskUrl, { method: "GET", headers });

  if (!taskRes.ok) {
    let errorBody = "(unreadable)";
    try { errorBody = await taskRes.text(); } catch { /* ignore */ }

    const hint =
      taskRes.status === 404
        ? "Task not found. Confirm task id, organization, API key, and endpoint. Task outputs may expire after some time."
        : taskRes.status === 401
        ? "Unauthorized. Confirm RUNWAY_API_KEY is correct and active."
        : `Runway API returned ${taskRes.status}.`;

    return NextResponse.json(
      {
        status: "failed",
        provider: "runway",
        task_id,
        runway_http_status: taskRes.status,
        attempted_endpoint: TASK_ENDPOINT_TEMPLATE,
        hint,
        error_body: errorBody,
      },
      { status: 502 }
    );
  }

  const task = (await taskRes.json()) as {
    id: string;
    status: string;
    output?: string[];
    failure?: string;
    failureCode?: string;
  };

  console.log("[Runway recover result]", {
    taskId: task.id,
    status: task.status,
    hasOutput: Array.isArray(task.output) && task.output.length > 0,
  });

  if (task.status !== "SUCCEEDED") {
    return NextResponse.json({
      status: "failed",
      provider: "runway",
      task_id,
      runway_status: task.status,
      failure_code: task.failureCode,
      failure_message: task.failure,
      attempted_endpoint: TASK_ENDPOINT_TEMPLATE,
      error: `Task is not SUCCEEDED — status is ${task.status}. Cannot recover.`,
    });
  }

  const videoUrl = task.output?.[0];
  if (!videoUrl) {
    return NextResponse.json(
      { status: "failed", provider: "runway", task_id, error: "Runway task succeeded but output URL is missing." },
      { status: 500 }
    );
  }

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) {
    return NextResponse.json(
      { status: "failed", task_id, error: `Failed to download Runway video: HTTP ${videoRes.status}. The output URL may have expired.` },
      { status: 502 }
    );
  }

  const buffer = Buffer.from(await videoRes.arrayBuffer());
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  const localFilename = `${slide_id}-runway-intermediate.mp4`;
  await fs.writeFile(path.join(GENERATED_DIR, localFilename), buffer);
  const localVideoUrl = `/generated/final-launch-pack/${localFilename}`;

  await updateSlide(manifestKey, {
    runway_motion_status: "generated",
    runway_intermediate_video_url: localVideoUrl,
    runway_task_id: task_id,
    provider_ratio_status: "accepted_intermediate",
    provider_ratio_source: "declared_runway_request_ratio",
    final_composition_status: "needed",
    final_ratio_status: "unknown",
  });

  console.log("[recover-runway-task] recovery complete", { task_id, slide_id, localVideoUrl });

  return NextResponse.json({
    status: "recovered",
    task_id,
    slide_id,
    runway_intermediate_video_url: localVideoUrl,
    provider_requested_ratio: "832:1104",
    provider_ratio_status: "accepted_intermediate",
    final_composition_status: "needed",
    final_ratio_status: "unknown",
  });
}
