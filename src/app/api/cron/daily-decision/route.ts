import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { runDailyDecision } from "@/lib/data/daily-decision";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = req.headers.get("x-cron-secret");
  if (header === expected) return true;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${expected}`) return true;

  return false;
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const client = createServerClient();
  if (!client) {
    return NextResponse.json({
      ok: true,
      source: "mock_fallback",
      provider: process.env.DECISION_ENGINE_PROVIDER ?? "mock",
      writes: false,
      message: "Daily decision mock run completed. Supabase not configured.",
    });
  }

  const result = await runDailyDecision(client);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 500 });
  }

  if (result.skipped) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: result.reason,
      decision: result.decision,
      message: result.message,
    });
  }

  return NextResponse.json({
    ok: true,
    provider: result.provider,
    status: result.decision?.status ?? "draft",
    publishJobStatus: result.publish_job?.status ?? "pending",
    forcePublish: result.publish_job?.force_publish ?? false,
    writes: result.writes ?? true,
    decision: result.decision,
    carousel_slides: result.carousel_slides,
    message: result.message,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
