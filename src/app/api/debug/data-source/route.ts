import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

async function tryRead(
  client: ReturnType<typeof createServerClient>,
  table: string
): Promise<boolean> {
  if (!client) return false;
  try {
    const { error } = await client
      .from(table)
      .select("*", { count: "exact", head: true });
    return !error;
  } catch {
    return false;
  }
}

export async function GET() {
  const client = createServerClient();
  const configured = !!(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!client || !configured) {
    return NextResponse.json({
      ok: true,
      environment: "server",
      supabase: { configured: false, readable: false },
      source: "mock_fallback",
      checks: {
        today_decision: true,
        creator_dna: true,
        carousel_slides: true,
        learning_logs: true,
      },
    });
  }

  const [todayOk, dnaOk, slidesOk, logsOk] = await Promise.all([
    tryRead(client, "daily_decisions"),
    tryRead(client, "creator_dna"),
    tryRead(client, "carousel_slides"),
    tryRead(client, "learning_logs"),
  ]);

  const readable = todayOk && dnaOk && slidesOk && logsOk;

  return NextResponse.json({
    ok: true,
    environment: "server",
    supabase: { configured: true, readable },
    source: readable ? "supabase" : "mock_fallback",
    checks: {
      today_decision: todayOk,
      creator_dna: dnaOk,
      carousel_slides: slidesOk,
      learning_logs: logsOk,
    },
  });
}
