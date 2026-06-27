import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const client = createServerClient();

  if (!client) {
    return NextResponse.json({
      ok: true,
      source: "mock_fallback",
      daily_decision: null,
      publish_job: null,
    });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: decision } = await client
      .from("daily_decisions")
      .select("id, selected_topic, status")
      .eq("decision_date", today)
      .single();

    const row = decision as { id: string; selected_topic: string; status: string } | null;

    let publishJob = null;
    if (row) {
      const { data: job } = await client
        .from("publish_jobs")
        .select("status, force_publish")
        .eq("daily_decision_id", row.id)
        .maybeSingle();
      if (job) {
        const j = job as { status: string; force_publish: boolean };
        publishJob = { status: j.status, force_publish: j.force_publish };
      }
    }

    return NextResponse.json({
      ok: true,
      source: "supabase",
      daily_decision: row
        ? { selected_topic: row.selected_topic, status: row.status }
        : null,
      publish_job: publishJob,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "mock_fallback",
      daily_decision: null,
      publish_job: null,
    });
  }
}
