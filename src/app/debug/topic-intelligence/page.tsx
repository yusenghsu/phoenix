"use client";

import { useState } from "react";

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

interface IntelligenceResult {
  ok: boolean;
  source: string;
  market_source: string;
  analysis_note: string;
  analysis: PhoenixAnalysis;
  candidates: TopicCandidate[];
  environment?: string;
  message?: string;
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

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>
      {children}
    </p>
  );
}

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

function CandidateCard({ candidate, index, onSelect }: { candidate: TopicCandidate; index: number; onSelect: (topic: string) => void }) {
  const [sceneExpanded, setSceneExpanded] = useState(false);
  const [selected, setSelected] = useState(false);

  function handleSelect() {
    setSelected(true);
    onSelect(candidate.topic);
    setTimeout(() => setSelected(false), 2000);
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "24px 24px 20px",
        marginBottom: 16,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <span style={{ color: "#3E3B37", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          #{index + 1}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <RiskBadge level={candidate.risk_level} />
          <span style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.1)", borderRadius: 20, padding: "3px 10px", color: "#F97316", fontSize: 10 }}>
            ⚡ {candidate.emotional_trigger}
          </span>
        </div>
      </div>

      {/* Topic + Hook */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ color: "#FAFAF9", fontSize: 19, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.25, marginBottom: 10 }}>
          {candidate.topic}
        </h3>
        <p style={{ color: "#FB923C", fontSize: 13, fontStyle: "italic", lineHeight: 1.55, opacity: 0.9 }}>
          {candidate.hook}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 16 }} />

      {/* Core Angle */}
      <div style={{ marginBottom: 14 }}>
        <SectionLabel>Core Angle</SectionLabel>
        <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.6 }}>{candidate.core_angle}</p>
      </div>

      {/* Yusheng Voice Fit */}
      <div style={{ marginBottom: 14, background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.08)", borderRadius: 10, padding: "12px 14px" }}>
        <SectionLabel>Why This Sounds Like 小佑</SectionLabel>
        <p style={{ color: "#A09D9A", fontSize: 12, lineHeight: 1.6 }}>{candidate.yusheng_voice_fit}</p>
      </div>

      {/* Why blocks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px" }}>
          <SectionLabel>Why Yusheng&apos;s Brand</SectionLabel>
          <p style={{ color: "#A09D9A", fontSize: 11, lineHeight: 1.55 }}>{candidate.why_for_yusheng}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px" }}>
          <SectionLabel>Market Tension</SectionLabel>
          <p style={{ color: "#A09D9A", fontSize: 11, lineHeight: 1.55 }}>{candidate.why_market_resonates}</p>
        </div>
      </div>

      {/* Audience tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {candidate.target_audience.map((a) => (
          <span key={a} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "3px 10px", color: "#6B6865", fontSize: 10 }}>
            {a}
          </span>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 16 }} />

      {/* Visual Scene — always visible summary, expandable detail */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <SectionLabel>Visual Scene Direction</SectionLabel>
          <span style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "2px 8px", color: "#52504E", fontSize: 9, fontWeight: 600, letterSpacing: "0.06em" }}>
            {candidate.visual_scene_direction.scene_type}
          </span>
        </div>
        {/* Always visible: people scene */}
        <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
          <p style={{ color: "#6B6865", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Scene</p>
          <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.6 }}>{candidate.visual_scene_direction.people_scene}</p>
        </div>
        <div style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
          <p style={{ color: "#6B6865", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Atmosphere</p>
          <p style={{ color: "#6B6865", fontSize: 11, lineHeight: 1.55 }}>{candidate.visual_scene_direction.emotional_atmosphere}</p>
        </div>
        {/* Expand for full detail */}
        <button
          onClick={() => setSceneExpanded((v) => !v)}
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

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 16 }} />

      {/* First Slide Direction */}
      <div style={{ marginBottom: 14 }}>
        <SectionLabel>First Slide Opening</SectionLabel>
        <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.6 }}>{candidate.first_slide_direction}</p>
      </div>

      {/* Comment Prompt */}
      <div style={{ marginBottom: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px" }}>
        <SectionLabel>Comment Prompt</SectionLabel>
        <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.55, fontStyle: "italic" }}>&ldquo;{candidate.comment_prompt}&rdquo;</p>
      </div>

      {/* Risk note */}
      <div style={{ marginBottom: 14, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
        <SectionLabel>Risk Note</SectionLabel>
        <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.5 }}>{candidate.risk_reason}</p>
      </div>

      {/* Scores — bottom, less dominant */}
      <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 0", marginBottom: 16, borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <ScorePill value={candidate.shareability_score} label="Share" />
        <ScorePill value={candidate.saveability_score} label="Save" />
        <ScorePill value={candidate.brand_fit_score} label="Brand" />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSelect}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 10,
              background: selected ? "rgba(34,197,94,0.08)" : "rgba(249,115,22,0.07)",
              color: selected ? "#4ade80" : "#FB923C",
              border: selected ? "1px solid rgba(34,197,94,0.15)" : "1px solid rgba(249,115,22,0.12)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {selected ? "✓ Noted for today" : "Select for Today"}
          </button>
          <button
            style={{
              flex: 1,
              height: 38,
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              color: "#3E3B37",
              border: "1px solid rgba(255,255,255,0.05)",
              fontSize: 12,
              fontWeight: 400,
              cursor: "not-allowed",
            }}
            disabled
          >
            Generate Carousel ↗
          </button>
        </div>
        <p style={{ color: "#2E2C2A", fontSize: 10, textAlign: "right", lineHeight: 1.4 }}>
          Carousel generation from candidate is not connected yet.
        </p>
      </div>
    </div>
  );
}

function SceneRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div>
      <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{label}</p>
      <p style={{ color: dim ? "#52504E" : "#8C8784", fontSize: 11, lineHeight: 1.55 }}>{value}</p>
    </div>
  );
}

function PhoenixAnalysisBlock({ analysis, source, market_source, environment }: {
  analysis: PhoenixAnalysis;
  source: string;
  market_source: string;
  environment?: string;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header */}
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

      {/* Content Thesis */}
      <div style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.1)", borderRadius: 12, padding: "16px 18px", marginBottom: 12 }}>
        <p style={{ color: "#F97316", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, opacity: 0.8 }}>
          Today&apos;s Content Thesis
        </p>
        <p style={{ color: "#FAFAF9", fontSize: 13, lineHeight: 1.65, fontWeight: 500 }}>
          {analysis.content_thesis}
        </p>
      </div>

      {/* Signals Used */}
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

      {/* Why These 5 */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
        <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
          Why These 5
        </p>
        <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.65 }}>{analysis.why_these_five}</p>
      </div>

      {/* Market Source disclosure */}
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

export default function TopicIntelligencePage() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntelligenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  async function handleGenerate() {
    if (!secret.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setSelectedTopic(null);

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

  return (
    <div style={{ minHeight: "100vh", background: "#0C0A08", padding: "40px 16px 80px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.12)", borderRadius: 8, padding: "4px 12px", marginBottom: 16 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#F97316", opacity: 0.7 }} />
            <span style={{ color: "#F97316", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Internal · Debug Only</span>
          </div>
          <h1 style={{ color: "#FAFAF9", fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 10 }}>
            Topic Intelligence
          </h1>
          <p style={{ color: "#52504E", fontSize: 13, lineHeight: 1.65 }}>
            Phoenix cross-references your brand DNA, past winning themes, and market resonance signals — then generates 5 topic candidates. Phoenix decides first. You approve.
          </p>
        </div>

        {/* Auth + Generate */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14,
            padding: "20px",
            marginBottom: 28,
          }}
        >
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
              style={{
                flex: 1,
                height: 40,
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#FAFAF9",
                fontSize: 13,
                padding: "0 14px",
                outline: "none",
                fontFamily: "monospace",
              }}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !secret.trim()}
              style={{
                height: 40,
                paddingLeft: 20,
                paddingRight: 20,
                borderRadius: 10,
                background: loading || !secret.trim() ? "rgba(249,115,22,0.04)" : "#FAFAF9",
                color: loading || !secret.trim() ? "#52504E" : "#0C0A08",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                cursor: loading || !secret.trim() ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Analyzing..." : "Generate 5 Candidates"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <p style={{ color: "#f87171", fontSize: 13 }}>{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Selected topic banner */}
            {selectedTopic && (
              <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: 10, padding: "10px 16px", marginBottom: 20 }}>
                <p style={{ color: "#4ade80", fontSize: 12 }}>Selected: {selectedTopic}</p>
              </div>
            )}

            {/* Phoenix Analysis Block */}
            <PhoenixAnalysisBlock
              analysis={result.analysis}
              source={result.source}
              market_source={result.market_source}
              environment={result.environment}
            />

            {/* Candidates header */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>
                5 Topic Candidates
              </p>
            </div>

            {/* Candidate cards */}
            {result.candidates.map((candidate, i) => (
              <CandidateCard
                key={i}
                candidate={candidate}
                index={i}
                onSelect={setSelectedTopic}
              />
            ))}
          </>
        )}

        {/* Footer note */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <p style={{ color: "#252220", fontSize: 11, lineHeight: 1.6 }}>
            This page is for internal review only. Not linked from main navigation.
            <br />
            Market context source: strategy_model · Live web data: not connected.
          </p>
        </div>

      </div>
    </div>
  );
}
