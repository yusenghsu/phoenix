// Cron: 17:00 Taiwan time (UTC 09:00).
// Generates 8 motion carousel slides via OpenAI keyframe + Runway motion + ffmpeg compose.
// Sequential — no parallel Runway calls. Resumes from last complete slide.
import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/daily-workflow/cron";
import { runDailyGenerate } from "@/lib/daily-workflow/cron-runners";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, route: "daily-generate", error: auth.reason ?? "Unauthorized" },
      { status: 401 }
    );
  }
  const result = await runDailyGenerate(auth.devMode);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
