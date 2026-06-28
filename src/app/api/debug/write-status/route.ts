import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { checkInternalDebugAuth } from "@/lib/auth/internal-debug";

export async function GET(req: NextRequest) {
  const auth = checkInternalDebugAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const client = createServerClient();

  if (!client) {
    return NextResponse.json({
      ok: true,
      source: "mock_fallback",
      ...(auth.devBypass && { environment: "development" }),
      daily_decision: null,
      publish_job: null,
    });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: decision } = await client
      .from("daily_decisions")
      .select("id, selected_topic, status, main_judgment, risk")
      .eq("decision_date", today)
      .single();

    const row = decision as { id: string; selected_topic: string; status: string; main_judgment?: string; risk?: string } | null;

    let publishJob = null;
    let carouselSlidesCount: number | null = null;

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

      const { data: draft } = await client
        .from("carousel_drafts")
        .select("id")
        .eq("daily_decision_id", row.id)
        .maybeSingle();
      if (draft) {
        const { count } = await client
          .from("carousel_slides")
          .select("id", { count: "exact", head: true })
          .eq("carousel_draft_id", (draft as { id: string }).id);
        carouselSlidesCount = count ?? 0;
      }
    }

    return NextResponse.json({
      ok: true,
      source: "supabase",
      ...(auth.devBypass && { environment: "development" }),
      daily_decision: row
        ? {
            selected_topic: row.selected_topic,
            status: row.status,
            main_judgment_preview: row.main_judgment
              ? row.main_judgment.slice(0, 80)
              : null,
            risk: row.risk ?? null,
          }
        : null,
      publish_job: publishJob,
      carousel_slides_count: carouselSlidesCount,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "mock_fallback",
      ...(auth.devBypass && { environment: "development" }),
      daily_decision: null,
      publish_job: null,
    });
  }
}
