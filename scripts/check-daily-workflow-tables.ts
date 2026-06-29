// Checks which phoenix_* daily-workflow tables exist in Supabase.
// Usage: node --env-file=.env.local node_modules/.bin/tsx scripts/check-daily-workflow-tables.ts
//
// If tables are missing, the script prints the migration SQL file path
// and instructions for applying it via the Supabase SQL Editor.

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.");
  process.exit(1);
}

const db = createClient(url, key);

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

async function tableExists(table: string): Promise<boolean> {
  const { error } = await db.from(table).select("id").limit(1);
  return !error;
}

(async () => {
  console.log("\nPhoenix — Daily Workflow Table Check");
  console.log("─────────────────────────────────────");

  const results: { table: string; exists: boolean }[] = [];

  for (const table of REQUIRED_TABLES) {
    const exists = await tableExists(table);
    results.push({ table, exists });
    console.log(`  ${exists ? "✓" : "✗"} ${table}`);
  }

  const missing = results.filter((r) => !r.exists).map((r) => r.table);

  if (missing.length === 0) {
    console.log("\n✓ All phoenix_* tables exist. Daily workflow is ready.\n");
    process.exit(0);
  }

  console.log(`\n⚠️  ${missing.length} table(s) missing: ${missing.join(", ")}`);
  console.log("\nTo fix this, apply the migration SQL in the Supabase SQL Editor:");
  console.log("");
  console.log("  1. Open your Supabase project dashboard");
  console.log(`  2. Go to: https://supabase.com/dashboard/project/${url.replace("https://", "").replace(".supabase.co", "")}/sql/new`);
  console.log("  3. Paste the contents of:");

  const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260629_daily_auto_publish.sql");
  console.log(`       ${migrationPath}`);
  console.log("  4. Click Run");
  console.log("  5. Re-run this script to verify\n");

  if (fs.existsSync(migrationPath)) {
    console.log("─────────────────────────────────────");
    console.log("Migration SQL preview (first 30 lines):");
    console.log("─────────────────────────────────────");
    const sql = fs.readFileSync(migrationPath, "utf-8").split("\n").slice(0, 30).join("\n");
    console.log(sql);
    console.log("... (see full file at path above)\n");
  }

  process.exit(1);
})();
