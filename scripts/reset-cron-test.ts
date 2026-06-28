import { createClient } from "@supabase/supabase-js";

// Local-only script — clears today's decision data so cron can be tested from scratch.
// Does NOT touch users, creator_dna, or instagram_posts.

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.");
  process.exit(1);
}

const client = createClient(url, key);
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

(async () => {
  console.log(`reset:cron-test — clearing today's decision data (${today})...`);

  // Load current user
  const { data: userRow } = await client
    .from("users")
    .select("id")
    .limit(1)
    .single();

  if (!userRow) {
    console.error("No user found in DB.");
    process.exit(1);
  }
  const userId = (userRow as { id: string }).id;

  // Get today's decisions for this user
  const { data: decisions } = await client
    .from("daily_decisions")
    .select("id")
    .eq("user_id", userId)
    .eq("decision_date", today);

  const decisionIds = (decisions ?? []).map((d: { id: string }) => d.id);

  if (decisionIds.length === 0) {
    console.log("No decision records found for today — nothing to delete.");
    return;
  }

  // Get carousel_draft IDs to cascade into slides
  const { data: drafts } = await client
    .from("carousel_drafts")
    .select("id")
    .in("daily_decision_id", decisionIds);

  const draftIds = (drafts ?? []).map((d: { id: string }) => d.id);

  // Delete in reverse FK order
  await client.from("learning_logs").delete().in("daily_decision_id", decisionIds);
  await client.from("publish_jobs").delete().in("daily_decision_id", decisionIds);

  if (draftIds.length > 0) {
    await client.from("carousel_slides").delete().in("carousel_draft_id", draftIds);
  }
  await client.from("carousel_drafts").delete().in("daily_decision_id", decisionIds);
  await client.from("decision_candidates").delete().in("daily_decision_id", decisionIds);
  await client.from("daily_decisions").delete().in("id", decisionIds);

  console.log(`Deleted ${decisionIds.length} decision(s) and all child records.`);
  console.log("Ready — run: npm run cron:daily");
})();
