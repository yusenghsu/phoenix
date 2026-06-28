import { createClient } from "@supabase/supabase-js";

// Local-only read-only script — simulates what happens when tomorrow's cron fires.
// No writes. Safe to run anytime.
//
// Usage: npm run simulate:next-day

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.");
  process.exit(1);
}

const client = createClient(url, key);

function taipeiDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(date);
}

(async () => {
  const now = new Date();
  const todayTaipei = taipeiDate(now);

  // "Tomorrow" from cron's perspective: the next 19:00 UTC firing = next 03:00 Taiwan
  const tomorrowUTC = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowTaipei = taipeiDate(new Date(tomorrowUTC.getFullYear(), tomorrowUTC.getMonth(), tomorrowUTC.getDate(), 19, 0, 0));
  // Simpler: just add 1 day to Taiwan date
  const [y, m, d] = todayTaipei.split("-").map(Number);
  const nextDay = new Date(y, m - 1, d + 1);
  const tomorrowDate = taipeiDate(nextDay);

  console.log("─── Day-2 Cron Simulation (read-only) ───────────────────────────");
  console.log(`Current Taiwan date   : ${todayTaipei}`);
  console.log(`Tomorrow Taiwan date  : ${tomorrowDate}`);
  console.log(`Next cron fires at    : UTC 19:00 today = Taiwan 03:00 tomorrow`);
  console.log("");

  // 1. Check today's decision
  const { data: todayRow } = await client
    .from("daily_decisions")
    .select("id, selected_topic, status, decision_date")
    .eq("decision_date", todayTaipei)
    .maybeSingle();

  if (todayRow) {
    const r = todayRow as { id: string; selected_topic: string; status: string; decision_date: string };
    console.log(`Today's decision (${r.decision_date}):`);
    console.log(`  topic  : ${r.selected_topic}`);
    console.log(`  status : ${r.status}`);
  } else {
    console.log(`Today's decision      : NONE (${todayTaipei})`);
  }

  console.log("");

  // 2. Check tomorrow's decision (would cron be blocked?)
  const { data: tomorrowRow } = await client
    .from("daily_decisions")
    .select("id, selected_topic, status, decision_date")
    .eq("decision_date", tomorrowDate)
    .maybeSingle();

  if (tomorrowRow) {
    const r = tomorrowRow as { id: string; selected_topic: string; status: string; decision_date: string };
    console.log(`Tomorrow's decision (${r.decision_date}) — ALREADY EXISTS:`);
    console.log(`  topic  : ${r.selected_topic}`);
    console.log(`  status : ${r.status}`);
    if (["scheduled", "approved", "published"].includes(r.status)) {
      console.log(`  CRON   : ⚠️  would SKIP — reason: today_already_scheduled`);
    } else if (r.status === "draft") {
      console.log(`  CRON   : ⚠️  would SKIP — reason: already_exists`);
    } else if (r.status === "rejected") {
      console.log(`  CRON   : ⚠️  would SKIP — reason: rejected_today`);
    }
  } else {
    console.log(`Tomorrow's decision (${tomorrowDate}) : NOT FOUND`);
    console.log(`  CRON   : ✅ would CREATE new draft`);
  }

  console.log("");
  console.log("─── Idempotency summary ─────────────────────────────────────────");
  if (todayRow) {
    const r = todayRow as { status: string; decision_date: string };
    console.log(`Today ${r.decision_date} has status="${r.status}" — cron looks for ${tomorrowDate}, not ${r.decision_date}`);
    console.log("Today's scheduled status does NOT block tomorrow's cron. ✅");
  }
  console.log("─────────────────────────────────────────────────────────────────");
})().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
