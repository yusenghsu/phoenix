import { createClient } from "@supabase/supabase-js";
import { resetDemoData } from "../src/lib/data/reset-demo";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.");
  process.exit(1);
}

const client = createClient(url, key);

(async () => {
  console.log("Resetting Phoenix demo data...");

  const result = await resetDemoData(client);

  if (!result.ok) {
    console.error("Reset failed:", result.message);
    process.exit(1);
  }

  console.log("Done.", result.message);
  console.log("State:", JSON.stringify(result.state, null, 2));
})();
