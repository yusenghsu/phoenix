export type RiskLevel = "low" | "medium" | "high";

export type DecisionFactor = {
  label: string;
  score: number;
  text: string;
};

export type DecisionCandidate = {
  topic: string;
  marketScore: number;
  brandFitScore: number;
  shareScore: number;
  riskLevel: RiskLevel;
  rejectedReason: string | null;
  selected: boolean;
};

export type CarouselSlideDraft = {
  slideNumber: number;
  headline: string;
  body: string;
  designNotes: { variant: string };
};

export type DecisionEngineInput = {
  user: { id: string; name?: string };
  creatorDNA: Record<string, unknown>;
  recentPosts: unknown[];
  todayDate: string;
  existingRecentDecisions: unknown[];
};

export type DecisionEngineOutput = {
  selectedTopic: string;
  confidenceScore: number;
  mainJudgment: string;
  decisionFactors: DecisionFactor[];
  risk: string;
  candidates: DecisionCandidate[];
  carouselDraft: {
    title: string;
    caption: string;
    hashtags: string[];
  };
  carouselSlides: CarouselSlideDraft[];
  learningLog: string;
};
