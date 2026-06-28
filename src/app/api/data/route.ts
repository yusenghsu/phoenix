import { NextRequest, NextResponse } from "next/server";
import {
  getTodayDecision,
  getDecisionCandidates,
  getCarouselDraft,
  getCreatorDNA,
  getLearningLogs,
  getHistoryDecisions,
  getPublishJob,
} from "@/lib/data/queries";

function scoreGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

// Normalize risk_level to English regardless of what the AI returned (may be Chinese)
function normalizeRisk(raw: string): "Low" | "Medium" | "High" {
  const v = (raw ?? "").toLowerCase().trim();
  if (v === "low" || v === "低") return "Low";
  if (v === "medium" || v === "中") return "Medium";
  if (v === "high" || v === "高") return "High";
  return "Low"; // safe fallback
}

function formatScheduledAt(iso: string | null): string {
  if (!iso) return "Today 20:00";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Today 20:00";
    // Display in Taiwan time (Asia/Taipei = UTC+8)
    const time = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Taipei",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
    // Sanity check: Phoenix posts in the evening. If Taiwan hour is outside
    // 18-22 range, the stored timestamp is likely a UTC conversion error — fall back.
    const hour = parseInt(time.split(":")[0], 10);
    if (hour < 18 || hour > 22) return "Today 20:00";
    return `Today ${time}`;
  } catch {
    return "Today 20:00";
  }
}

const RATIO_MAP: Record<string, { label: string; color: string }> = {
  viewpoint: { label: "觀點", color: "#F97316" },
  hook: { label: "爆點", color: "#FB923C" },
  story: { label: "故事", color: "#FBBF24" },
};

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");

  try {
    if (type === "today") {
      const decision = await getTodayDecision();
      return NextResponse.json({
        topic: decision.selectedTopic,
        score: decision.confidenceScore,
        grade: scoreGrade(decision.confidenceScore),
        mainJudgment: decision.mainJudgment,
        whyToday: decision.mainJudgment || "Phoenix 已完成今日草稿決策，等待小佑審核。",
        status: decision.status,
      });
    }

    if (type === "decision") {
      const [decision, candidates] = await Promise.all([
        getTodayDecision(),
        getDecisionCandidates(),
      ]);

      const rejected = candidates
        .filter((c) => !c.selected)
        .map((c) => ({
          topic: c.topic,
          signal: `Market Score: ${c.marketScore}`,
          reason: c.rejectedReason ?? "",
        }));

      const matrix = candidates.map((c) => ({
        topic: c.topic,
        market: c.marketScore,
        brand: c.brandFitScore,
        share: c.shareScore,
        risk: normalizeRisk(c.riskLevel as string),
        selected: c.selected,
      }));

      const factors = decision.decisionFactors.map((f) => ({
        label: f.label,
        score: f.score,
        text: f.text,
      }));

      return NextResponse.json({
        topic: decision.selectedTopic,
        confidence: decision.confidenceScore,
        factors,
        rejected,
        matrix,
        risk: decision.risk,
        mainJudgment: decision.mainJudgment,
        status: decision.status,
      });
    }

    if (type === "carousel") {
      const [carousel, decision] = await Promise.all([
        getCarouselDraft(),
        getTodayDecision(),
      ]);
      const captionLines = carousel.caption.split("\n\n");
      const captionBrief = captionLines[0] ?? carousel.caption;
      const hashtags = carousel.hashtags.map((h) =>
        h.startsWith("#") ? h : `#${h}`
      );
      const slides = (carousel.slides ?? []).map((s) => ({
        slideNumber: s.slideNumber,
        headline: s.headline,
        body: s.body,
      }));
      return NextResponse.json({
        captionBrief,
        captionFull: carousel.caption,
        hashtags,
        decisionStatus: decision.status,
        slides,
      });
    }

    if (type === "settings") {
      const dna = await getCreatorDNA();

      const contentRatio = (() => {
        const raw = dna.contentRatio;
        if (Array.isArray(raw)) return raw;
        const obj = raw as unknown as Record<string, number>;
        return Object.entries(obj).map(([key, pct]) => ({
          label: RATIO_MAP[key]?.label ?? key,
          pct,
          color: RATIO_MAP[key]?.color ?? "#F97316",
        }));
      })();

      return NextResponse.json({
        avoidList: dna.avoidList,
        decisionRules: dna.decisionRules,
        contentRatio,
        brandVoice: dna.brandVoice,
        contentGoal: dna.contentGoal,
        contentFormula: dna.contentFormula,
        designDna: dna.designDna,
        topicPreferences: dna.topicPreferences,
      });
    }

    if (type === "history") {
      const [decisions, logs] = await Promise.all([
        getHistoryDecisions(7),
        getLearningLogs(5),
      ]);

      const todayRecord = decisions[0];
      const learnings = logs.map((l) => l.summary);

      return NextResponse.json({
        todayTopic: todayRecord?.selectedTopic ?? null,
        todayScore: todayRecord?.confidenceScore ?? null,
        todayStatus: todayRecord?.status ?? null,
        learnings,
      });
    }

    if (type === "publish") {
      const job = await getPublishJob();
      return NextResponse.json({
        scheduledLabel: formatScheduledAt(job.scheduledAt),
        status: job.status,
        topic: job.topic,
      });
    }

    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
