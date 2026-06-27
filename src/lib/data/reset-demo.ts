import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Fixed seed UUIDs ─────────────────────────────────────────────────────────

const U = {
  user:         "a0000000-0000-0000-0000-000000000001",
  dna:          "a0000000-0000-0000-0000-000000000002",
  igAccount:    "a0000000-0000-0000-0000-000000000003",
  igPost1:      "a0000000-0000-0000-0000-000000000011",
  igPost2:      "a0000000-0000-0000-0000-000000000012",
  igPost3:      "a0000000-0000-0000-0000-000000000013",
  igPost4:      "a0000000-0000-0000-0000-000000000014",
  igPost5:      "a0000000-0000-0000-0000-000000000015",
  decision:     "a0000000-0000-0000-0000-000000000020",
  cand1:        "a0000000-0000-0000-0000-000000000031",
  cand2:        "a0000000-0000-0000-0000-000000000032",
  cand3:        "a0000000-0000-0000-0000-000000000033",
  cand4:        "a0000000-0000-0000-0000-000000000034",
  draft:        "a0000000-0000-0000-0000-000000000040",
  slide1:       "a0000000-0000-0000-0000-000000000051",
  slide2:       "a0000000-0000-0000-0000-000000000052",
  slide3:       "a0000000-0000-0000-0000-000000000053",
  slide4:       "a0000000-0000-0000-0000-000000000054",
  slide5:       "a0000000-0000-0000-0000-000000000055",
  slide6:       "a0000000-0000-0000-0000-000000000056",
  slide7:       "a0000000-0000-0000-0000-000000000057",
  slide8:       "a0000000-0000-0000-0000-000000000058",
  publishJob:   "a0000000-0000-0000-0000-000000000060",
  log1:         "a0000000-0000-0000-0000-000000000071",
  log2:         "a0000000-0000-0000-0000-000000000072",
  log3:         "a0000000-0000-0000-0000-000000000073",
  log4:         "a0000000-0000-0000-0000-000000000074",
  log5:         "a0000000-0000-0000-0000-000000000075",
};

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function todayAt20(): string {
  const d = new Date();
  d.setHours(20, 0, 0, 0);
  return d.toISOString();
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Main reset function ───────────────────────────────────────────────────────

export async function resetDemoData(client: SupabaseClient): Promise<{
  ok: boolean;
  message: string;
  state?: {
    daily_decision_status: string;
    publish_job_status: string;
    force_publish: boolean;
    carousel_slides: number;
    learning_logs: number;
  };
}> {
  const now = new Date().toISOString();

  // ── 1. Delete in reverse FK order (seed records only) ──────────────────────

  await client.from("learning_logs").delete().in("id", [U.log1, U.log2, U.log3, U.log4, U.log5]);
  await client.from("publish_jobs").delete().eq("id", U.publishJob);
  await client.from("carousel_slides").delete().eq("carousel_draft_id", U.draft);
  await client.from("carousel_drafts").delete().eq("id", U.draft);
  await client.from("decision_candidates").delete().eq("daily_decision_id", U.decision);
  await client.from("daily_decisions").delete().eq("id", U.decision);
  await client.from("instagram_posts").delete().eq("instagram_account_id", U.igAccount);
  await client.from("instagram_accounts").delete().eq("id", U.igAccount);
  await client.from("creator_dna").delete().eq("id", U.dna);
  await client.from("users").delete().eq("id", U.user);

  // ── 2. Insert in FK order ──────────────────────────────────────────────────

  const { error: e1 } = await client.from("users").insert({
    id: U.user, email: "yuseng@example.local", name: "小佑",
    created_at: now, updated_at: now,
  });
  if (e1) return { ok: false, message: `users insert failed: ${e1.message}` };

  const { error: e2 } = await client.from("creator_dna").insert({
    id: U.dna, user_id: U.user,
    brand_voice: "一針見血，直接解開疑問。",
    content_goal: "讓人想收藏，也想分享給某個人。",
    content_formula: "痛點 → 破解迷思 → 觀點 → 解法 → 值得分享",
    content_ratio: { viewpoint: 50, hook: 30, story: 20 },
    avoid_list: ["心靈雞湯", "無聊內容", "標題黨", "農場文", "低品質流量", "沒有觀點", "為了流量而流量"],
    design_dna: "TED × Apple × Louis Vuitton",
    decision_rules: [
      "如果題目有流量，但不符合品牌，Phoenix 可以否決。",
      "如果題目短期有效，但長期削弱品牌，Phoenix 不推薦。",
      "如果內容沒有觀點，即使好寫也不做。",
      "每天只推薦一個最佳主題。",
      "發布前一定需要小佑確認。",
    ],
    topic_preferences: ["退休", "AI", "品牌", "心理學", "保險觀念", "內容經營"],
    created_at: now, updated_at: now,
  });
  if (e2) return { ok: false, message: `creator_dna insert failed: ${e2.message}` };

  const { error: e3 } = await client.from("instagram_accounts").insert({
    id: U.igAccount, user_id: U.user,
    instagram_user_id: "mock_ig_user_001",
    username: "xiaoyou.teacher",
    account_type: "mock_professional",
    access_token_encrypted: "mock_not_connected",
    connected_at: null, revoked_at: null,
    created_at: now, updated_at: now,
  });
  if (e3) return { ok: false, message: `instagram_accounts insert failed: ${e3.message}` };

  const { error: e4 } = await client.from("instagram_posts").insert([
    {
      id: U.igPost1, user_id: U.user, instagram_account_id: U.igAccount,
      instagram_post_id: "mock_post_001", post_type: "carousel",
      caption: "做保險會沒朋友嗎？",
      permalink: "https://www.instagram.com/p/mock_post_001/",
      posted_at: daysAgo(30),
      metrics: { views: 37000, shares: 421, saves: 220, engagement_rate: 0.018 },
      created_at: now, updated_at: now,
    },
    {
      id: U.igPost2, user_id: U.user, instagram_account_id: U.igAccount,
      instagram_post_id: "mock_post_002", post_type: "carousel",
      caption: "新人賺不到錢怎麼辦？",
      permalink: "https://www.instagram.com/p/mock_post_002/",
      posted_at: daysAgo(23),
      metrics: { views: 18000, shares: 160, saves: 130, engagement_rate: 0.016 },
      created_at: now, updated_at: now,
    },
    {
      id: U.igPost3, user_id: U.user, instagram_account_id: U.igAccount,
      instagram_post_id: "mock_post_003", post_type: "carousel",
      caption: "選主管的三個指標",
      permalink: "https://www.instagram.com/p/mock_post_003/",
      posted_at: daysAgo(16),
      metrics: { views: 12000, shares: 98, saves: 110, engagement_rate: 0.017 },
      created_at: now, updated_at: now,
    },
    {
      id: U.igPost4, user_id: U.user, instagram_account_id: U.igAccount,
      instagram_post_id: "mock_post_004", post_type: "carousel",
      caption: "新人做保險最怕什麼？",
      permalink: "https://www.instagram.com/p/mock_post_004/",
      posted_at: daysAgo(9),
      metrics: { views: 15000, shares: 188, saves: 142, engagement_rate: 0.022 },
      created_at: now, updated_at: now,
    },
    {
      id: U.igPost5, user_id: U.user, instagram_account_id: U.igAccount,
      instagram_post_id: "mock_post_005", post_type: "carousel",
      caption: "保險不是答案，規劃才是",
      permalink: "https://www.instagram.com/p/mock_post_005/",
      posted_at: daysAgo(2),
      metrics: { views: 9000, shares: 80, saves: 104, engagement_rate: 0.020 },
      created_at: now, updated_at: now,
    },
  ]);
  if (e4) return { ok: false, message: `instagram_posts insert failed: ${e4.message}` };

  const { error: e5 } = await client.from("daily_decisions").insert({
    id: U.decision, user_id: U.user,
    decision_date: todayISO(),
    selected_topic: "退休不是 65 歲開始",
    confidence_score: 92,
    main_judgment: "我沒有選最熱門的題目。我選的是最適合你品牌長期累積的題目。",
    decision_factors: [
      { label: "Market Signal",    score: 84, text: "退休話題本週搜尋量上升，競品互動率低於平均，代表市場空間未被佔據。" },
      { label: "Creator DNA Fit",  score: 96, text: "主題完全符合品牌核心：讓追蹤者重新定義退休的意義。避開心靈雞湯陷阱。" },
      { label: "Brand Memory",     score: 91, text: "退休系列連續穩定輸出，中斷會影響品牌記憶。今天發出可鞏固系列節奏。" },
      { label: "Share Worthiness", score: 89, text: "反直覺標題具備高分享動機，類似框架歷史收藏率是一般貼文 2.4 倍。" },
    ],
    risk: "如果今天不發，退休系列的品牌記憶會中斷。",
    status: "approved",
    created_at: now, updated_at: now,
  });
  if (e5) return { ok: false, message: `daily_decisions insert failed: ${e5.message}` };

  const { error: e6 } = await client.from("decision_candidates").insert([
    { id: U.cand1, daily_decision_id: U.decision, topic: "退休不是 65 歲開始",      market_score: 84, brand_fit_score: 96, share_score: 89, risk_level: "Low",    rejected_reason: null,                         selected: true,  created_at: now },
    { id: U.cand2, daily_decision_id: U.decision, topic: "AI 會淘汰保險業務嗎？",   market_score: 93, brand_fit_score: 64, share_score: 76, risk_level: "High",   rejected_reason: "流量可能高，但今天容易變成跟風。", selected: false, created_at: now },
    { id: U.cand3, daily_decision_id: U.decision, topic: "努力沒有結果怎麼辦？",    market_score: 68, brand_fit_score: 58, share_score: 61, risk_level: "Medium", rejected_reason: "情緒共鳴夠，但容易落入雞湯。",   selected: false, created_at: now },
    { id: U.cand4, daily_decision_id: U.decision, topic: "快速成交的三個技巧",      market_score: 59, brand_fit_score: 42, share_score: 49, risk_level: "High",   rejected_reason: "短期有用，但會削弱長期品牌深度。", selected: false, created_at: now },
  ]);
  if (e6) return { ok: false, message: `decision_candidates insert failed: ${e6.message}` };

  const { error: e7 } = await client.from("carousel_drafts").insert({
    id: U.draft, daily_decision_id: U.decision,
    title: "退休不是 65 歲開始",
    caption: "同一個觀念，越早想清楚，越不容易被生活推著走。\n\n很多人都以為退休是 65 歲以後才要想的事。\n但其實，你現在做的每一個選擇，都在決定未來的自由。\n\n如果你覺得退休還很遠，這篇貼文就是為你寫的。",
    hashtags: ["退休規劃", "人生選擇", "保險觀念", "財務自由", "小佑"],
    export_status: "ready",
    created_at: now, updated_at: now,
  });
  if (e7) return { ok: false, message: `carousel_drafts insert failed: ${e7.message}` };

  const { error: e8 } = await client.from("carousel_slides").insert([
    { id: U.slide1, carousel_draft_id: U.draft, slide_number: 1, headline: "退休不是 / 65 歲開始",         body: "",                          design_notes: { variant: "cover" },       created_at: now, updated_at: now },
    { id: U.slide2, carousel_draft_id: U.draft, slide_number: 2, headline: "很多人以為退休是年紀問題。",   body: "其實退休是選擇問題。",             design_notes: { variant: "two-thought" },  created_at: now, updated_at: now },
    { id: U.slide3, carousel_draft_id: U.draft, slide_number: 3, headline: "你今天怎麼花錢，",             body: "其實已經在決定 20 年後的自由。",   design_notes: { variant: "statement" },    created_at: now, updated_at: now },
    { id: U.slide4, carousel_draft_id: U.draft, slide_number: 4, headline: "真正可怕的不是沒退休金。",     body: "是你一直以為還很早。",             design_notes: { variant: "dramatic" },    created_at: now, updated_at: now },
    { id: U.slide5, carousel_draft_id: U.draft, slide_number: 5, headline: "保險不是答案。",               body: "規劃才是。",                       design_notes: { variant: "minimal" },     created_at: now, updated_at: now },
    { id: U.slide6, carousel_draft_id: U.draft, slide_number: 6, headline: "如果你不知道自己想過什麼生活，", body: "再多工具都只是工具。",             design_notes: { variant: "statement" },    created_at: now, updated_at: now },
    { id: U.slide7, carousel_draft_id: U.draft, slide_number: 7, headline: "退休不是離開工作。",           body: "是擁有選擇。",                     design_notes: { variant: "quote" },       created_at: now, updated_at: now },
    { id: U.slide8, carousel_draft_id: U.draft, slide_number: 8, headline: "你不是在準備退休。",           body: "你是在準備未來的自由。",           design_notes: { variant: "closing" },     created_at: now, updated_at: now },
  ]);
  if (e8) return { ok: false, message: `carousel_slides insert failed: ${e8.message}` };

  const { error: e9 } = await client.from("publish_jobs").insert({
    id: U.publishJob,
    daily_decision_id: U.decision,
    carousel_draft_id: U.draft,
    user_id: U.user,
    status: "scheduled",
    scheduled_at: todayAt20(),
    published_at: null,
    force_publish: false,
    created_at: now, updated_at: now,
  });
  if (e9) return { ok: false, message: `publish_jobs insert failed: ${e9.message}` };

  const { error: e10 } = await client.from("learning_logs").insert([
    { id: U.log1, user_id: U.user, daily_decision_id: U.decision, learning_type: "brand_memory",   summary: "小佑的內容更適合從人生選擇切入，而不是商品功能切入。",   signal_data: {}, created_at: now },
    { id: U.log2, user_id: U.user, daily_decision_id: U.decision, learning_type: "performance",    summary: "分享價值比觀看數更能代表內容是否值得延續。",             signal_data: {}, created_at: now },
    { id: U.log3, user_id: U.user, daily_decision_id: U.decision, learning_type: "brand_fit",      summary: "Phoenix 應避免短期流量題與空泛雞湯。",                   signal_data: {}, created_at: now },
    { id: U.log4, user_id: U.user, daily_decision_id: U.decision, learning_type: "rhythm",         summary: "退休主題可以延續，但必須避免變成商品介紹。",             signal_data: {}, created_at: now },
    { id: U.log5, user_id: U.user, daily_decision_id: U.decision, learning_type: "decision_rule",  summary: "一針見血、直接解開疑問，是小佑內容最重要的品牌聲音。",   signal_data: {}, created_at: now },
  ]);
  if (e10) return { ok: false, message: `learning_logs insert failed: ${e10.message}` };

  return {
    ok: true,
    message: "Phoenix demo data reset.",
    state: {
      daily_decision_status: "approved",
      publish_job_status: "scheduled",
      force_publish: false,
      carousel_slides: 8,
      learning_logs: 5,
    },
  };
}
