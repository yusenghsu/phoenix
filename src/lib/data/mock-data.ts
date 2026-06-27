// Phoenix Personal — Mock Data
// Matches the V1 prototype UI. All data is fake.

import type {
  CreatorDNA,
  DailyDecision,
  DecisionCandidate,
  CarouselDraft,
  PublishJob,
  LearningLog,
  TodayBrief,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Creator DNA
// ─────────────────────────────────────────────────────────────

export const MOCK_CREATOR_DNA: CreatorDNA = {
  id: "dna-001",
  userId: "user-001",
  brandVoice:
    "直接、有觀點、不說廢話。用說話的方式寫字。讓讀者覺得「有人懂我」。",
  contentGoal: "讓追蹤者覺得有一個懂他們的財務朋友在陪伴他們成長。",
  contentFormula: "觀點切入 → 故事支撐 → 行動結尾",
  contentRatio: [
    { label: "觀點", pct: 50 },
    { label: "爆點", pct: 30 },
    { label: "教育", pct: 20 },
  ],
  avoidList: ["心靈雞湯", "標題黨", "過度正能量", "說教語氣"],
  designDna:
    "乾淨、留白、字體有力。黑底白字為主。重點用橘色標出。不用裝飾元素。",
  decisionRules: [
    "如果題目有流量但不符品牌，Phoenix 可以否決。",
    "系列貼文必須保持節奏，不能隨意中斷。",
    "退休主題每週至少出現一次。",
  ],
  topicPreferences: ["退休", "AI 與工作", "保險觀念", "財務自由", "職涯選擇"],
  createdAt: "2026-01-10T00:00:00Z",
  updatedAt: "2026-06-01T08:00:00Z",
};

// ─────────────────────────────────────────────────────────────
// Today's Decision
// ─────────────────────────────────────────────────────────────

export const MOCK_TODAY_DECISION: DailyDecision = {
  id: "decision-today",
  userId: "user-001",
  decisionDate: "2026-06-28",
  selectedTopic: "退休不是 65 歲開始",
  confidenceScore: 92,
  mainJudgment:
    "今天的退休主題切入點鮮明，市場信號強，完全符合品牌聲音與系列節奏。Phoenix 建議直接執行。",
  decisionFactors: [
    {
      label: "Market Signal",
      score: 84,
      text: "退休相關話題本週搜尋量上升 23%，競品帳號互動率明顯低於平均，代表市場空間未被佔據。",
    },
    {
      label: "Brand Fit",
      score: 96,
      text: "主題完全符合品牌核心主張：讓追蹤者重新定義退休的意義。語氣直接、有觀點，避開心靈雞湯陷阱。",
    },
    {
      label: "Share Worthiness",
      score: 88,
      text: "「退休不是 65 歲開始」這個反直覺標題具備高分享動機。過去類似框架的貼文平均收藏率是一般貼文的 2.4 倍。",
    },
    {
      label: "Brand Memory",
      score: 91,
      text: "退休系列已連續 3 週穩定輸出，中斷會影響品牌記憶。今天發出可鞏固系列印象，為下週預熱。",
    },
  ],
  risk: "如果今天不發，退休系列的品牌記憶會中斷，需要額外 2–3 篇才能重建節奏。",
  status: "draft",
  createdAt: "2026-06-28T03:00:00Z",
  updatedAt: "2026-06-28T03:00:00Z",
};

// ─────────────────────────────────────────────────────────────
// Decision Candidates (rejected)
// ─────────────────────────────────────────────────────────────

export const MOCK_CANDIDATES: DecisionCandidate[] = [
  {
    id: "cand-001",
    dailyDecisionId: "decision-today",
    topic: "退休不是 65 歲開始",
    marketScore: 84,
    brandFitScore: 96,
    shareScore: 88,
    riskLevel: "Low",
    rejectedReason: null,
    selected: true,
  },
  {
    id: "cand-002",
    dailyDecisionId: "decision-today",
    topic: "AI 會搶走你的工作嗎？",
    marketScore: 91,
    brandFitScore: 62,
    shareScore: 85,
    riskLevel: "Medium",
    rejectedReason:
      "市場信號強，但與品牌核心主張偏離。連續兩週討論 AI 會稀釋退休系列的焦點。",
    selected: false,
  },
  {
    id: "cand-003",
    dailyDecisionId: "decision-today",
    topic: "買保險前你必須知道的三件事",
    marketScore: 74,
    brandFitScore: 78,
    shareScore: 71,
    riskLevel: "Low",
    rejectedReason:
      "品牌適配度可以，但市場信號偏弱。本週保險類話題整體互動率下滑，不是最佳時機。",
    selected: false,
  },
  {
    id: "cand-004",
    dailyDecisionId: "decision-today",
    topic: "為什麼年輕人不想存錢？",
    marketScore: 88,
    brandFitScore: 55,
    shareScore: 82,
    riskLevel: "High",
    rejectedReason:
      "標題有流量，但語氣偏向批判式，不符合品牌「陪伴者」定位。Phoenix 依決策規則否決。",
    selected: false,
  },
];

// ─────────────────────────────────────────────────────────────
// Carousel Draft
// ─────────────────────────────────────────────────────────────

export const MOCK_CAROUSEL: CarouselDraft = {
  id: "carousel-today",
  dailyDecisionId: "decision-today",
  title: "退休不是 65 歲開始",
  caption:
    "退休不是年齡的問題，是選擇的問題。\n\n你不需要等到 65 歲才開始思考你要的生活。\n\n今天的你，每一個財務決定，都是在替未來的你投票。\n\n你想投給哪一種生活？",
  hashtags: [
    "#退休規劃",
    "#財務自由",
    "#人生選擇",
    "#保險觀念",
    "#小佑說",
    "#個人財務",
  ],
  exportStatus: "draft",
  slides: [
    {
      id: "slide-01",
      carouselDraftId: "carousel-today",
      slideNumber: 1,
      headline: "退休不是 65 歲開始。",
      body: "",
      designNotes: { variant: "cover", highlight: "退休不是 65 歲開始。" },
    },
    {
      id: "slide-02",
      carouselDraftId: "carousel-today",
      slideNumber: 2,
      headline: "大多數人的退休計畫是什麼？",
      body: "「等我 65 歲就可以退休了。」\n「等孩子長大就輕鬆了。」\n\n但等到那天，身體還跟得上嗎？",
      designNotes: { variant: "two-thought" },
    },
    {
      id: "slide-03",
      carouselDraftId: "carousel-today",
      slideNumber: 3,
      headline: "退休是一種財務狀態，不是年齡。",
      body: "當你的被動收入 ≥ 生活支出，你就可以退休。\n\n不管你幾歲。",
      designNotes: { variant: "statement" },
    },
    {
      id: "slide-04",
      carouselDraftId: "carousel-today",
      slideNumber: 4,
      headline: "有人 35 歲退休，有人 75 歲還在等。",
      body: "差別不是薪水。\n是他們更早開始做了決定。",
      designNotes: { variant: "dramatic" },
    },
    {
      id: "slide-05",
      carouselDraftId: "carousel-today",
      slideNumber: 5,
      headline: "你今天的每一個財務選擇，都在替未來投票。",
      body: "",
      designNotes: { variant: "minimal", highlight: "替未來投票" },
    },
    {
      id: "slide-06",
      carouselDraftId: "carousel-today",
      slideNumber: 6,
      headline: "不是叫你現在就辭職。",
      body: "是叫你現在就開始設計你要的生活。\n\n然後讓財務去配合它。",
      designNotes: { variant: "statement" },
    },
    {
      id: "slide-07",
      carouselDraftId: "carousel-today",
      slideNumber: 7,
      headline: "「退休自由，不是終點，是起點。」",
      body: "",
      designNotes: { variant: "quote" },
    },
    {
      id: "slide-08",
      carouselDraftId: "carousel-today",
      slideNumber: 8,
      headline: "你想幾歲退休？",
      body: "留言告訴我。\n\n如果你還沒想過，現在是個好時機。",
      designNotes: { variant: "closing" },
    },
  ],
  createdAt: "2026-06-28T03:00:00Z",
  updatedAt: "2026-06-28T03:00:00Z",
};

// ─────────────────────────────────────────────────────────────
// Publish Job (today — pending)
// ─────────────────────────────────────────────────────────────

export const MOCK_PUBLISH_JOB: PublishJob = {
  id: "publish-today",
  dailyDecisionId: "decision-today",
  carouselDraftId: "carousel-today",
  userId: "user-001",
  status: "pending",
  scheduledAt: "2026-06-28T12:00:00Z",
  publishedAt: null,
  forcePublish: false,
  createdAt: "2026-06-28T03:00:00Z",
  updatedAt: "2026-06-28T03:00:00Z",
};

// ─────────────────────────────────────────────────────────────
// Learning Logs
// ─────────────────────────────────────────────────────────────

export const MOCK_LEARNING_LOGS: LearningLog[] = [
  {
    id: "log-001",
    userId: "user-001",
    dailyDecisionId: "decision-2026-06-21",
    learningType: "performance",
    summary:
      "上週退休主題收藏率 4.8%，高於帳號平均 2.1 倍。退休系列值得持續投資。",
    signalData: { saves: 234, reach: 4880, engagementRate: 0.048 },
    createdAt: "2026-06-23T03:00:00Z",
  },
  {
    id: "log-002",
    userId: "user-001",
    dailyDecisionId: "decision-2026-06-14",
    learningType: "brand_fit",
    summary:
      "批判式標題（「為什麼年輕人不存錢」）互動率低於預期，且收到負面留言。強化「批判語氣」加入避免清單。",
    signalData: { engagementRate: 0.019, negativeComments: 3 },
    createdAt: "2026-06-16T03:00:00Z",
  },
  {
    id: "log-003",
    userId: "user-001",
    dailyDecisionId: "decision-2026-06-07",
    learningType: "rhythm",
    summary:
      "連續 7 天發文後休息 3 天，回來後首篇觸及率下滑 31%。週發文節奏比日發文更穩定。",
    signalData: { reachDrop: 0.31, gapDays: 3 },
    createdAt: "2026-06-11T03:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────
// Today Brief (composite)
// ─────────────────────────────────────────────────────────────

export const MOCK_TODAY_BRIEF: TodayBrief = {
  decision: MOCK_TODAY_DECISION,
  carousel: MOCK_CAROUSEL,
  publishJob: MOCK_PUBLISH_JOB,
};
