import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { runOpenAIDecisionEngine } from "@/lib/decision/openai-engine";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-openai-dry-run-secret");
  const expected = process.env.OPENAI_DRY_RUN_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

  // Load context from Supabase if available, otherwise use safe mock input
  const client = createServerClient();

  let user: { id: string; name?: string } = { id: "mock", name: "小佑" };
  let creatorDNA: Record<string, unknown> = {};
  let recentPosts: unknown[] = [];
  let existingRecentDecisions: unknown[] = [];

  if (client) {
    const { data: userRow } = await client
      .from("users")
      .select("id, name")
      .limit(1)
      .single();
    if (userRow) user = userRow as { id: string; name?: string };

    const { data: dnaRow } = await client
      .from("creator_dna")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (dnaRow) creatorDNA = dnaRow as Record<string, unknown>;

    const { data: posts } = await client
      .from("instagram_posts")
      .select("caption, post_type, metrics, posted_at")
      .order("posted_at", { ascending: false })
      .limit(5);
    if (posts) recentPosts = posts;

    const { data: decisions } = await client
      .from("daily_decisions")
      .select("selected_topic, status, decision_date, confidence_score")
      .order("decision_date", { ascending: false })
      .limit(7);
    if (decisions) existingRecentDecisions = decisions;
  }

  const input = { user, creatorDNA, recentPosts, todayDate: today, existingRecentDecisions };

  const apiKeyPresent = !!process.env.OPENAI_API_KEY;
  const result = await runOpenAIDecisionEngine(input);

  const safeDecision = {
    selectedTopic: result.selectedTopic,
    confidenceScore: result.confidenceScore,
    mainJudgment: result.mainJudgment,
    risk: result.risk,
    decisionFactors: result.decisionFactors,
    candidatesCount: result.candidates.length,
    carouselSlidesCount: result.carouselSlides.length,
    captionPreview: result.carouselDraft.caption.slice(0, 100),
  };

  if (!apiKeyPresent) {
    return NextResponse.json({
      ok: true,
      source: "mock_fallback",
      mode: "dry_run",
      writes: false,
      message: "OpenAI key missing. Returned mock decision instead.",
      decision: safeDecision,
      candidates: result.candidates,
      carouselSlides: result.carouselSlides,
      caption: result.carouselDraft.caption,
      hashtags: result.carouselDraft.hashtags,
      learningLog: result.learningLog,
    });
  }

  return NextResponse.json({
    ok: true,
    source: "openai",
    mode: "dry_run",
    writes: false,
    decision: safeDecision,
    candidates: result.candidates,
    carouselSlides: result.carouselSlides,
    caption: result.carouselDraft.caption,
    hashtags: result.carouselDraft.hashtags,
    learningLog: result.learningLog,
  });
}
