import { createClient } from "@supabase/supabase-js";
import { runDailyDecision } from "../src/lib/data/daily-decision";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.");
  process.exit(1);
}

const client = createClient(url, key);

(async () => {
  console.log("Phoenix daily decision run starting...");

  const result = await runDailyDecision(client);

  if (!result.ok) {
    console.error("Daily decision failed:", result.message);
    process.exit(1);
  }

  console.log("Phoenix daily decision run completed.");
  console.log("source:", result.source);
  console.log("provider:", result.provider ?? "mock");
  console.log("writes:", result.writes ?? false);
  if (result.skipped) {
    console.log("skipped:", true);
    console.log("reason:", result.reason);
  }
  console.log("selected_topic:", result.decision?.selected_topic);
  console.log("decision_status:", result.decision?.status);
  if (result.carousel_slides !== undefined) {
    console.log("carousel_slides:", result.carousel_slides);
  }
  if (result.publish_job) {
    console.log("publish_job_status:", result.publish_job.status);
    console.log("force_publish:", result.publish_job.force_publish);
  }
  console.log("message:", result.message);
})();
