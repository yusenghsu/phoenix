// Debug proxy for Cron Test Panel in /debug/daily-runs.
// Runs cron logic server-side without requiring CRON_SECRET from the browser.
// Never expose this to production — debug only.
import { NextRequest, NextResponse } from "next/server";
import { runDailyIdeas, runDailyGenerate, runDailyPublish } from "@/lib/daily-workflow/cron-runners";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { type?: string } = {};
  try {
    body = (await req.json()) as { type?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { type } = body;

  if (type === "ideas") {
    const result = await runDailyIdeas(true);
    return NextResponse.json(result);
  }
  if (type === "generate") {
    const result = await runDailyGenerate(true);
    return NextResponse.json(result);
  }
  if (type === "publish") {
    const result = await runDailyPublish(true);
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { ok: false, error: "Invalid type. Must be: ideas | generate | publish" },
    { status: 400 }
  );
}
