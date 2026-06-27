-- ─────────────────────────────────────────────────────────────
-- Phoenix Personal — Seed Data
-- V2 Data Foundation
--
-- Safe to run multiple times. Deletes existing mock records
-- before inserting, respecting foreign key order.
-- No real passwords, API keys, or access tokens included.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- Fixed UUIDs (do not change — used across all tables)
-- ─────────────────────────────────────────────────────────────

-- user-001:               'a0000000-0000-0000-0000-000000000001'
-- creator_dna-001:        'a0000000-0000-0000-0000-000000000002'
-- ig_account-001:         'a0000000-0000-0000-0000-000000000003'
-- ig_post-001 to 005:     'a0000000-0000-0000-0000-000000000011' to '...015'
-- daily_decision-001:     'a0000000-0000-0000-0000-000000000020'
-- candidate-001 to 004:   'a0000000-0000-0000-0000-000000000031' to '...034'
-- carousel_draft-001:     'a0000000-0000-0000-0000-000000000040'
-- slide-001 to 008:       'a0000000-0000-0000-0000-000000000051' to '...058'
-- publish_job-001:        'a0000000-0000-0000-0000-000000000060'
-- learning_log-001 to 005:'a0000000-0000-0000-0000-000000000071' to '...075'

-- ─────────────────────────────────────────────────────────────
-- Delete existing seed records (reverse FK order)
-- ─────────────────────────────────────────────────────────────

delete from learning_logs        where id in (
  'a0000000-0000-0000-0000-000000000071',
  'a0000000-0000-0000-0000-000000000072',
  'a0000000-0000-0000-0000-000000000073',
  'a0000000-0000-0000-0000-000000000074',
  'a0000000-0000-0000-0000-000000000075'
);

delete from publish_jobs         where id = 'a0000000-0000-0000-0000-000000000060';

delete from carousel_slides      where carousel_draft_id = 'a0000000-0000-0000-0000-000000000040';

delete from carousel_drafts      where id = 'a0000000-0000-0000-0000-000000000040';

delete from decision_candidates  where daily_decision_id = 'a0000000-0000-0000-0000-000000000020';

delete from daily_decisions      where id = 'a0000000-0000-0000-0000-000000000020';

delete from instagram_posts      where instagram_account_id = 'a0000000-0000-0000-0000-000000000003';

delete from instagram_accounts   where id = 'a0000000-0000-0000-0000-000000000003';

delete from creator_dna          where id = 'a0000000-0000-0000-0000-000000000002';

delete from users                where id = 'a0000000-0000-0000-0000-000000000001';

-- ─────────────────────────────────────────────────────────────
-- 1. users
-- ─────────────────────────────────────────────────────────────

insert into users (id, email, name, created_at, updated_at)
values (
  'a0000000-0000-0000-0000-000000000001',
  'yuseng@example.local',
  '小佑',
  now(),
  now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. creator_dna
-- ─────────────────────────────────────────────────────────────

insert into creator_dna (
  id,
  user_id,
  brand_voice,
  content_goal,
  content_formula,
  content_ratio,
  avoid_list,
  design_dna,
  decision_rules,
  topic_preferences,
  created_at,
  updated_at
)
values (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  '一針見血，直接解開疑問。',
  '讓人想收藏，也想分享給某個人。',
  '痛點 → 破解迷思 → 觀點 → 解法 → 值得分享',
  '{"viewpoint": 50, "hook": 30, "story": 20}'::jsonb,
  '["心靈雞湯", "無聊內容", "標題黨", "農場文", "低品質流量", "沒有觀點", "為了流量而流量"]'::jsonb,
  'TED × Apple × Louis Vuitton',
  '[
    "如果題目有流量，但不符合品牌，Phoenix 可以否決。",
    "如果題目短期有效，但長期削弱品牌，Phoenix 不推薦。",
    "如果內容沒有觀點，即使好寫也不做。",
    "每天只推薦一個最佳主題。",
    "發布前一定需要小佑確認。"
  ]'::jsonb,
  '["退休", "AI", "品牌", "心理學", "保險觀念", "內容經營"]'::jsonb,
  now(),
  now()
);

-- ─────────────────────────────────────────────────────────────
-- 3. instagram_accounts
-- ─────────────────────────────────────────────────────────────

insert into instagram_accounts (
  id,
  user_id,
  instagram_user_id,
  username,
  account_type,
  access_token_encrypted,
  connected_at,
  revoked_at,
  created_at,
  updated_at
)
values (
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'mock_ig_user_001',
  'xiaoyou.teacher',
  'mock_professional',
  'mock_not_connected',
  null,
  null,
  now(),
  now()
);

-- ─────────────────────────────────────────────────────────────
-- 4. instagram_posts (5 historical mock posts)
-- ─────────────────────────────────────────────────────────────

insert into instagram_posts (
  id,
  user_id,
  instagram_account_id,
  instagram_post_id,
  post_type,
  caption,
  permalink,
  posted_at,
  metrics,
  created_at,
  updated_at
)
values
  (
    'a0000000-0000-0000-0000-000000000011',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    'mock_post_001',
    'carousel',
    '做保險會沒朋友嗎？',
    'https://www.instagram.com/p/mock_post_001/',
    now() - interval '30 days',
    '{"views": 37000, "shares": 421, "saves": 220, "engagement_rate": 0.018}'::jsonb,
    now(),
    now()
  ),
  (
    'a0000000-0000-0000-0000-000000000012',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    'mock_post_002',
    'carousel',
    '新人賺不到錢怎麼辦？',
    'https://www.instagram.com/p/mock_post_002/',
    now() - interval '23 days',
    '{"views": 18000, "shares": 160, "saves": 130, "engagement_rate": 0.016}'::jsonb,
    now(),
    now()
  ),
  (
    'a0000000-0000-0000-0000-000000000013',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    'mock_post_003',
    'carousel',
    '選主管的三個指標',
    'https://www.instagram.com/p/mock_post_003/',
    now() - interval '16 days',
    '{"views": 12000, "shares": 98, "saves": 110, "engagement_rate": 0.017}'::jsonb,
    now(),
    now()
  ),
  (
    'a0000000-0000-0000-0000-000000000014',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    'mock_post_004',
    'carousel',
    '新人做保險最怕什麼？',
    'https://www.instagram.com/p/mock_post_004/',
    now() - interval '9 days',
    '{"views": 15000, "shares": 188, "saves": 142, "engagement_rate": 0.022}'::jsonb,
    now(),
    now()
  ),
  (
    'a0000000-0000-0000-0000-000000000015',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    'mock_post_005',
    'carousel',
    '保險不是答案，規劃才是',
    'https://www.instagram.com/p/mock_post_005/',
    now() - interval '2 days',
    '{"views": 9000, "shares": 80, "saves": 104, "engagement_rate": 0.020}'::jsonb,
    now(),
    now()
  );

-- ─────────────────────────────────────────────────────────────
-- 5. daily_decisions
-- ─────────────────────────────────────────────────────────────

insert into daily_decisions (
  id,
  user_id,
  decision_date,
  selected_topic,
  confidence_score,
  main_judgment,
  decision_factors,
  risk,
  status,
  created_at,
  updated_at
)
values (
  'a0000000-0000-0000-0000-000000000020',
  'a0000000-0000-0000-0000-000000000001',
  current_date,
  '退休不是 65 歲開始',
  92,
  '我沒有選最熱門的題目。我選的是最適合你品牌長期累積的題目。',
  '[
    {"label": "Market Signal",    "score": 84, "text": "退休話題本週搜尋量上升，競品互動率低於平均，代表市場空間未被佔據。"},
    {"label": "Creator DNA Fit",  "score": 96, "text": "主題完全符合品牌核心：讓追蹤者重新定義退休的意義。避開心靈雞湯陷阱。"},
    {"label": "Brand Memory",     "score": 91, "text": "退休系列連續穩定輸出，中斷會影響品牌記憶。今天發出可鞏固系列節奏。"},
    {"label": "Share Worthiness", "score": 89, "text": "反直覺標題具備高分享動機，類似框架歷史收藏率是一般貼文 2.4 倍。"}
  ]'::jsonb,
  '如果今天不發，退休系列的品牌記憶會中斷。',
  'approved',
  now(),
  now()
);

-- ─────────────────────────────────────────────────────────────
-- 6. decision_candidates
-- ─────────────────────────────────────────────────────────────

insert into decision_candidates (
  id,
  daily_decision_id,
  topic,
  market_score,
  brand_fit_score,
  share_score,
  risk_level,
  rejected_reason,
  selected,
  created_at
)
values
  (
    'a0000000-0000-0000-0000-000000000031',
    'a0000000-0000-0000-0000-000000000020',
    '退休不是 65 歲開始',
    84, 96, 89,
    'Low',
    null,
    true,
    now()
  ),
  (
    'a0000000-0000-0000-0000-000000000032',
    'a0000000-0000-0000-0000-000000000020',
    'AI 會淘汰保險業務嗎？',
    93, 64, 76,
    'High',
    '流量可能高，但今天容易變成跟風。',
    false,
    now()
  ),
  (
    'a0000000-0000-0000-0000-000000000033',
    'a0000000-0000-0000-0000-000000000020',
    '努力沒有結果怎麼辦？',
    68, 58, 61,
    'Medium',
    '情緒共鳴夠，但容易落入雞湯。',
    false,
    now()
  ),
  (
    'a0000000-0000-0000-0000-000000000034',
    'a0000000-0000-0000-0000-000000000020',
    '快速成交的三個技巧',
    59, 42, 49,
    'High',
    '短期有用，但會削弱長期品牌深度。',
    false,
    now()
  );

-- ─────────────────────────────────────────────────────────────
-- 7. carousel_drafts
-- ─────────────────────────────────────────────────────────────

insert into carousel_drafts (
  id,
  daily_decision_id,
  title,
  caption,
  hashtags,
  export_status,
  created_at,
  updated_at
)
values (
  'a0000000-0000-0000-0000-000000000040',
  'a0000000-0000-0000-0000-000000000020',
  '退休不是 65 歲開始',
  '同一個觀念，越早想清楚，越不容易被生活推著走。

很多人都以為退休是 65 歲以後才要想的事。
但其實，你現在做的每一個選擇，都在決定未來的自由。

如果你覺得退休還很遠，這篇貼文就是為你寫的。',
  '["退休規劃", "人生選擇", "保險觀念", "財務自由", "小佑"]'::jsonb,
  'ready',
  now(),
  now()
);

-- ─────────────────────────────────────────────────────────────
-- 8. carousel_slides (8 slides)
-- ─────────────────────────────────────────────────────────────

insert into carousel_slides (
  id,
  carousel_draft_id,
  slide_number,
  headline,
  body,
  design_notes,
  created_at,
  updated_at
)
values
  (
    'a0000000-0000-0000-0000-000000000051',
    'a0000000-0000-0000-0000-000000000040',
    1,
    '退休不是 / 65 歲開始',
    '',
    '{"variant": "cover"}'::jsonb,
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000052',
    'a0000000-0000-0000-0000-000000000040',
    2,
    '很多人以為退休是年紀問題。',
    '其實退休是選擇問題。',
    '{"variant": "two-thought"}'::jsonb,
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000053',
    'a0000000-0000-0000-0000-000000000040',
    3,
    '你今天怎麼花錢，',
    '其實已經在決定 20 年後的自由。',
    '{"variant": "statement"}'::jsonb,
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000054',
    'a0000000-0000-0000-0000-000000000040',
    4,
    '真正可怕的不是沒退休金。',
    '是你一直以為還很早。',
    '{"variant": "dramatic"}'::jsonb,
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000055',
    'a0000000-0000-0000-0000-000000000040',
    5,
    '保險不是答案。',
    '規劃才是。',
    '{"variant": "minimal"}'::jsonb,
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000056',
    'a0000000-0000-0000-0000-000000000040',
    6,
    '如果你不知道自己想過什麼生活，',
    '再多工具都只是工具。',
    '{"variant": "statement"}'::jsonb,
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000057',
    'a0000000-0000-0000-0000-000000000040',
    7,
    '退休不是離開工作。',
    '是擁有選擇。',
    '{"variant": "quote"}'::jsonb,
    now(), now()
  ),
  (
    'a0000000-0000-0000-0000-000000000058',
    'a0000000-0000-0000-0000-000000000040',
    8,
    '你不是在準備退休。',
    '你是在準備未來的自由。',
    '{"variant": "closing"}'::jsonb,
    now(), now()
  );

-- ─────────────────────────────────────────────────────────────
-- 9. publish_jobs
-- ─────────────────────────────────────────────────────────────

insert into publish_jobs (
  id,
  daily_decision_id,
  carousel_draft_id,
  user_id,
  status,
  scheduled_at,
  published_at,
  force_publish,
  created_at,
  updated_at
)
values (
  'a0000000-0000-0000-0000-000000000060',
  'a0000000-0000-0000-0000-000000000020',
  'a0000000-0000-0000-0000-000000000040',
  'a0000000-0000-0000-0000-000000000001',
  'scheduled',
  (current_date + interval '20 hours'),
  null,
  false,
  now(),
  now()
);

-- ─────────────────────────────────────────────────────────────
-- 10. learning_logs
-- ─────────────────────────────────────────────────────────────

insert into learning_logs (
  id,
  user_id,
  daily_decision_id,
  learning_type,
  summary,
  signal_data,
  created_at
)
values
  (
    'a0000000-0000-0000-0000-000000000071',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000020',
    'brand_memory',
    '小佑的內容更適合從人生選擇切入，而不是商品功能切入。',
    '{}'::jsonb,
    now()
  ),
  (
    'a0000000-0000-0000-0000-000000000072',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000020',
    'performance',
    '分享價值比觀看數更能代表內容是否值得延續。',
    '{}'::jsonb,
    now()
  ),
  (
    'a0000000-0000-0000-0000-000000000073',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000020',
    'brand_fit',
    'Phoenix 應避免短期流量題與空泛雞湯。',
    '{}'::jsonb,
    now()
  ),
  (
    'a0000000-0000-0000-0000-000000000074',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000020',
    'rhythm',
    '退休主題可以延續，但必須避免變成商品介紹。',
    '{}'::jsonb,
    now()
  ),
  (
    'a0000000-0000-0000-0000-000000000075',
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000020',
    'decision_rule',
    '一針見血、直接解開疑問，是小佑內容最重要的品牌聲音。',
    '{}'::jsonb,
    now()
  );

-- ─────────────────────────────────────────────────────────────
-- Done.
-- ─────────────────────────────────────────────────────────────
