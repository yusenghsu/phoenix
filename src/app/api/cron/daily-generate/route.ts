// Cron: 17:00 Taiwan time (UTC 09:00).
// Triggers carousel generation for the selected topic.
// Skeleton only — no Runway, no OpenAI.
import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/daily-workflow/cron";
import { runDailyGenerate } from "@/lib/daily-workflow/cron-runners";

export const runtime = "nodejs";
export const maxDuration = 60;

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
