// Cron: 03:00 Taiwan time (UTC 19:00 previous day).
// Triggers daily topic idea generation skeleton.
// No OpenAI — skeleton only.
import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/daily-workflow/cron";
import { runDailyIdeas } from "@/lib/daily-workflow/cron-runners";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, route: "daily-ideas", error: auth.reason ?? "Unauthorized" },
      { status: 401 }
    );
  }
  const result = await runDailyIdeas(auth.devMode);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
