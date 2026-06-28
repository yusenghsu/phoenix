import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { runOpenAIDecisionEngine } from "@/lib/decision/openai-engine";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-openai-save-secret");
  const expected = process.env.OPENAI_SAVE_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const client = createServerClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, message: "Supabase not configured. Save requires live database." },
      { status: 503 }
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  // Check if today already has a decision
  const { data: existing } = await client
    .from("daily_decisions")
    .select("id, status")
    .eq("decision_date", today)
    .maybeSingle();

  if (existing) {
    const e = existing as { id: string; status: string };

    if (["approved", "scheduled", "published"].includes(e.status)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Today already has an approved or scheduled decision. Reset demo or reject first before saving a new OpenAI draft.",
        },
        { status: 409 }
      );
    }

    // draft or rejected: clear child records, then update in place (avoids duplicate key)
    await client.from("learning_logs").delete().eq("daily_decision_id", e.id);
    await client.from("publish_jobs").delete().eq("daily_decision_id", e.id);

    const { data: draftRows } = await client
      .from("carousel_drafts")
      .select("id")
      .eq("daily_decision_id", e.id);
    if (draftRows) {
      for (const d of draftRows as { id: string }[]) {
        await client.from("carousel_slides").delete().eq("carousel_draft_id", d.id);
      }
    }

    await client.from("carousel_drafts").delete().eq("daily_decision_id", e.id);
    await client.from("decision_candidates").delete().eq("daily_decision_id", e.id);
  }

  // Load user + context
  const { data: userRow } = await client
    .from("users")
    .select("id, name")
    .limit(1)
    .single();
  if (!userRow) {
    return NextResponse.json({ ok: false, message: "No user found." }, { status: 500 });
  }
  const user = userRow as { id: string; name?: string };

  const { data: dnaRow } = await client
    .from("creator_dna")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: posts } = await client
    .from("instagram_posts")
    .select("caption, post_type, metrics, posted_at")
    .order("posted_at", { ascending: false })
    .limit(5);

  const { data: recentDecisions } = await client
    .from("daily_decisions")
    .select("selected_topic, status, decision_date, confidence_score")
    .order("decision_date", { ascending: false })
    .limit(7);

  // Run OpenAI engine
  const output = await runOpenAIDecisionEngine({
    user,
    creatorDNA: (dnaRow as Record<string, unknown>) ?? {},
    recentPosts: posts ?? [],
    todayDate: today,
    existingRecentDecisions: recentDecisions ?? [],
  });

  // Upsert daily_decision: UPDATE if exists, INSERT if not
  let decisionId: string;

  if (existing) {
    const existingRow = existing as { id: string; status: string };
    const { error: ue } = await client
      .from("daily_decisions")
      .update({
        selected_topic: output.selectedTopic,
        confidence_score: output.confidenceScore,
        main_judgment: output.mainJudgment,
        decision_factors: output.decisionFactors,
        risk: output.risk,
        status: "draft",
        updated_at: now,
      })
      .eq("id", existingRow.id);

    if (ue) {
      return NextResponse.json(
        { ok: false, message: `daily_decisions update failed: ${ue.message}` },
        { status: 500 }
      );
    }
    decisionId = existingRow.id;
  } else {
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
      return NextResponse.json(
        { ok: false, message: `daily_decisions insert failed: ${de?.message}` },
        { status: 500 }
      );
    }
    decisionId = (decisionRow as { id: string }).id;
  }

  // Save candidates
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

  // Save carousel_draft
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
    return NextResponse.json(
      { ok: false, message: `carousel_drafts insert failed: ${draftE?.message}` },
      { status: 500 }
    );
  }
  const draftId = (draftRow as { id: string }).id;

  // Save slides
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

  // Save publish_job (pending, no scheduled_at until approved)
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

  // Save learning_log
  await client.from("learning_logs").insert({
    user_id: user.id,
    daily_decision_id: decisionId,
    learning_type: "decision_rule",
    summary: output.learningLog,
    signal_data: {},
    created_at: now,
  });

  return NextResponse.json({
    ok: true,
    source: "openai",
    writes: true,
    message: "OpenAI decision saved as draft.",
    decision: {
      selectedTopic: output.selectedTopic,
      status: "draft",
    },
    carouselSlides: output.carouselSlides.length,
    publishJob: {
      status: "pending",
      forcePublish: false,
    },
  });
}
