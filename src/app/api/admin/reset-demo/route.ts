import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { resetDemoData } from "@/lib/data/reset-demo";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-demo-reset-secret");
  const expected = process.env.DEMO_RESET_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const client = createServerClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured. Reset requires live database." },
      { status: 503 }
    );
  }

  const result = await resetDemoData(client);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 500 });
  }

  return NextResponse.json(result);
}
