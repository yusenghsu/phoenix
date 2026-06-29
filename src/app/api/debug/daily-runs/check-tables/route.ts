// Dev-only — checks which phoenix_* tables exist in the Supabase schema.
// Returns 403 in production.
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const REQUIRED_TABLES = [
  "phoenix_brand_profiles",
  "phoenix_daily_runs",
  "phoenix_topic_candidates",
  "phoenix_topic_selections",
  "phoenix_carousel_slides",
  "phoenix_generated_assets",
  "phoenix_publish_jobs",
  "phoenix_line_bindings",
  "phoenix_job_events",
];

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 403 });
  }

  const db = createServerClient();
  if (!db) {
    return NextResponse.json({ status: "error", error: "Supabase client unavailable — check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local." });
  }

  const results: Record<string, boolean> = {};
  await Promise.all(
    REQUIRED_TABLES.map(async (table) => {
      const { error } = await db.from(table).select("id").limit(1);
      results[table] = !error;
    })
  );

  const missing = REQUIRED_TABLES.filter((t) => !results[t]);
  const allReady = missing.length === 0;

  return NextResponse.json({ status: "ok", allReady, results, missing });
}
