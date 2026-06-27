import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyDecisionResult = {
  ok: boolean;
  source: string;
  message: string;
  decision?: { selected_topic: string; status: string };
  carousel_slides?: number;
  publish_job?: { status: string };
};

export async function runDailyDecision(
  client: SupabaseClient
): Promise<DailyDecisionResult> {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  // Get first user
  const { data: userRow } = await client
    .from("users")
    .select("id")
    .limit(1)
    .single();
  if (!userRow) {
    return { ok: false, source: "supabase", message: "No user found." };
  }
  const userId = (userRow as { id: string }).id;

  // Check if today's decision already exists
  const { data: existing } = await client
    .from("daily_decisions")
    .select("id, selected_topic, status")
    .eq("decision_date", today)
    .maybeSingle();

  if (existing) {
    const e = existing as { id: string; selected_topic: string; status: string };
    return {
      ok: true,
      source: "supabase",
      message: "Daily decision already exists.",
      decision: { selected_topic: e.selected_topic, status: e.status },
    };
  }

  // Create daily_decision
  const { data: decisionRow, error: de } = await client
    .from("daily_decisions")
    .insert({
      user_id: userId,
      decision_date: today,
      selected_topic: "退休不是 65 歲開始",
      confidence_score: 92,
      main_judgment:
        "Phoenix 已於 03:00 完成今日決策，並選擇最適合小佑品牌長期累積的題目。",
      decision_factors: [
        { label: "Market Signal",    score: 84, text: "退休話題本週搜尋量上升，市場空間未被佔據。" },
        { label: "Creator DNA Fit",  score: 96, text: "主題完全符合品牌核心，避開心靈雞湯陷阱。" },
        { label: "Brand Memory",     score: 91, text: "退休系列連續穩定輸出，今天發出可鞏固系列節奏。" },
        { label: "Share Worthiness", score: 89, text: "反直覺標題具備高分享動機，類似框架歷史收藏率是一般貼文 2.4 倍。" },
      ],
      risk: "如果今天不發，退休系列的品牌記憶會中斷。",
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

  // Create 4 candidates
  await client.from("decision_candidates").insert([
    { daily_decision_id: decisionId, topic: "退休不是 65 歲開始",      market_score: 84, brand_fit_score: 96, share_score: 89, risk_level: "Low",    rejected_reason: null,                          selected: true,  created_at: now },
    { daily_decision_id: decisionId, topic: "AI 會淘汰保險業務嗎？",   market_score: 93, brand_fit_score: 64, share_score: 76, risk_level: "High",   rejected_reason: "流量可能高，但今天容易變成跟風。", selected: false, created_at: now },
    { daily_decision_id: decisionId, topic: "努力沒有結果怎麼辦？",    market_score: 68, brand_fit_score: 58, share_score: 61, risk_level: "Medium", rejected_reason: "情緒共鳴夠，但容易落入雞湯。",   selected: false, created_at: now },
    { daily_decision_id: decisionId, topic: "快速成交的三個技巧",      market_score: 59, brand_fit_score: 42, share_score: 49, risk_level: "High",   rejected_reason: "短期有用，但會削弱長期品牌深度。", selected: false, created_at: now },
  ]);

  // Create carousel_draft
  const { data: draftRow, error: draftE } = await client
    .from("carousel_drafts")
    .insert({
      daily_decision_id: decisionId,
      title: "退休不是 65 歲開始",
      caption:
        "同一個觀念，越早想清楚，越不容易被生活推著走。\n\n很多人都以為退休是 65 歲以後才要想的事。\n但其實，你現在做的每一個選擇，都在決定未來的自由。\n\n如果你覺得退休還很遠，這篇貼文就是為你寫的。",
      hashtags: ["退休規劃", "人生選擇", "保險觀念", "財務自由", "小佑"],
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

  // Create 8 slides
  await client.from("carousel_slides").insert([
    { carousel_draft_id: draftId, slide_number: 1, headline: "退休不是 / 65 歲開始",         body: "",                                 design_notes: { variant: "cover" },        created_at: now, updated_at: now },
    { carousel_draft_id: draftId, slide_number: 2, headline: "很多人以為退休是年紀問題。",   body: "其實退休是選擇問題。",               design_notes: { variant: "two-thought" }, created_at: now, updated_at: now },
    { carousel_draft_id: draftId, slide_number: 3, headline: "你今天怎麼花錢，",             body: "其實已經在決定 20 年後的自由。",     design_notes: { variant: "statement" },   created_at: now, updated_at: now },
    { carousel_draft_id: draftId, slide_number: 4, headline: "真正可怕的不是沒退休金。",     body: "是你一直以為還很早。",               design_notes: { variant: "dramatic" },    created_at: now, updated_at: now },
    { carousel_draft_id: draftId, slide_number: 5, headline: "保險不是答案。",               body: "規劃才是。",                         design_notes: { variant: "minimal" },     created_at: now, updated_at: now },
    { carousel_draft_id: draftId, slide_number: 6, headline: "如果你不知道自己想過什麼生活，", body: "再多工具都只是工具。",               design_notes: { variant: "statement" },   created_at: now, updated_at: now },
    { carousel_draft_id: draftId, slide_number: 7, headline: "退休不是離開工作。",           body: "是擁有選擇。",                       design_notes: { variant: "quote" },       created_at: now, updated_at: now },
    { carousel_draft_id: draftId, slide_number: 8, headline: "你不是在準備退休。",           body: "你是在準備未來的自由。",             design_notes: { variant: "closing" },     created_at: now, updated_at: now },
  ]);

  // Create publish_job (status = pending, no scheduled_at yet)
  await client.from("publish_jobs").insert({
    daily_decision_id: decisionId,
    carousel_draft_id: draftId,
    user_id: userId,
    status: "pending",
    scheduled_at: null,
    published_at: null,
    force_publish: false,
    created_at: now,
    updated_at: now,
  });

  // Create 1 learning_log
  await client.from("learning_logs").insert({
    user_id: userId,
    daily_decision_id: decisionId,
    learning_type: "decision_rule",
    summary:
      "Phoenix 於 03:00 完成今日決策，選擇最適合長期品牌累積的題目。",
    signal_data: {},
    created_at: now,
  });

  return {
    ok: true,
    source: "supabase",
    message: "Daily decision created.",
    decision: { selected_topic: "退休不是 65 歲開始", status: "draft" },
    carousel_slides: 8,
    publish_job: { status: "pending" },
  };
}
