// Dev-only. Instagram publish readiness checker.
// Returns 403 in production. Never returns secrets or tokens.
// Accepts ?runId= (preferred) or ?run_id= — uses specified run, not today's run.
import { NextRequest, NextResponse } from "next/server";
import { checkInstagramReadiness } from "@/lib/social/instagram-readiness";

export const runtime = "nodejs";

// Read-only — safe in production. Never returns credentials or tokens.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // Accept both ?runId= and ?run_id= for convenience
  const runId = searchParams.get("runId") ?? searchParams.get("run_id") ?? undefined;

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
        runIdUsed: runId,
        fallbackUsed: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
