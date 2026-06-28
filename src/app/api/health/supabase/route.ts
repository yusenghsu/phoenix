import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const FAIL = {
  ok: false,
  source: "mock_or_missing_env",
  message: "Supabase environment variables are missing or read failed.",
};

async function countTable(
  client: ReturnType<typeof createServerClient>,
  table: string
): Promise<number> {
  if (!client) return -1;
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) return -1;
  return count ?? 0;
}

export async function GET() {
  const client = createServerClient();

  if (!client) {
    return NextResponse.json(FAIL, { status: 200 });
  }

  try {
    const [users, creator_dna, daily_decisions, carousel_slides, learning_logs] =
      await Promise.all([
        countTable(client, "users"),
        countTable(client, "creator_dna"),
        countTable(client, "daily_decisions"),
        countTable(client, "carousel_slides"),
        countTable(client, "learning_logs"),
      ]);

    if ([users, creator_dna, daily_decisions, carousel_slides, learning_logs].some((n) => n < 0)) {
      return NextResponse.json(FAIL, { status: 200 });
    }

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
    const { data, error } = await client
      .from("daily_decisions")
      .select("selected_topic")
      .eq("decision_date", today)
      .single();

    const selectedTopic = error || !data ? null : (data as { selected_topic: string }).selected_topic;

    return NextResponse.json({
      ok: true,
      source: "supabase",
      counts: {
        users,
        creator_dna,
        daily_decisions,
        carousel_slides,
        learning_logs,
      },
      today: {
        selected_topic: selectedTopic,
      },
    });
  } catch {
    return NextResponse.json(FAIL, { status: 200 });
  }
}
