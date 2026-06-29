// Cron: 20:00 Taiwan time (UTC 12:00).
// Checks if 8/8 slides are READY and triggers publish skeleton.
// Does NOT call Instagram.
import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/daily-workflow/cron";
import { runDailyPublish } from "@/lib/daily-workflow/cron-runners";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, route: "daily-publish", error: auth.reason ?? "Unauthorized" },
      { status: 401 }
    );
  }
  const result = await runDailyPublish(auth.devMode);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
