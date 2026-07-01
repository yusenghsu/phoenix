// Dev-only. Instagram publish readiness checker.
// Returns 403 in production. Never returns secrets or tokens.
import { NextRequest, NextResponse } from "next/server";
import { checkInstagramReadiness } from "@/lib/social/instagram-readiness";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("run_id") ?? undefined;

  try {
    const result = await checkInstagramReadiness({ runId });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        canAttemptPublish: false,
        autoPublishEnabled: false,
        checks: [],
        missingEnv: [],
        mediaPreflight: { total: 0, publicCount: 0, localCount: 0, invalidUrls: [] },
        error: msg,
      },
      { status: 500 }
    );
  }
}
