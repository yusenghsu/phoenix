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
      message: "Daily decision mock run completed.",
    });
  }

  const result = await runDailyDecision(client);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 500 });
  }

  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
