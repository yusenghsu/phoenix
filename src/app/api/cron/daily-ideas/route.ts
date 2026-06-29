// Cron: 03:00 Taiwan time (UTC 19:00 previous day).
// Generates 5 topic candidates via OpenAI (or demo fallback).
// Supports ?force=1 to delete existing candidates and regenerate.
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
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const result = await runDailyIdeas(auth.devMode, force);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
