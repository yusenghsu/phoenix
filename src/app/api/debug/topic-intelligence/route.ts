import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { checkInternalDebugAuth } from "@/lib/auth/internal-debug";
import { runTopicIntelligence } from "@/lib/decision/topic-intelligence";

export async function POST(req: NextRequest) {
  const auth = checkInternalDebugAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const apiKeyPresent = !!process.env.OPENAI_API_KEY;

  let creatorDNA: Record<string, unknown> = {};

  const client = createServerClient();
  if (client) {
    const { data: userRow } = await client
      .from("users")
      .select("id")
      .limit(1)
      .single();

    if (userRow) {
      const { data: dnaRow } = await client
        .from("creator_dna")
        .select("*")
        .eq("user_id", (userRow as { id: string }).id)
        .maybeSingle();
      if (dnaRow) creatorDNA = dnaRow as Record<string, unknown>;
    }
  }

  const result = await runTopicIntelligence({ creatorDNA });

  return NextResponse.json({
    ok: true,
    source: apiKeyPresent ? "openai" : "strategy_model_mock",
    market_source: result.market_source,
    writes: false,
    analysis_note: result.analysis_note,
    analysis: result.analysis,
    candidates: result.candidates,
    ...(auth.devBypass && { environment: "development" }),
  });
}
