import type { SupabaseClient } from "@supabase/supabase-js";
import { runDecisionEngine } from "@/lib/decision";
import { taipeiDate } from "./taipei-date";

export type DailyDecisionResult = {
  ok: boolean;
  source: string;
  message: string;
  skipped?: boolean;
  reason?: string;
  provider?: string;
  writes?: boolean;
  decision?: { selected_topic: string; status: string };
  carousel_slides?: number;
  publish_job?: { status: string; force_publish: boolean };
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function runDailyDecision(
  client: SupabaseClient
): Promise<DailyDecisionResult> {
  const today = taipeiDate();
  const now = new Date().toISOString();

  // 1. Load user
  const { data: userRow } = await client
    .from("users")
    .select("id, name")
    .limit(1)
    .single();
  if (!userRow) {
    return { ok: false, source: "supabase", message: "No user found." };
  }
  const user = userRow as { id: string; name?: string };

  // 2. Check if today's decision already exists
  const { data: existing } = await client
    .from("daily_decisions")
    .select("id, selected_topic, status")
    .eq("decision_date", today)
    .maybeSingle();

  if (existing) {
    const e = existing as { id: string; selected_topic: string; status: string };
    if (["scheduled", "approved", "published"].includes(e.status)) {
      return {
        ok: true,
        source: "supabase",
        message: "Today's decision is already scheduled or published.",
        skipped: true,
        reason: "today_already_scheduled",
        decision: { selected_topic: e.selected_topic, status: e.status },
      };
    }
    if (e.status === "draft") {
      return {
        ok: true,
        source: "supabase",
        message: "Today's draft decision already exists.",
        skipped: true,
        reason: "already_exists",
        decision: { selected_topic: e.selected_topic, status: e.status },
      };
    }
    if (e.status === "rejected") {
      return {
        ok: true,
        source: "supabase",
        message: "Today's decision was rejected. Skipping re-run.",
        skipped: true,
        reason: "rejected_today",
        decision: { selected_topic: e.selected_topic, status: e.status },
      };
    }
  }

  // 3. Load context for decision engine
  const [dnaResult, postsResult, recentDecisionsResult] = await Promise.all([
    client.from("creator_dna").select("*").eq("user_id", user.id).maybeSingle(),
    client
      .from("instagram_posts")
      .select("caption, post_type, metrics, posted_at")
      .order("posted_at", { ascending: false })
      .limit(5),
    client
      .from("daily_decisions")
      .select("selected_topic, status, decision_date, confidence_score")
      .order("decision_date", { ascending: false })
      .limit(7),
  ]);

  const provider = process.env.DECISION_ENGINE_PROVIDER ?? "mock";

  // 4. Run decision engine (mock or openai based on DECISION_ENGINE_PROVIDER)
  const output = await runDecisionEngine({
    user,
    creatorDNA: (dnaResult.data as Record<string, unknown>) ?? {},
    recentPosts: postsResult.data ?? [],
    todayDate: today,
    existingRecentDecisions: recentDecisionsResult.data ?? [],
  });

  // 5. Save daily_decision
  const { data: decisionRow, error: de } = await client
    .from("daily_decisions")
    .insert({
      user_id: user.id,
      decision_date: today,
      selected_topic: output.selectedTopic,
      confidence_score: output.confidenceScore,
      main_judgment: output.mainJudgment,
      decision_factors: output.decisionFactors,
      risk: output.risk,
      status: "draft",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (de || !decisionRow) {
    return {
      ok: false,
      source: "supabase",
      message: `daily_decisions insert failed: ${de?.message}`,
    };
  }
  const decisionId = (decisionRow as { id: string }).id;

  // 6. Save candidates
  await client.from("decision_candidates").insert(
    output.candidates.map((c) => ({
      daily_decision_id: decisionId,
      topic: c.topic,
      market_score: c.marketScore,
      brand_fit_score: c.brandFitScore,
      share_score: c.shareScore,
      risk_level: capitalize(c.riskLevel),
      rejected_reason: c.rejectedReason,
      selected: c.selected,
      created_at: now,
    }))
  );

  // 7. Save carousel_draft
  const { data: draftRow, error: draftE } = await client
    .from("carousel_drafts")
    .insert({
      daily_decision_id: decisionId,
      title: output.carouselDraft.title,
      caption: output.carouselDraft.caption,
      hashtags: output.carouselDraft.hashtags,
      export_status: "ready",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (draftE || !draftRow) {
    return {
      ok: false,
      source: "supabase",
      message: `carousel_drafts insert failed: ${draftE?.message}`,
    };
  }
  const draftId = (draftRow as { id: string }).id;

  // 8. Save slides
  await client.from("carousel_slides").insert(
    output.carouselSlides.map((s) => ({
      carousel_draft_id: draftId,
      slide_number: s.slideNumber,
      headline: s.headline,
      body: s.body,
      design_notes: s.designNotes,
      created_at: now,
      updated_at: now,
    }))
  );

  // 9. Save publish_job (pending — no scheduled_at until user approves)
  await client.from("publish_jobs").insert({
    daily_decision_id: decisionId,
    carousel_draft_id: draftId,
    user_id: user.id,
    status: "pending",
    scheduled_at: null,
    published_at: null,
    force_publish: false,
    created_at: now,
    updated_at: now,
  });

  // 10. Save learning_log
  await client.from("learning_logs").insert({
    user_id: user.id,
    daily_decision_id: decisionId,
    learning_type: "decision_rule",
    summary: output.learningLog,
    signal_data: {},
    created_at: now,
  });

  return {
    ok: true,
    source: "supabase",
    message: "Daily decision created as draft.",
    provider,
    writes: true,
    decision: { selected_topic: output.selectedTopic, status: "draft" },
    carousel_slides: output.carouselSlides.length,
    publish_job: { status: "pending", force_publish: false },
  };
}
