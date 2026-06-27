import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase environment variables.");
  console.error("Create .env.local and set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const client = createClient(url, key);

async function countTable(table: string): Promise<number> {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error(`  ${table}: error — ${error.message}`);
    return -1;
  }
  return count ?? 0;
}

async function run() {
  console.log("\nPhoenix — Supabase Read Check");
  console.log("─────────────────────────────");

  const tables = [
    "users",
    "creator_dna",
    "daily_decisions",
    "carousel_slides",
    "learning_logs",
  ];

  for (const table of tables) {
    const n = await countTable(table);
    if (n >= 0) console.log(`  ${table}: ${n} row${n === 1 ? "" : "s"}`);
  }

  console.log("\nToday's decision:");
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await client
    .from("daily_decisions")
    .select("selected_topic, confidence_score, status")
    .eq("decision_date", today)
    .single();

  if (error || !data) {
    console.log(`  No decision found for ${today}`);
  } else {
    console.log(`  topic:      ${data.selected_topic}`);
    console.log(`  confidence: ${data.confidence_score}`);
    console.log(`  status:     ${data.status}`);
  }

  console.log("\n✓ Supabase read check complete.\n");
}

run().catch((err) => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
