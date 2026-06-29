"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface VisualSceneDirection {
  overall_style: string;
  scene_type: string;
  people_scene: string;
  emotional_atmosphere: string;
  motion_background: string;
  camera_movement: string;
  typography_mood: string;
  not_allowed: string[];
}

interface TopicCandidate {
  topic: string;
  hook: string;
  editorial_thesis?: string;
  market_tension?: string;
  why_yusheng?: string;
  audience_hit?: string[];
  core_angle: string;
  why_for_yusheng: string;
  why_market_resonates: string;
  yusheng_voice_fit: string;
  first_slide_direction: string;
  comment_prompt: string;
  target_audience: string[];
  content_type: "carousel";
  emotional_trigger: string;
  shareability_score: number;
  saveability_score: number;
  brand_fit_score: number;
  risk_level: "low" | "medium" | "high";
  risk_reason: string;
  is_recommended?: boolean;
  visual_scene_direction: VisualSceneDirection;
}

interface PhoenixSignal {
  signal: string;
  value: string;
}

interface PhoenixAnalysis {
  content_thesis: string;
  signals_used: PhoenixSignal[];
  why_these_five: string;
}

interface LaunchRecommendation {
  recommended_index: number;
  why_this_wins: string;
  why_others_lost: string[];
}

interface IntelligenceResult {
  ok: boolean;
  source: string;
  market_source: string;
  analysis_note: string;
  analysis: PhoenixAnalysis;
  candidates: TopicCandidate[];
  launch_recommendation?: LaunchRecommendation;
  environment?: string;
  message?: string;
}

interface CarouselQualityScore {
  topic_direction_score: number;
  narrative_score: number;
  yusheng_voice_score: number;
  pain_precision_score: number;
  visual_executability_score: number;
  publish_readiness_score: number;
  overall_score: number;
  publish_ready: boolean;
  failing_reasons: string[];
  revised_direction: string | null;
}

interface CarouselSlide {
  slide_number: number;
  role: string;
  main_copy: string;
  support_copy: string;
  highlight_words: string[];
  layout_note: string;
  scene: string;
  motion_background: string;
  camera: string;
  lighting: string;
  typography_note: string;
  negative_prompt: string[];
  animation_prompt: string;
}

interface CarouselResult {
  topic: string;
  angle: string;
  editorial_thesis?: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
  quality_score?: CarouselQualityScore;
  manual_launch_checklist: string[];
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>
      {children}
    </p>
  );
}

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    low: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.18)", color: "#4ade80", label: "LOW RISK" },
    medium: { bg: "rgba(251,146,60,0.08)", border: "rgba(251,146,60,0.18)", color: "#FB923C", label: "MED RISK" },
    high: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.18)", color: "#f87171", label: "HIGH RISK" },
  };
  const s = styles[level];
  return (
    <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: 9, fontWeight: 700, borderRadius: 6, padding: "3px 8px", letterSpacing: "0.08em" }}>
      {s.label}
    </span>
  );
}

function ScorePill({ value, label }: { value: number; label: string }) {
  const color = value >= 88 ? "#F97316" : value >= 75 ? "#FB923C" : "#52504E";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <span style={{ color, fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</span>
      <span style={{ color: "#3E3B37", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

// ── Carousel preview components ────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; color: string; border: string; bg: string }> = {
  hook:               { label: "HOOK",          color: "#FB923C", border: "rgba(249,115,22,0.25)", bg: "rgba(249,115,22,0.1)" },
  pain:               { label: "PAIN",          color: "#f87171", border: "rgba(239,68,68,0.2)",  bg: "rgba(239,68,68,0.07)" },
  misunderstanding:   { label: "MISUNDERSTANDING", color: "#facc15", border: "rgba(234,179,8,0.2)", bg: "rgba(234,179,8,0.07)" },
  reframe:            { label: "REFRAME",       color: "#4ade80", border: "rgba(34,197,94,0.2)",  bg: "rgba(34,197,94,0.07)" },
  method:             { label: "METHOD",        color: "#818cf8", border: "rgba(99,102,241,0.2)", bg: "rgba(99,102,241,0.08)" },
  supervisor_insight: { label: "SUPERVISOR",    color: "#2dd4bf", border: "rgba(20,184,166,0.2)", bg: "rgba(20,184,166,0.07)" },
  saveable_summary:   { label: "SUMMARY",       color: "#F97316", border: "rgba(249,115,22,0.3)", bg: "rgba(249,115,22,0.12)" },
  cta:                { label: "CTA",           color: "#FAFAF9", border: "rgba(255,255,255,0.15)", bg: "rgba(255,255,255,0.05)" },
};

function getSceneGradient(scene: string): string {
  const s = scene.toLowerCase();
  if (s.includes("咖啡廳") || s.includes("café")) return "linear-gradient(155deg, #1A1208 0%, #0C0A08 60%, #120E08 100%)";
  if (s.includes("辦公室") || s.includes("辦公")) return "linear-gradient(155deg, #080D1A 0%, #0C0A08 60%, #0A0C14 100%)";
  if (s.includes("走廊") || s.includes("corridor")) return "linear-gradient(155deg, #0D0E12 0%, #0C0A08 60%, #0F1014 100%)";
  if (s.includes("戶外") || s.includes("台階") || s.includes("街")) return "linear-gradient(155deg, #120E08 0%, #0C0A08 60%, #140D08 100%)";
  if (s.includes("客廳") || s.includes("家")) return "linear-gradient(155deg, #150D08 0%, #0C0A08 60%, #120A08 100%)";
  if (s.includes("白板") || s.includes("會議")) return "linear-gradient(155deg, #0E0E14 0%, #0C0A08 60%, #0D0E12 100%)";
  return "linear-gradient(155deg, #1C1916 0%, #0C0A08 55%, #131109 100%)";
}

function getLightingOverlay(lighting: string): string {
  const l = lighting.toLowerCase();
  if (l.includes("暖橘") || l.includes("warm amber") || l.includes("暖光")) return "radial-gradient(ellipse 55% 35% at 78% 18%, rgba(251,146,60,0.06) 0%, transparent 70%)";
  if (l.includes("桌燈") || l.includes("desk lamp")) return "radial-gradient(ellipse 45% 45% at 65% 75%, rgba(251,146,60,0.05) 0%, transparent 70%)";
  if (l.includes("冷白") || l.includes("日光") || l.includes("daylight")) return "radial-gradient(ellipse 60% 30% at 50% 5%, rgba(200,220,255,0.03) 0%, transparent 70%)";
  if (l.includes("藍黑") || l.includes("blue") || l.includes("電影感")) return "radial-gradient(ellipse 50% 50% at 15% 25%, rgba(30,60,140,0.05) 0%, transparent 70%)";
  if (l.includes("街燈") || l.includes("street")) return "radial-gradient(ellipse 40% 50% at 30% 60%, rgba(251,146,60,0.04) 0%, transparent 70%)";
  return "none";
}

function HighlightedCopy({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  let parts: Array<{ text: string; highlighted: boolean }> = [{ text, highlighted: false }];
  for (const word of words) {
    const newParts: Array<{ text: string; highlighted: boolean }> = [];
    for (const part of parts) {
      if (part.highlighted) { newParts.push(part); continue; }
      const idx = part.text.indexOf(word);
      if (idx === -1) { newParts.push(part); continue; }
      if (idx > 0) newParts.push({ text: part.text.slice(0, idx), highlighted: false });
      newParts.push({ text: word, highlighted: true });
      if (idx + word.length < part.text.length) newParts.push({ text: part.text.slice(idx + word.length), highlighted: false });
    }
    parts = newParts;
  }
  return (
    <>
      {parts.map((part, i) =>
        part.highlighted
          ? <span key={i} style={{ color: "#F97316" }}>{part.text}</span>
          : <span key={i}>{part.text}</span>
      )}
    </>
  );
}

function SlideCard({ slide, total }: { slide: CarouselSlide; total: number }) {
  const [detailExpanded, setDetailExpanded] = useState(false);
  const role = slide.role.toLowerCase();
  const meta = ROLE_META[role] ?? ROLE_META.cta;
  const gradient = getSceneGradient(slide.scene);
  const overlay = getLightingOverlay(slide.lighting);

  return (
    <div style={{ marginBottom: 20 }}>
      {/* 4:5 ratio Instagram card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "125%",
          borderRadius: 14,
          overflow: "hidden",
          background: gradient,
          border: "1px solid rgba(249,115,22,0.07)",
          marginBottom: 12,
        }}
      >
        {/* Lighting overlay */}
        {overlay !== "none" && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: overlay, pointerEvents: "none" }} />
        )}

        {/* Subtle scene texture: horizontal rule at 35% down */}
        <div style={{ position: "absolute", top: "35%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.015)", pointerEvents: "none" }} />

        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            padding: "clamp(18px, 5%, 28px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "auto", paddingBottom: 16 }}>
            <span style={{ color: "rgba(249,115,22,0.35)", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", fontFamily: "monospace" }}>
              {slide.slide_number}/{total}
            </span>
            <span style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color, fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "2px 8px", letterSpacing: "0.08em" }}>
              {meta.label}
            </span>
          </div>

          {/* Main content area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <p style={{ color: "#FAFAF9", fontSize: "clamp(16px, 4vw, 22px)", fontWeight: 700, lineHeight: 1.35, letterSpacing: "-0.02em", marginBottom: 14, whiteSpace: "pre-line" }}>
              <HighlightedCopy text={slide.main_copy} words={slide.highlight_words} />
            </p>
            <div style={{ width: 28, height: 1, background: "rgba(249,115,22,0.3)", marginBottom: 12 }} />
            <p style={{ color: "rgba(250,250,249,0.45)", fontSize: "clamp(11px, 2.5vw, 13px)", lineHeight: 1.65 }}>
              {slide.support_copy}
            </p>
          </div>

          {/* Bottom: layout note */}
          <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <p style={{ color: "rgba(249,115,22,0.2)", fontSize: 9, letterSpacing: "0.05em", lineHeight: 1.4 }}>
              {slide.layout_note}
            </p>
          </div>
        </div>
      </div>

      {/* Production brief — below the card */}
      <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, overflow: "hidden" }}>
        {/* Always visible: scene + animation prompt */}
        <div style={{ padding: "14px 16px" }}>
          <p style={{ color: "#6B6865", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Scene</p>
          <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>{slide.scene}</p>
          <p style={{ color: "#6B6865", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Motion Background</p>
          <p style={{ color: "#A09D9A", fontSize: 11, lineHeight: 1.6, marginBottom: 12 }}>{slide.motion_background}</p>
          <p style={{ color: "#6B6865", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Animation Prompt</p>
          <p style={{ color: "#A09D9A", fontSize: 11, lineHeight: 1.7, fontStyle: "italic" }}>{slide.animation_prompt}</p>
        </div>

        {/* Expand for camera / lighting / typography */}
        <button
          onClick={() => setDetailExpanded(v => !v)}
          style={{ width: "100%", background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.04)", border: "none", borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: "rgba(255,255,255,0.04)", padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
        >
          <span style={{ color: "#3E3B37", fontSize: 9, fontWeight: 600, letterSpacing: "0.06em" }}>
            {detailExpanded ? "↑ Less" : "↓ Camera · Lighting · Typography"}
          </span>
        </button>

        {detailExpanded && (
          <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 9 }}>
            <SceneRow label="Camera" value={slide.camera} />
            <SceneRow label="Lighting" value={slide.lighting} />
            <SceneRow label="Typography" value={slide.typography_note} />
            <SceneRow label="Negative Prompt" value={slide.negative_prompt.join(" · ")} dim />
          </div>
        )}
      </div>
    </div>
  );
}

function SceneRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div>
      <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{label}</p>
      <p style={{ color: dim ? "#52504E" : "#6B6865", fontSize: 11, lineHeight: 1.5 }}>{value}</p>
    </div>
  );
}

// ── Quality Gate ───────────────────────────────────────────────────────────────

function QualityScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 9 ? "#4ade80" : score >= 7 ? "#FB923C" : "#f87171";
  const bg = score >= 9 ? "rgba(34,197,94,0.08)" : score >= 7 ? "rgba(251,146,60,0.08)" : "rgba(239,68,68,0.08)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <div style={{ width: 140, flexShrink: 0 }}>
        <p style={{ color: "#52504E", fontSize: 10, fontWeight: 500 }}>{label}</p>
      </div>
      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${score * 10}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.3s" }} />
      </div>
      <div style={{ width: 30, textAlign: "right", background: bg, borderRadius: 4, padding: "1px 6px" }}>
        <span style={{ color, fontSize: 11, fontWeight: 700 }}>{score}</span>
      </div>
    </div>
  );
}

function QualityGateBlock({ score }: { score: CarouselQualityScore }) {
  const passColor = score.publish_ready ? "#4ade80" : "#FB923C";
  const passBg = score.publish_ready ? "rgba(34,197,94,0.06)" : "rgba(251,146,60,0.06)";
  const passBorder = score.publish_ready ? "rgba(34,197,94,0.15)" : "rgba(251,146,60,0.15)";

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>Quality Gate</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: passBg, border: `1px solid ${passBorder}`, borderRadius: 6, padding: "3px 10px", color: passColor, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>
            {score.publish_ready ? "✓ PUBLISH READY" : "NEEDS REVISION"}
          </span>
          <span style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "3px 10px", color: score.overall_score >= 9 ? "#4ade80" : "#FB923C", fontSize: 11, fontWeight: 700 }}>
            {score.overall_score}/10
          </span>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
        <QualityScoreBar score={score.topic_direction_score} label="Topic Direction" />
        <QualityScoreBar score={score.narrative_score} label="Narrative Arc" />
        <QualityScoreBar score={score.yusheng_voice_score} label="Yusheng Voice" />
        <QualityScoreBar score={score.pain_precision_score} label="Pain Precision" />
        <QualityScoreBar score={score.visual_executability_score} label="Visual Exec." />
        <QualityScoreBar score={score.publish_readiness_score} label="Publish Ready" />
      </div>

      {score.failing_reasons.length > 0 && (
        <div style={{ background: "rgba(251,146,60,0.04)", border: "1px solid rgba(251,146,60,0.1)", borderRadius: 10, padding: "12px 16px", marginBottom: 10 }}>
          <p style={{ color: "#FB923C", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Failing Reasons</p>
          {score.failing_reasons.map((reason, i) => (
            <p key={i} style={{ color: "#A09D9A", fontSize: 12, lineHeight: 1.55, marginBottom: 4 }}>· {reason}</p>
          ))}
        </div>
      )}

      {score.revised_direction && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 16px" }}>
          <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Revision Direction</p>
          <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.6 }}>{score.revised_direction}</p>
        </div>
      )}
    </div>
  );
}

// ── Carousel preview view ──────────────────────────────────────────────────────

function CarouselPreviewView({
  result,
  candidateIndex,
  carouselSource,
  onBack,
}: {
  result: CarouselResult;
  candidateIndex: number;
  carouselSource: string;
  onBack: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#0C0A08", padding: "40px 16px 80px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Back */}
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 28 }}
        >
          <span style={{ color: "#52504E", fontSize: 12, fontWeight: 500 }}>← Back to Topics</span>
        </button>

        {/* Instagram not connected */}
        <div style={{ background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.14)", borderRadius: 10, padding: "12px 16px", marginBottom: 28, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FB923C", opacity: 0.7, marginTop: 4, flexShrink: 0 }} />
          <div>
            <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>Instagram is not connected yet. This is a manual launch pack.</p>
            <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.5 }}>Phoenix has not posted this to Instagram. No data was written to production. Follow the checklist below to post manually.</p>
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.12)", borderRadius: 6, padding: "3px 10px", color: "#F97316", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Candidate #{candidateIndex + 1} → Carousel
            </span>
            <span style={{
              background: carouselSource === "curated" ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${carouselSource === "curated" ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 6, padding: "3px 10px",
              color: carouselSource === "curated" ? "#4ade80" : "#3E3B37",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.06em"
            }}>
              {carouselSource === "curated" ? "CURATED · 9/10" : "openai"}
            </span>
            <span style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "3px 10px", color: "#3E3B37", fontSize: 9, fontWeight: 600, letterSpacing: "0.06em" }}>
              writes: false
            </span>
          </div>
          <h1 style={{ color: "#FAFAF9", fontSize: 21, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.25, marginBottom: 8 }}>
            {result.topic}
          </h1>
          <p style={{ color: "#6B6865", fontSize: 12, lineHeight: 1.6 }}>{result.angle}</p>
        </div>

        {/* Editorial Thesis */}
        {result.editorial_thesis && (
          <div style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.1)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <p style={{ color: "#F97316", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, opacity: 0.8 }}>Editorial Thesis</p>
            <p style={{ color: "#FAFAF9", fontSize: 13, lineHeight: 1.65, fontWeight: 500 }}>{result.editorial_thesis}</p>
          </div>
        )}

        {/* Quality Gate */}
        {result.quality_score && (
          <>
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 24 }} />
            <QualityGateBlock score={result.quality_score} />
          </>
        )}

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 28 }} />

        {/* Publish-Ready Preview */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
            <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>
              Publish-Ready Preview
            </p>
            <p style={{ color: "#3E3B37", fontSize: 11 }}>8 slides · 4:5 IG portrait</p>
          </div>

          {result.slides.map((slide) => (
            <SlideCard key={slide.slide_number} slide={slide} total={result.slides.length} />
          ))}
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 28 }} />

        {/* Caption */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>Caption</p>
            <p style={{ color: "#3E3B37", fontSize: 11 }}>{result.caption.length} chars</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 18px" }}>
            <p style={{ color: "#A09D9A", fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{result.caption}</p>
          </div>
        </div>

        {/* Hashtags */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 12 }}>Hashtags</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.hashtags.map((tag) => {
              const text = tag.startsWith("#") ? tag : `#${tag}`;
              const isPrimary = ["#保險新人", "#保險業務", "#保險增員", "#業務成長", "#小佑老師"].includes(text);
              return (
                <span key={tag} style={{ background: isPrimary ? "rgba(249,115,22,0.07)" : "rgba(255,255,255,0.03)", border: isPrimary ? "1px solid rgba(249,115,22,0.14)" : "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "4px 12px", color: isPrimary ? "#FB923C" : "#6B6865", fontSize: 11 }}>
                  {text}
                </span>
              );
            })}
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 28 }} />

        {/* Manual Launch Checklist */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 4 }}>Manual IG Launch Checklist</p>
          <p style={{ color: "#3E3B37", fontSize: 11, marginBottom: 14 }}>Instagram is not connected — post manually using this checklist.</p>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, overflow: "hidden" }}>
            {result.manual_launch_checklist.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 18px", borderBottom: i < result.manual_launch_checklist.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i === 0 ? "rgba(251,146,60,0.03)" : "transparent" }}>
                <span style={{ color: i === 0 ? "#FB923C" : "#3E3B37", fontSize: 10, fontWeight: 700, fontFamily: "monospace", flexShrink: 0, marginTop: 1 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p style={{ color: i === 0 ? "#A09D9A" : "#6B6865", fontSize: 12, lineHeight: 1.55 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#252220", fontSize: 11, lineHeight: 1.6 }}>
            Carousel generated from topic candidate — no writes to production.
            <br />
            Instagram is not connected. Post manually using the checklist above.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Topic Intelligence components ─────────────────────────────────────────────

function SignalChip({ signal }: { signal: PhoenixSignal }) {
  const labelMap: Record<string, string> = {
    past_yusheng_theme_signal: "Past Themes",
    market_resonance_signal: "Market Tension",
    brand_positioning_signal: "Brand Positioning",
  };
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px" }}>
      <p style={{ color: "#52504E", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
        {labelMap[signal.signal] ?? signal.signal}
      </p>
      <p style={{ color: "#8C8784", fontSize: 11, lineHeight: 1.55 }}>{signal.value}</p>
    </div>
  );
}

function PhoenixAnalysisBlock({
  analysis,
  source,
  market_source,
  environment,
}: {
  analysis: PhoenixAnalysis;
  source: string;
  market_source: string;
  environment?: string;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>Phoenix Analysis</p>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "2px 8px", color: "#3E3B37", fontSize: 9, fontWeight: 600, letterSpacing: "0.06em" }}>
            {source}
          </span>
          {environment && (
            <span style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.12)", borderRadius: 6, padding: "2px 8px", color: "#FB923C", fontSize: 9, fontWeight: 600, letterSpacing: "0.06em" }}>
              {environment}
            </span>
          )}
        </div>
      </div>

      <div style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.1)", borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
        <p style={{ color: "#F97316", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, opacity: 0.8 }}>
          Today&apos;s Content Thesis
        </p>
        <p style={{ color: "#FAFAF9", fontSize: 13, lineHeight: 1.65, fontWeight: 500 }}>
          {analysis.content_thesis}
        </p>
      </div>

      {analysis.signals_used.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Signals Used
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analysis.signals_used.map((s) => (
              <SignalChip key={s.signal} signal={s} />
            ))}
          </div>
        </div>
      )}

      {analysis.why_these_five && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            Why These 5
          </p>
          <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.65 }}>{analysis.why_these_five}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, padding: "3px 10px", color: "#3E3B37", fontSize: 9, fontWeight: 600, letterSpacing: "0.06em" }}>
          market_source: {market_source}
        </span>
        <span style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, padding: "3px 10px", color: "#3E3B37", fontSize: 9, fontWeight: 600, letterSpacing: "0.06em" }}>
          live_web: not connected
        </span>
      </div>
    </div>
  );
}

function LaunchRecommendationBlock({ rec, candidates }: { rec: LaunchRecommendation; candidates: TopicCandidate[] }) {
  const recommendedTopic = candidates[rec.recommended_index]?.topic ?? "—";
  return (
    <div style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: 14, padding: "20px 22px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
        <p style={{ color: "#4ade80", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Launch Mode · Recommended Topic</p>
      </div>
      <h2 style={{ color: "#FAFAF9", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.3, marginBottom: 12 }}>
        #{rec.recommended_index + 1} · {recommendedTopic}
      </h2>
      <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.08)", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
        <p style={{ color: "#6B6865", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Why This Wins</p>
        <p style={{ color: "#A09D9A", fontSize: 12, lineHeight: 1.6 }}>{rec.why_this_wins}</p>
      </div>
      {rec.why_others_lost.length > 0 && (
        <div>
          <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Why Others Lost</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {rec.why_others_lost.map((reason, i) => (
              <p key={i} style={{ color: "#52504E", fontSize: 11, lineHeight: 1.5 }}>· {reason}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CandidateCard({
  candidate,
  index,
  onSelect,
  onGenerateCarousel,
  isGenerating,
  generateError,
  isRecommended,
}: {
  candidate: TopicCandidate;
  index: number;
  onSelect: (topic: string) => void;
  onGenerateCarousel: (candidate: TopicCandidate, index: number) => void;
  isGenerating: boolean;
  generateError?: string;
  isRecommended?: boolean;
}) {
  const [sceneExpanded, setSceneExpanded] = useState(false);
  const [selected, setSelected] = useState(false);

  function handleSelect() {
    setSelected(true);
    onSelect(candidate.topic);
    setTimeout(() => setSelected(false), 2000);
  }

  return (
    <div style={{
      background: isRecommended ? "rgba(34,197,94,0.03)" : "rgba(255,255,255,0.02)",
      border: isGenerating ? "1px solid rgba(249,115,22,0.2)" : isRecommended ? "1px solid rgba(34,197,94,0.12)" : "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: "24px 24px 20px",
      marginBottom: 16,
      transition: "border-color 0.2s",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#3E3B37", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>#{index + 1}</span>
          {isRecommended && (
            <span style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)", borderRadius: 6, padding: "2px 8px", color: "#4ade80", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em" }}>
              RECOMMENDED
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <RiskBadge level={candidate.risk_level} />
          <span style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.1)", borderRadius: 20, padding: "3px 10px", color: "#F97316", fontSize: 10 }}>
            ⚡ {candidate.emotional_trigger}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h3 style={{ color: "#FAFAF9", fontSize: 19, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.25, marginBottom: 10 }}>
          {candidate.topic}
        </h3>
        <p style={{ color: "#FB923C", fontSize: 13, fontStyle: "italic", lineHeight: 1.55, opacity: 0.9 }}>
          {candidate.hook}
        </p>
      </div>

      {/* Editorial Thesis + Market Tension */}
      {(candidate.editorial_thesis || candidate.market_tension) && (
        <>
          <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 14 }} />
          {candidate.editorial_thesis && (
            <div style={{ marginBottom: 12, background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.08)", borderRadius: 10, padding: "12px 14px" }}>
              <SectionLabel>Editorial Thesis</SectionLabel>
              <p style={{ color: "#FAFAF9", fontSize: 12, lineHeight: 1.65, fontWeight: 500 }}>{candidate.editorial_thesis}</p>
            </div>
          )}
          {candidate.market_tension && (
            <div style={{ marginBottom: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px" }}>
              <SectionLabel>Market Tension</SectionLabel>
              <p style={{ color: "#A09D9A", fontSize: 12, lineHeight: 1.6 }}>{candidate.market_tension}</p>
            </div>
          )}
        </>
      )}

      {/* Why Yusheng */}
      {candidate.why_yusheng && (
        <div style={{ marginBottom: 14, background: "rgba(249,115,22,0.03)", border: "1px solid rgba(249,115,22,0.07)", borderRadius: 10, padding: "12px 14px" }}>
          <SectionLabel>Why This Sounds Like 小佑</SectionLabel>
          <p style={{ color: "#A09D9A", fontSize: 12, lineHeight: 1.6 }}>{candidate.why_yusheng}</p>
        </div>
      )}

      {/* Core angle + market resonates */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 14 }} />
      <div style={{ marginBottom: 14 }}>
        <SectionLabel>Core Angle</SectionLabel>
        <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.6 }}>{candidate.core_angle}</p>
      </div>

      {/* Audience */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {(candidate.audience_hit ?? candidate.target_audience).map((a) => (
          <span key={a} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "3px 10px", color: "#6B6865", fontSize: 10 }}>
            {a}
          </span>
        ))}
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 16 }} />

      {/* Visual Scene */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <SectionLabel>Visual Scene Direction</SectionLabel>
          <span style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "2px 8px", color: "#52504E", fontSize: 9, fontWeight: 600, letterSpacing: "0.06em" }}>
            {candidate.visual_scene_direction.scene_type}
          </span>
        </div>
        <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
          <p style={{ color: "#6B6865", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Scene</p>
          <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.6 }}>{candidate.visual_scene_direction.people_scene}</p>
        </div>
        <div style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
          <p style={{ color: "#6B6865", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Atmosphere</p>
          <p style={{ color: "#6B6865", fontSize: 11, lineHeight: 1.55 }}>{candidate.visual_scene_direction.emotional_atmosphere}</p>
        </div>
        <button
          onClick={() => setSceneExpanded(v => !v)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
        >
          <span style={{ color: "#3E3B37", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em" }}>
            {sceneExpanded ? "↑ Less detail" : "↓ Full scene brief"}
          </span>
        </button>
        {sceneExpanded && (
          <div style={{ marginTop: 8, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <SceneRow label="Overall Style" value={candidate.visual_scene_direction.overall_style} />
            <SceneRow label="Camera" value={candidate.visual_scene_direction.camera_movement} />
            <SceneRow label="Motion BG" value={candidate.visual_scene_direction.motion_background} />
            <SceneRow label="Typography" value={candidate.visual_scene_direction.typography_mood} />
            <SceneRow label="Not Allowed" value={candidate.visual_scene_direction.not_allowed.join(" · ")} dim />
          </div>
        )}
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 16 }} />

      <div style={{ marginBottom: 14 }}>
        <SectionLabel>First Slide Opening</SectionLabel>
        <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.6 }}>{candidate.first_slide_direction}</p>
      </div>

      <div style={{ marginBottom: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px" }}>
        <SectionLabel>Comment Prompt</SectionLabel>
        <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.55, fontStyle: "italic" }}>&ldquo;{candidate.comment_prompt}&rdquo;</p>
      </div>

      <div style={{ marginBottom: 14, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
        <SectionLabel>Risk Note</SectionLabel>
        <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.5 }}>{candidate.risk_reason}</p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 0", marginBottom: 16, borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <ScorePill value={candidate.shareability_score} label="Share" />
        <ScorePill value={candidate.saveability_score} label="Save" />
        <ScorePill value={candidate.brand_fit_score} label="Brand" />
      </div>

      {generateError && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
          <p style={{ color: "#f87171", fontSize: 11, lineHeight: 1.5 }}>{generateError}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSelect}
          style={{ flex: 1, height: 40, borderRadius: 10, background: selected ? "rgba(34,197,94,0.08)" : "rgba(249,115,22,0.07)", color: selected ? "#4ade80" : "#FB923C", border: selected ? "1px solid rgba(34,197,94,0.15)" : "1px solid rgba(249,115,22,0.12)", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}
        >
          {selected ? "✓ Noted" : "Select for Today"}
        </button>
        <button
          onClick={() => onGenerateCarousel(candidate, index)}
          disabled={isGenerating}
          style={{ flex: 1, height: 40, borderRadius: 10, background: isGenerating ? "rgba(249,115,22,0.04)" : "#FAFAF9", color: isGenerating ? "#52504E" : "#0C0A08", border: isGenerating ? "1px solid rgba(255,255,255,0.06)" : "none", fontSize: 12, fontWeight: 700, cursor: isGenerating ? "not-allowed" : "pointer", transition: "all 0.2s" }}
        >
          {isGenerating ? "Generating..." : "Generate Carousel ↗"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function TopicIntelligencePage() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntelligenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
  const [generateErrors, setGenerateErrors] = useState<Record<number, string>>({});
  const [carouselView, setCarouselView] = useState<{ candidateIndex: number; result: CarouselResult; source: string } | null>(null);

  async function handleGenerate() {
    if (!secret.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setSelectedTopic(null);
    setCarouselView(null);
    setGenerateErrors({});

    try {
      const res = await fetch("/api/debug/topic-intelligence", {
        method: "POST",
        headers: { "x-internal-debug-secret": secret },
      });
      const data = await res.json() as IntelligenceResult;
      if (!res.ok || !data.ok) {
        setError(data.message ?? `Error ${res.status}`);
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateCarousel(candidate: TopicCandidate, idx: number) {
    if (!secret.trim()) return;
    setGeneratingIdx(idx);
    setGenerateErrors(prev => { const n = { ...prev }; delete n[idx]; return n; });

    try {
      const res = await fetch("/api/debug/generate-carousel-from-candidate", {
        method: "POST",
        headers: {
          "x-internal-debug-secret": secret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ candidate }),
      });
      const data = await res.json() as { ok: boolean; carousel?: CarouselResult; source?: string; message?: string };
      if (!res.ok || !data.ok) {
        setGenerateErrors(prev => ({ ...prev, [idx]: data.message ?? `Error ${res.status}` }));
      } else if (data.carousel) {
        setCarouselView({ candidateIndex: idx, result: data.carousel, source: data.source ?? "openai" });
      }
    } catch {
      setGenerateErrors(prev => ({ ...prev, [idx]: "Network error generating carousel." }));
    } finally {
      setGeneratingIdx(null);
    }
  }

  if (carouselView) {
    return (
      <CarouselPreviewView
        result={carouselView.result}
        candidateIndex={carouselView.candidateIndex}
        carouselSource={carouselView.source}
        onBack={() => setCarouselView(null)}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0C0A08", padding: "40px 16px 80px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.12)", borderRadius: 8, padding: "4px 12px", marginBottom: 16 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#F97316", opacity: 0.7 }} />
            <span style={{ color: "#F97316", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Creative Director · Debug Only</span>
          </div>
          <h1 style={{ color: "#FAFAF9", fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 10 }}>
            Topic Intelligence
          </h1>
          <p style={{ color: "#52504E", fontSize: 13, lineHeight: 1.65 }}>
            Phoenix Creative Director analyzes brand DNA, market tensions, and voice fit — then generates 5 candidates with editorial thesis, recommended launch pick, and publish-ready carousel preview.
          </p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px", marginBottom: 28 }}>
          <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Internal Debug Secret
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
              placeholder="INTERNAL_DEBUG_SECRET"
              style={{ flex: 1, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#FAFAF9", fontSize: 13, padding: "0 14px", outline: "none", fontFamily: "monospace" }}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !secret.trim()}
              style={{ height: 40, paddingLeft: 20, paddingRight: 20, borderRadius: 10, background: loading || !secret.trim() ? "rgba(249,115,22,0.04)" : "#FAFAF9", color: loading || !secret.trim() ? "#52504E" : "#0C0A08", fontSize: 13, fontWeight: 700, border: "none", cursor: loading || !secret.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}
            >
              {loading ? "Analyzing..." : "Generate 5 Candidates"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>
          </div>
        )}

        {result && (
          <>
            {selectedTopic && (
              <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: 10, padding: "10px 16px", marginBottom: 20 }}>
                <p style={{ color: "#4ade80", fontSize: 12 }}>Selected: {selectedTopic}</p>
              </div>
            )}

            <PhoenixAnalysisBlock
              analysis={result.analysis}
              source={result.source}
              market_source={result.market_source}
              environment={result.environment}
            />

            {/* Launch Mode Recommendation */}
            {result.launch_recommendation && (
              <LaunchRecommendationBlock
                rec={result.launch_recommendation}
                candidates={result.candidates}
              />
            )}

            <div style={{ marginBottom: 16 }}>
              <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>5 Topic Candidates</p>
              <p style={{ color: "#3E3B37", fontSize: 11, marginTop: 3 }}>
                Click &ldquo;Generate Carousel&rdquo; on any candidate to build a publish-ready 8-slide preview.
              </p>
            </div>

            {result.candidates.map((candidate, i) => (
              <CandidateCard
                key={i}
                candidate={candidate}
                index={i}
                onSelect={setSelectedTopic}
                onGenerateCarousel={handleGenerateCarousel}
                isGenerating={generatingIdx === i}
                generateError={generateErrors[i]}
                isRecommended={
                  candidate.is_recommended === true ||
                  (result.launch_recommendation?.recommended_index === i)
                }
              />
            ))}
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <p style={{ color: "#252220", fontSize: 11, lineHeight: 1.6 }}>
            Creative Director · Internal review only. Not linked from main navigation.
            <br />
            Market context source: strategy_model · Live web data: not connected.
          </p>
        </div>
      </div>
    </div>
  );
}
