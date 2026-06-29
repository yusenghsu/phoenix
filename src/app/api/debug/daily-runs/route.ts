// Dev-only API for the daily-runs debug dashboard.
// Returns 403 in production.
import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateDailyRun,
  getTodayRun,
  updateRunStatus,
  getRunDetails,
  getTaiwanDateString,
} from "@/lib/daily-workflow/service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("run_id");

    if (runId) {
      const details = await getRunDetails(runId);
      return NextResponse.json({ status: "ok", ...details });
    }

    const run = await getTodayRun();
    return NextResponse.json({ status: "ok", run: run ?? null, today: getTaiwanDateString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  try {
    const body = (await req.json()) as { action?: string; run_id?: string; status?: string };

    if (body.action === "create_today") {
      const today = getTaiwanDateString();
      const run = await getOrCreateDailyRun(today);
      return NextResponse.json({ status: "ok", run });
    }

    if (body.action === "reset" && body.run_id) {
      const run = await updateRunStatus(body.run_id, "idle", { reset_at: new Date().toISOString() });
      return NextResponse.json({ status: "ok", run });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}
