// Phoenix Personal — Core TypeScript Types
// V2 Data Foundation

// ─────────────────────────────────────────────────────────────
// Enums / Union Types
// ─────────────────────────────────────────────────────────────

export type DecisionStatus =
  | "draft"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published";

export type PublishStatus =
  | "pending"
  | "scheduled"
  | "published"
  | "failed"
  | "cancelled";

export type RiskLevel = "Low" | "Medium" | "High";

export type PostType = "carousel" | "image" | "video" | "reel";

export type LearningType =
  | "performance"
  | "brand_fit"
  | "rhythm"
  | "topic"
  | "decision_rule";

// ─────────────────────────────────────────────────────────────
// Creator DNA
// ─────────────────────────────────────────────────────────────

export interface ContentRatioItem {
  label: string;
  pct: number;
}

export interface CreatorDNA {
  id: string;
  userId: string;
  brandVoice: string;
  contentGoal: string;
  contentFormula: string;
  contentRatio: ContentRatioItem[];
  avoidList: string[];
  designDna: string;
  decisionRules: string[];
  topicPreferences: string[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Instagram
// ─────────────────────────────────────────────────────────────

export interface InstagramAccount {
  id: string;
  userId: string;
  instagramUserId: string;
  username: string;
  accountType: "creator" | "business";
  connectedAt: string | null;
  revokedAt: string | null;
}

export interface PostMetrics {
  saves: number;
  shares: number;
  reach: number;
  engagementRate: number;
}

export interface InstagramPost {
  id: string;
  userId: string;
  instagramAccountId: string;
  instagramPostId: string;
  postType: PostType;
  caption: string;
  permalink: string;
  postedAt: string;
  metrics: PostMetrics;
}

// ─────────────────────────────────────────────────────────────
// Decision
// ─────────────────────────────────────────────────────────────

export interface DecisionFactor {
  label: string;
  score: number;
  text: string;
}

export interface DailyDecision {
  id: string;
  userId: string;
  decisionDate: string;
  selectedTopic: string;
  confidenceScore: number;
  mainJudgment: string;
  decisionFactors: DecisionFactor[];
  risk: string;
  status: DecisionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionCandidate {
  id: string;
  dailyDecisionId: string;
  topic: string;
  marketScore: number;
  brandFitScore: number;
  shareScore: number;
  riskLevel: RiskLevel;
  rejectedReason: string | null;
  selected: boolean;
}

// ─────────────────────────────────────────────────────────────
// Carousel
// ─────────────────────────────────────────────────────────────

export interface CarouselSlide {
  id: string;
  carouselDraftId: string;
  slideNumber: number;
  headline: string;
  body: string;
  designNotes: Record<string, string>;
}

export interface CarouselDraft {
  id: string;
  dailyDecisionId: string;
  title: string;
  caption: string;
  hashtags: string[];
  exportStatus: "draft" | "approved" | "exported";
  slides: CarouselSlide[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Publish
// ─────────────────────────────────────────────────────────────

export interface PublishJob {
  id: string;
  dailyDecisionId: string;
  carouselDraftId: string;
  userId: string;
  status: PublishStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  forcePublish: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// Learning
// ─────────────────────────────────────────────────────────────

export interface LearningLog {
  id: string;
  userId: string;
  dailyDecisionId: string | null;
  learningType: LearningType;
  summary: string;
  signalData: Record<string, unknown>;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Today Brief (UI-level composite)
// ─────────────────────────────────────────────────────────────

export interface TodayBrief {
  decision: DailyDecision;
  carousel: CarouselDraft;
  publishJob: PublishJob | null;
}
