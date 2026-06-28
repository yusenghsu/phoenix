import "server-only";
import { createServerClient } from "../supabase/server";
import {
  MOCK_TODAY_DECISION,
  MOCK_CANDIDATES,
  MOCK_CAROUSEL,
  MOCK_CREATOR_DNA,
  MOCK_LEARNING_LOGS,
} from "./mock-data";
import type {
  DailyDecision,
  DecisionCandidate,
  CarouselDraft,
  CreatorDNA,
  LearningLog,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDecision(row: Record<string, unknown>): DailyDecision {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    decisionDate: row.decision_date as string,
    selectedTopic: row.selected_topic as string,
    confidenceScore: row.confidence_score as number,
    mainJudgment: row.main_judgment as string,
    decisionFactors: (row.decision_factors as DailyDecision["decisionFactors"]) ?? [],
    risk: row.risk as string,
    status: row.status as DailyDecision["status"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toCandidate(row: Record<string, unknown>): DecisionCandidate {
  return {
    id: row.id as string,
    dailyDecisionId: row.daily_decision_id as string,
    topic: row.topic as string,
    marketScore: row.market_score as number,
    brandFitScore: row.brand_fit_score as number,
    shareScore: row.share_score as number,
    riskLevel: row.risk_level as DecisionCandidate["riskLevel"],
    rejectedReason: (row.rejected_reason as string) ?? null,
    selected: row.selected as boolean,
  };
}

function toDNA(row: Record<string, unknown>): CreatorDNA {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    brandVoice: row.brand_voice as string,
    contentGoal: row.content_goal as string,
    contentFormula: row.content_formula as string,
    contentRatio: (row.content_ratio as CreatorDNA["contentRatio"]) ?? [],
    avoidList: (row.avoid_list as string[]) ?? [],
    designDna: row.design_dna as string,
    decisionRules: (row.decision_rules as string[]) ?? [],
    topicPreferences: (row.topic_preferences as string[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toCarousel(row: Record<string, unknown>): Omit<CarouselDraft, "slides"> {
  return {
    id: row.id as string,
    dailyDecisionId: row.daily_decision_id as string,
    title: row.title as string,
    caption: row.caption as string,
    hashtags: (row.hashtags as string[]) ?? [],
    exportStatus: row.export_status as CarouselDraft["exportStatus"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function todayDate() {
  // Always use Taiwan date (Asia/Taipei = UTC+8).
  // Cron fires at 19:00 UTC = 03:00 Taiwan next day — UTC date would be
  // one day behind Taiwan, causing "today" lookups to miss the new draft
  // from 08:00 Taiwan until the next cron cycle.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

// ─── Query functions ───────────────────────────────────────────────────────────

export async function getTodayDecision(): Promise<DailyDecision> {
  const client = createServerClient();
  if (!client) return MOCK_TODAY_DECISION;
  try {
    const { data, error } = await client
      .from("daily_decisions")
      .select("*")
      .eq("decision_date", todayDate())
      .single();
    if (error || !data) return MOCK_TODAY_DECISION;
    return toDecision(data as Record<string, unknown>);
  } catch {
    return MOCK_TODAY_DECISION;
  }
}

export async function getDecisionCandidates(dailyDecisionId?: string): Promise<DecisionCandidate[]> {
  const client = createServerClient();
  if (!client) return MOCK_CANDIDATES;
  try {
    let id = dailyDecisionId;
    if (!id) {
      const decision = await getTodayDecision();
      id = decision.id;
    }
    const { data, error } = await client
      .from("decision_candidates")
      .select("*")
      .eq("daily_decision_id", id);
    if (error || !data || data.length === 0) return MOCK_CANDIDATES;
    return (data as Record<string, unknown>[]).map(toCandidate);
  } catch {
    return MOCK_CANDIDATES;
  }
}

export async function getCarouselDraft(dailyDecisionId?: string): Promise<CarouselDraft> {
  const client = createServerClient();
  if (!client) return MOCK_CAROUSEL;
  try {
    let id = dailyDecisionId;
    if (!id) {
      const decision = await getTodayDecision();
      id = decision.id;
    }
    const { data: draftRow, error: draftErr } = await client
      .from("carousel_drafts")
      .select("*")
      .eq("daily_decision_id", id)
      .single();
    if (draftErr || !draftRow) return MOCK_CAROUSEL;

    const { data: slideRows } = await client
      .from("carousel_slides")
      .select("*")
      .eq("carousel_draft_id", (draftRow as Record<string, unknown>).id)
      .order("slide_number", { ascending: true });

    const slides = (slideRows ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      carouselDraftId: s.carousel_draft_id as string,
      slideNumber: s.slide_number as number,
      headline: s.headline as string,
      body: s.body as string,
      designNotes: (s.design_notes as Record<string, string>) ?? {},
    }));

    return {
      ...toCarousel(draftRow as Record<string, unknown>),
      slides,
    };
  } catch {
    return MOCK_CAROUSEL;
  }
}

export async function getCreatorDNA(): Promise<CreatorDNA> {
  const client = createServerClient();
  if (!client) return MOCK_CREATOR_DNA;
  try {
    const { data, error } = await client
      .from("creator_dna")
      .select("*")
      .single();
    if (error || !data) return MOCK_CREATOR_DNA;
    return toDNA(data as Record<string, unknown>);
  } catch {
    return MOCK_CREATOR_DNA;
  }
}

export async function getLearningLogs(limit = 5): Promise<LearningLog[]> {
  const client = createServerClient();
  if (!client) return MOCK_LEARNING_LOGS;
  try {
    const { data, error } = await client
      .from("learning_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data || data.length === 0) return MOCK_LEARNING_LOGS;
    return (data as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      dailyDecisionId: (row.daily_decision_id as string) ?? null,
      learningType: row.learning_type as LearningLog["learningType"],
      summary: row.summary as string,
      signalData: (row.signal_data as Record<string, unknown>) ?? {},
      createdAt: row.created_at as string,
    }));
  } catch {
    return MOCK_LEARNING_LOGS;
  }
}

export async function getHistoryDecisions(limit = 10): Promise<DailyDecision[]> {
  const client = createServerClient();
  if (!client) return [MOCK_TODAY_DECISION];
  try {
    const { data, error } = await client
      .from("daily_decisions")
      .select("*")
      .order("decision_date", { ascending: false })
      .limit(limit);
    if (error || !data || data.length === 0) return [MOCK_TODAY_DECISION];
    return (data as Record<string, unknown>[]).map(toDecision);
  } catch {
    return [MOCK_TODAY_DECISION];
  }
}

export async function getPublishJob(dailyDecisionId?: string): Promise<{ scheduledAt: string | null; status: string; topic: string }> {
  const client = createServerClient();
  const decision = await getTodayDecision();
  if (!client) {
    return { scheduledAt: null, status: "pending", topic: decision.selectedTopic };
  }
  try {
    let id = dailyDecisionId ?? decision.id;
    const { data, error } = await client
      .from("publish_jobs")
      .select("*")
      .eq("daily_decision_id", id)
      .single();
    if (error || !data) {
      return { scheduledAt: null, status: "pending", topic: decision.selectedTopic };
    }
    const row = data as Record<string, unknown>;
    return {
      scheduledAt: (row.scheduled_at as string) ?? null,
      status: row.status as string,
      topic: decision.selectedTopic,
    };
  } catch {
    return { scheduledAt: null, status: "pending", topic: decision.selectedTopic };
  }
}
