"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  FINAL_LAUNCH_PACK,
  type LaunchSlide,
  type QualityDimension,
  type QualityGateResult,
  type MotionGateResult,
} from "@/lib/launch/final-launch-pack";
import { PROVIDER_OPTIONS } from "@/lib/launch/motion-provider";
import {
  PROVIDER_CAPABILITIES,
  type RatioStatus,
  validateVideoRatio,
} from "@/lib/launch/provider-capability";
import {
  CANVA_MOTION_PACK,
  buildAllPromptsText,
  buildSlidePromptText,
  buildTemplateSpecText,
} from "@/lib/launch/canva-motion-pack";
import LaunchSlideComposer from "@/components/launch/LaunchSlideComposer";
import EditorialSlideArtboard, {
  type LocalSlideState,
  type SlideTypographyControls,
} from "@/components/launch/EditorialSlideArtboard";
import FinalArtworkComposer, {
  type SlideArtworkState,
} from "@/components/launch/FinalArtworkComposer";
import MotionSlidePreview from "@/components/launch/MotionSlidePreview";

// ── Constants ─────────────────────────────────────────────────────────────────

// Slide 1 first-frame motion pipeline — prompts tuned for Runway image-to-video input
const SLIDE1_KEYFRAME_PROMPT =
  "realistic cinematic vertical 4:5 image, 1080x1350 composition, Taiwan urban night street, " +
  "a young Taiwanese insurance salesperson standing on the far right side looking down at an unsent phone message, " +
  "hesitant and lonely, warm low-key orange street lighting, shallow depth of field, " +
  "soft city lights and passing car lights in the background, subtle phone glow on the face, " +
  "clean dark negative space on the left side for Chinese text overlay, documentary realism, " +
  "premium dark orange mood, not a fashion ad, not corporate stock photo, " +
  "no readable text, no logos, no cartoon, no anime, no exaggerated facial expression";

const SLIDE1_KEYFRAME_NEGATIVE =
  "text, readable signs, logos, watermark, cartoon, anime, orange suit, luxury fashion look, " +
  "influencer style, overbright lighting, distorted hands, extra fingers, fake advertising style, stock photo look";

const ROLE_META: Record<string, { color: string; bg: string; border: string }> = {
  HOOK:       { color: "#FB923C", bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.22)" },
  PAIN:       { color: "#f87171", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.18)" },
  TRUTH:      { color: "#facc15", bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.18)" },
  REFRAME:    { color: "#4ade80", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.18)" },
  "小佑 POV": { color: "#a78bfa", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.18)" },
  METHOD:     { color: "#2dd4bf", bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.18)" },
  ACTION:     { color: "#60a5fa", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.18)" },
  CTA:        { color: "#FAFAF9", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)" },
};

function emptyArtwork(): SlideArtworkState {
  return { background_status: "missing", composition_status: "missing", final_artwork_status: "missing" };
}

function defaultControls(slide: LaunchSlide): SlideTypographyControls {
  return {
    template: slide.typography.template,
    x_offset: 0, y_offset: 0, text_width: 55,
    main_scale: 1.0, support_scale: 1.0,
    overlay_mask: slide.typography.overlay_mask,
    mask_strength: 65, text_color_mode: "white",
    emphasis_style: "orange", footer_visible: true,
  };
}

// ── Utility components ────────────────────────────────────────────────────────

function HighlightedText({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  let parts: { t: string; hl: boolean }[] = [{ t: text, hl: false }];
  for (const w of words) {
    const next: { t: string; hl: boolean }[] = [];
    for (const p of parts) {
      if (p.hl) { next.push(p); continue; }
      const idx = p.t.indexOf(w);
      if (idx === -1) { next.push(p); continue; }
      if (idx > 0) next.push({ t: p.t.slice(0, idx), hl: false });
      next.push({ t: w, hl: true });
      if (idx + w.length < p.t.length) next.push({ t: p.t.slice(idx + w.length), hl: false });
    }
    parts = next;
  }
  return (
    <>
      {parts.map((p, i) =>
        p.hl ? <span key={i} style={{ color: "#F97316" }}>{p.t}</span>
             : <span key={i}>{p.t}</span>
      )}
    </>
  );
}

function CopyButton({ text, label, small }: { text: string; label: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handle = useCallback(async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [text]);
  return (
    <button onClick={handle} style={{ height: small ? 28 : 34, paddingLeft: small ? 10 : 14, paddingRight: small ? 10 : 14, borderRadius: 7, background: copied ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)", border: copied ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(255,255,255,0.08)", color: copied ? "#4ade80" : "#6B6865", fontSize: small ? 10 : 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
      {copied ? "✓ Copied" : label}
    </button>
  );
}

function RoleBadge({ label }: { label: string }) {
  const m = ROLE_META[label] ?? ROLE_META.CTA;
  return (
    <span style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.color, fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "2px 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
      {label}
    </span>
  );
}

function SlideIndexBadge({ n, total }: { n: number; total: number }) {
  return (
    <span style={{ color: "#3E3B37", fontSize: 10, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.04em" }}>
      {String(n).padStart(2, "0")}/{String(total).padStart(2, "0")}
    </span>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{label}</p>
      <p style={{ color: "#6B6865", fontSize: 11 }}>{value}</p>
    </div>
  );
}

function CollapsibleSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 10 }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", height: 42, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 16, paddingRight: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: open ? "10px 10px 0 0" : 10, color: "#52504E", fontSize: 11, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
        <div>
          <span>{title}</span>
          {subtitle && <span style={{ color: "#252220", fontSize: 9, fontWeight: 400, marginLeft: 8 }}>{subtitle}</span>}
        </div>
        <span style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.06)", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "20px 18px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Motion Provider Status ────────────────────────────────────────────────────

function MotionProviderPanel() {
  const motionProviders = PROVIDER_OPTIONS.filter((p) => p.role === "motion");
  const compositionProviders = PROVIDER_OPTIONS.filter((p) => p.role === "composition");
  return (
    <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.10)", borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171", marginTop: 4, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ color: "#f87171", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
            Motion background provider not connected
          </p>
          <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.65, marginBottom: 14 }}>
            Phoenix needs a <strong style={{ color: "#A09D9A" }}>vertical-capable motion provider</strong> to generate 4:5 background video. Canva AI video generates 16:9 only — it does not satisfy the 4:5 requirement.
          </p>

          {/* Primary motion providers */}
          <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Primary — motion background (4:5 / 9:16 portrait)
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {motionProviders.map((p) => (
              <span key={p.id} style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 6, padding: "3px 10px", color: "#f87171", fontSize: 10 }}>
                {p.label}
              </span>
            ))}
          </div>

          {/* Composition/export providers */}
          <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            Composition / export (needs external video input)
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {compositionProviders.map((p) => (
              <span key={p.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "3px 10px", color: "#3E3B37", fontSize: 10 }}>
                {p.label}
              </span>
            ))}
          </div>

          {/* Fallback note */}
          <div style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.10)", borderRadius: 8, padding: "8px 10px" }}>
            <p style={{ color: "#FB923C", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 3 }}>FALLBACK ONLY</p>
            <p style={{ color: "#52504E", fontSize: 10, lineHeight: 1.55 }}>
              OpenAI 4:5 still image + Canva pan/zoom animation — not true cinematic motion background. Does not satisfy Motion Gate.
            </p>
          </div>

          <p style={{ color: "#252220", fontSize: 10, marginTop: 10 }}>
            Set RUNWAY_API_KEY in .env.local to enable Runway. See docs/canva-motion-workflow.md for the corrected workflow.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Provider Capability Guard ─────────────────────────────────────────────────

function ProviderCapabilityPanel() {
  const boolLabel = (v: boolean | "unknown") =>
    v === "unknown" ? "Unknown" : v ? "Yes" : "No";
  const boolColor = (v: boolean | "unknown") =>
    v === "unknown" ? "#FB923C" : v ? "#4ade80" : "#f87171";

  return (
    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ color: "#A09D9A", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
          Motion Provider Capability Guard
        </p>
        <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.65 }}>
          Final output requirement: <strong style={{ color: "#A09D9A" }}>4:5 · 1080×1350 · MP4</strong>.
          Every provider&apos;s output ratio must be validated after generation.
          No aspect ratio is assumed from input dimensions — not even for image-to-video.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {PROVIDER_CAPABILITIES.map((cap) => (
          <div key={cap.provider} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#FAFAF9", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{cap.provider}</span>
                {cap.supports_native_4_5 === "unknown" && (
                  <span style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.18)", borderRadius: 4, padding: "1px 6px", color: "#FB923C", fontSize: 8, fontWeight: 700 }}>
                    UNVALIDATED
                  </span>
                )}
              </div>
              <span style={{
                background: cap.can_be_primary_provider ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.06)",
                border: `1px solid ${cap.can_be_primary_provider ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.14)"}`,
                borderRadius: 5, padding: "2px 8px",
                color: cap.can_be_primary_provider ? "#4ade80" : "#f87171",
                fontSize: 8, fontWeight: 700, flexShrink: 0,
              }}>
                {cap.can_be_primary_provider ? "PRIMARY APPROVED" : "NOT APPROVED AS PRIMARY"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ color: "#3E3B37", fontSize: 9 }}>
                Native 4:5: <span style={{ color: boolColor(cap.supports_native_4_5) }}>{boolLabel(cap.supports_native_4_5)}</span>
              </span>
              <span style={{ color: "#3E3B37", fontSize: 9 }}>
                9:16: <span style={{ color: boolColor(cap.supports_9_16) }}>{boolLabel(cap.supports_9_16)}</span>
              </span>
              <span style={{ color: "#3E3B37", fontSize: 9 }}>
                Custom res: <span style={{ color: boolColor(cap.supports_custom_resolution) }}>{boolLabel(cap.supports_custom_resolution)}</span>
              </span>
            </div>
            <p style={{ color: "#3E3B37", fontSize: 10, lineHeight: 1.55 }}>{cap.notes}</p>
          </div>
        ))}
      </div>
      <p style={{ color: "#252220", fontSize: 10, marginTop: 10 }}>
        Ratio status is measured via <span style={{ color: "#3E3B37", fontFamily: "monospace" }}>video.videoWidth / video.videoHeight</span> (browser onLoadedMetadata). Passed 4:5 is required before READY FOR REVIEW.
      </p>
    </div>
  );
}

// ── Motion Quality Gate ───────────────────────────────────────────────────────

function MotionDimRow({ dim }: { dim: QualityDimension }) {
  const color = dim.score >= 8 ? "#4ade80" : dim.score >= 5 ? "#FB923C" : "#f87171";
  const bg    = dim.score >= 8 ? "rgba(34,197,94,0.08)" : dim.score >= 5 ? "rgba(251,146,60,0.08)" : "rgba(239,68,68,0.08)";
  const bd    = dim.score >= 8 ? "rgba(34,197,94,0.15)" : dim.score >= 5 ? "rgba(251,146,60,0.15)" : "rgba(239,68,68,0.15)";
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: dim.passed ? "#4ade80" : "#f87171", fontSize: 11 }}>{dim.passed ? "✓" : "✗"}</span>
          <span style={{ color: "#FAFAF9", fontSize: 12, fontWeight: 600 }}>{dim.name}</span>
          {dim.blocking && <span style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 4, padding: "1px 6px", color: "#f87171", fontSize: 8, fontWeight: 700, letterSpacing: "0.06em" }}>BLOCKING</span>}
        </div>
        <span style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 5, padding: "2px 8px", color, fontSize: 11, fontWeight: 700 }}>
          {dim.score}/{dim.max_score}
        </span>
      </div>
      <div style={{ height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", marginBottom: 5 }}>
        <div style={{ width: `${(dim.score / dim.max_score) * 100}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <p style={{ color: "#6B6865", fontSize: 11, lineHeight: 1.55 }}>{dim.reason}</p>
    </div>
  );
}

function MotionQualityGatePanel({
  gate,
  humanApproved,
  onMarkApproved,
}: {
  gate: MotionGateResult;
  humanApproved: boolean;
  onMarkApproved: () => void;
}) {
  const motionNotReady = !gate.motion_ready;
  const statusColor = gate.motion_ready ? "#4ade80" : "#f87171";
  const statusBg = gate.motion_ready ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)";
  const statusBd = gate.motion_ready ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)";

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div>
          <p style={{ color: "#FAFAF9", fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Motion Gate</p>
          <p style={{ color: "#3E3B37", fontSize: 11, marginTop: 2 }}>Motion-first · 無 video = 0 · 靜態圖不提高 motion 分數</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
          <div style={{ background: statusBg, border: `1px solid ${statusBd}`, borderRadius: 8, padding: "6px 12px" }}>
            <p style={{ color: "#3E3B37", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 3 }}>MOTION PIPELINE STATUS</p>
            <p style={{ color: statusColor, fontSize: 10, fontWeight: 700 }}>
              {gate.motion_ready
                ? "READY FOR HUMAN REVIEW"
                : motionNotReady
                ? "MOTION NOT READY"
                : "MOTION NOT READY"}
            </p>
          </div>
          <p style={{ color: gate.overall_score >= 7 ? "#FB923C" : "#f87171", fontSize: 14, fontWeight: 700 }}>
            {gate.overall_score}/10
          </p>
        </div>
      </div>

      {gate.motion_ready && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={onMarkApproved} style={{ width: "100%", height: 44, borderRadius: 12, background: humanApproved ? "rgba(34,197,94,0.08)" : "rgba(249,115,22,0.06)", border: `1px solid ${humanApproved ? "rgba(34,197,94,0.22)" : "rgba(249,115,22,0.18)"}`, color: humanApproved ? "#4ade80" : "#FB923C", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" }}>
            {humanApproved ? "✓ APPROVED FOR MANUAL POST" : "MARK AS APPROVED FOR MANUAL POST"}
          </button>
          {humanApproved && <p style={{ color: "#252220", fontSize: 10, textAlign: "center", marginTop: 6 }}>Local state only · no production writes · no IG connection</p>}
        </div>
      )}

      {gate.blocking_reasons.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
          <p style={{ color: "#f87171", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            Blocking — Motion NOT READY ({gate.blocking_reasons.length})
          </p>
          {gate.blocking_reasons.map((r, i) => (
            <p key={i} style={{ color: "#A09D9A", fontSize: 11, lineHeight: 1.55, marginBottom: 4 }}>✗ {r.split(":")[0]}</p>
          ))}
        </div>
      )}

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "18px 20px" }}>
        {gate.dimensions.map((dim) => <MotionDimRow key={dim.id} dim={dim} />)}
      </div>
    </div>
  );
}

// ── Motion Preview ─────────────────────────────────────────────────────────────

function MotionPreviewPanel({
  slides,
  selectedSlide,
  onSelect,
  motionVideoUrls,
}: {
  slides: LaunchSlide[];
  selectedSlide: number;
  onSelect: (i: number) => void;
  motionVideoUrls: Record<number, string>;
}) {
  const current = slides[selectedSlide];
  const currentVideoUrl = motionVideoUrls[selectedSlide] ?? current.motion_asset.background_video_url;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 2 }}>Motion Preview</p>
        <p style={{ color: "#3E3B37", fontSize: 11 }}>Background video + text overlay · loop muted · 4:5</p>
      </div>

      {/* Featured */}
      <div style={{ marginBottom: 14 }}>
        <MotionSlidePreview
          slide={current}
          videoUrl={currentVideoUrl}
          size="featured"
        />
      </div>

      {/* Thumbnail grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {slides.map((s, i) => (
          <button key={i} onClick={() => onSelect(i)} style={{ border: i === selectedSlide ? "1.5px solid rgba(249,115,22,0.45)" : "1px solid rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden", background: "none", padding: 0, cursor: "pointer" }}>
            <MotionSlidePreview slide={s} videoUrl={motionVideoUrls[i] ?? s.motion_asset.background_video_url} size="thumbnail" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Per-slide Motion Status ───────────────────────────────────────────────────

function SlideMotionStatus({ slides }: { slides: LaunchSlide[] }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ color: "#A09D9A", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Per-Slide Motion Status</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {slides.map((s, i) => {
          const ma = s.motion_asset;
          const isReady = ma.status === "video_generated" || ma.status === "composed" || ma.status === "approved";
          const isFailed = ma.status === "failed";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: isReady ? "rgba(34,197,94,0.04)" : isFailed ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.015)", border: `1px solid ${isReady ? "rgba(34,197,94,0.12)" : isFailed ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.05)"}`, borderRadius: 10, padding: "9px 13px" }}>
              <span style={{ color: "#3E3B37", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>{String(s.slide_number).padStart(2, "0")}</span>
              <RoleBadge label={s.role_label} />
              <span style={{ color: "#252220", fontSize: 10, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.main_lines[0] ?? s.main_copy}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "2px 8px", flexShrink: 0, color: isReady ? "#4ade80" : isFailed ? "#f87171" : "#FB923C", background: isReady ? "rgba(34,197,94,0.08)" : isFailed ? "rgba(239,68,68,0.08)" : "rgba(249,115,22,0.08)", border: `1px solid ${isReady ? "rgba(34,197,94,0.18)" : isFailed ? "rgba(239,68,68,0.15)" : "rgba(249,115,22,0.2)"}` }}>
                {ma.status.replace("_", " ").toUpperCase()}
              </span>
              <span style={{ color: "#3E3B37", fontSize: 9, flexShrink: 0 }}>{ma.provider}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Still Preview Pipeline (debug section) ────────────────────────────────────

function StillPreviewPipeline({
  slides,
  artworks,
  generating,
  generatingSlide,
  selectedArtwork,
  onSelect,
  onGenerateAll,
  onCancel,
  onClearAll,
  onRegenerate,
}: {
  slides: LaunchSlide[];
  artworks: SlideArtworkState[];
  generating: boolean;
  generatingSlide: number | null;
  selectedArtwork: number;
  onSelect: (i: number) => void;
  onGenerateAll: () => void;
  onCancel: () => void;
  onClearAll: () => void;
  onRegenerate: (i: number) => void;
}) {
  const readyCount = artworks.filter((a) => a.final_artwork_status === "ready").length;
  const progress = artworks.filter((a) => a.background_status === "generated" || a.background_status === "failed").length;

  return (
    <div>
      <div style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.12)", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
        <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>Still Preview is not final output</p>
        <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.6 }}>
          Static images are keyframe previews only. Final output must be MP4 motion slides. Completing still preview does not mark the carousel as ready to publish.
        </p>
      </div>

      {/* Generate controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {!generating ? (
          <button onClick={onGenerateAll} style={{ height: 38, paddingLeft: 18, paddingRight: 18, borderRadius: 10, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#FB923C", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Generate All 8 Keyframes (OpenAI)
          </button>
        ) : (
          <button onClick={onCancel} style={{ height: 38, paddingLeft: 18, paddingRight: 18, borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Cancel
          </button>
        )}
        {readyCount > 0 && !generating && (
          <button onClick={onClearAll} style={{ height: 38, paddingLeft: 14, paddingRight: 14, borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#3E3B37", fontSize: 11, cursor: "pointer" }}>
            Clear All
          </button>
        )}
        <span style={{ color: "#3E3B37", fontSize: 10, alignSelf: "center" }}>
          {readyCount}/8 keyframes ready · model: OPENAI_IMAGE_MODEL env
        </span>
      </div>

      {generating && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "#FB923C", fontSize: 11, fontWeight: 600 }}>Generating slide {generatingSlide !== null ? generatingSlide + 1 : "—"}...</span>
            <span style={{ color: "#3E3B37", fontSize: 11 }}>{progress}/8</span>
          </div>
          <div style={{ height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
            <div style={{ width: `${(progress / 8) * 100}%`, height: "100%", background: "#F97316", borderRadius: 2, transition: "width 0.4s ease" }} />
          </div>
        </div>
      )}

      {/* Featured + grid */}
      <div style={{ marginBottom: 14 }}>
        <FinalArtworkComposer slide={slides[selectedArtwork]} artwork={artworks[selectedArtwork]} size="featured" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
        {slides.map((s, i) => (
          <button key={i} onClick={() => onSelect(i)} style={{ border: i === selectedArtwork ? "1.5px solid rgba(249,115,22,0.4)" : "1px solid rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden", background: "none", padding: 0, cursor: "pointer" }}>
            <FinalArtworkComposer slide={s} artwork={artworks[i]} size="thumbnail" />
          </button>
        ))}
      </div>

      {/* Per-slide status */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {slides.map((s, i) => {
          const a = artworks[i];
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 12px" }}>
              <span style={{ color: "#3E3B37", fontSize: 10, fontFamily: "monospace" }}>{String(s.slide_number).padStart(2, "0")}</span>
              <RoleBadge label={s.role_label} />
              <span style={{ flex: 1, color: "#252220", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.main_lines[0]}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: a.final_artwork_status === "ready" ? "#4ade80" : a.background_status === "failed" ? "#f87171" : "#3E3B37" }}>
                {a.final_artwork_status === "ready" ? "READY" : a.background_status === "failed" ? "FAILED" : "MISSING"}
              </span>
              <button onClick={() => onRegenerate(i)} disabled={generating} style={{ height: 24, paddingLeft: 8, paddingRight: 8, borderRadius: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: generating ? "#1A1816" : "#52504E", fontSize: 9, cursor: generating ? "not-allowed" : "pointer" }}>
                {a.final_artwork_status === "ready" ? "↺ REGEN" : "GEN"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Debug: Content Layer ──────────────────────────────────────────────────────

function ContentLayer({ slides }: { slides: LaunchSlide[] }) {
  return (
    <div>
      {slides.map((s) => (
        <div key={s.slide_number} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "16px 18px", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <SlideIndexBadge n={s.slide_number} total={slides.length} />
            <RoleBadge label={s.role_label} />
          </div>
          <div style={{ marginBottom: 6 }}>
            {s.main_lines.map((line, i) => (
              <p key={i} style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, lineHeight: 1.38, margin: "0 0 1px 0" }}>
                <HighlightedText text={line} words={s.highlight_words} />
              </p>
            ))}
          </div>
          <div>
            {s.support_lines.map((line, i) => (
              <p key={i} style={{ color: "#6B6865", fontSize: 12, lineHeight: 1.68, margin: "0 0 1px 0" }}>{line}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Debug: Motion Prompts ─────────────────────────────────────────────────────

function PromptBlock({ label, content, copyLabel }: { label: string; content: string; copyLabel: string }) {
  const [exp, setExp] = useState(false);
  const preview = content.slice(0, 110) + (content.length > 110 ? "…" : "");
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <p style={{ color: "#A09D9A", fontSize: 10, fontWeight: 700 }}>{label}</p>
        <CopyButton text={content} label={copyLabel} small />
      </div>
      <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.6 }}>{exp ? content : preview}</p>
      {content.length > 110 && (
        <button onClick={() => setExp((v) => !v)} style={{ background: "none", border: "none", padding: 0, color: "#3E3B37", fontSize: 10, cursor: "pointer", marginTop: 4 }}>
          {exp ? "↑ Collapse" : "↓ Show full"}
        </button>
      )}
    </div>
  );
}

function MotionPromptLayer({ slides }: { slides: LaunchSlide[] }) {
  return (
    <div>
      {slides.map((s) => {
        const ma = s.motion_asset;
        return (
          <div key={s.slide_number} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <SlideIndexBadge n={s.slide_number} total={slides.length} />
              <RoleBadge label={s.role_label} />
              <span style={{ color: "#3E3B37", fontSize: 9 }}>{ma.duration_seconds}s · {ma.fps}fps · {ma.aspect_ratio}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <FieldRow label="Camera Motion" value={ma.camera_motion} />
              <FieldRow label="Subject Motion" value={ma.subject_motion} />
              <FieldRow label="Atmosphere" value={ma.atmosphere_motion} />
              <FieldRow label="Text Safe Area" value={ma.text_safe_area} />
            </div>
            <PromptBlock label="Video Generation Prompt" content={ma.video_generation_prompt} copyLabel="Copy" />
            <PromptBlock label="Negative Prompt" content={ma.negative_prompt} copyLabel="Copy Neg" />
          </div>
        );
      })}
    </div>
  );
}

// ── Debug: Still Preview Prompts ──────────────────────────────────────────────

function StillPreviewPromptLayer({ slides }: { slides: LaunchSlide[] }) {
  return (
    <div>
      {slides.map((s) => {
        const sp = s.still_preview;
        return (
          <div key={s.slide_number} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <SlideIndexBadge n={s.slide_number} total={slides.length} />
              <RoleBadge label={s.role_label} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <FieldRow label="Mood" value={sp.mood} />
              <FieldRow label="Text Safe Area" value={sp.text_safe_area} />
              <FieldRow label="Camera" value={sp.camera_direction} />
              <FieldRow label="Lighting" value={sp.lighting_direction} />
            </div>
            <PromptBlock label="Image Generation Prompt" content={sp.image_generation_prompt} copyLabel="Copy" />
          </div>
        );
      })}
    </div>
  );
}

// ── Debug: Typography Layer ───────────────────────────────────────────────────

function TypographyLayer({ slides }: { slides: LaunchSlide[] }) {
  return (
    <div>
      {slides.map((s) => {
        const t = s.typography;
        return (
          <div key={s.slide_number} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <SlideIndexBadge n={s.slide_number} total={slides.length} />
              <RoleBadge label={s.role_label} />
              <span style={{ color: "#3E3B37", fontSize: 9, fontWeight: 700 }}>{t.template}</span>
              <span style={{ color: t.readability_score >= 9 ? "#4ade80" : "#f87171", fontSize: 9, fontWeight: 700 }}>readability {t.readability_score}/10</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FieldRow label="Overlay Mask" value={t.overlay_mask} />
              <FieldRow label="Emphasis" value={t.emphasis_style} />
              <FieldRow label="Main Font" value={t.main_font_size} />
              <FieldRow label="Support Font" value={t.support_font_size} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Debug: CSS Placeholder Preview ────────────────────────────────────────────

function CSSPreviewLayer({ slides }: { slides: LaunchSlide[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {slides.map((s, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ height: 30, paddingLeft: 12, paddingRight: 12, borderRadius: 8, background: i === active ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.02)", border: i === active ? "1px solid rgba(249,115,22,0.2)" : "1px solid rgba(255,255,255,0.06)", color: i === active ? "#FB923C" : "#3E3B37", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {s.slide_number}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <LaunchSlideComposer slide={slides[active]} total={slides.length} size="featured" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 6 }}>
        {slides.map((s, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ border: i === active ? "1.5px solid rgba(249,115,22,0.4)" : "1px solid rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden", background: "none", padding: 0, cursor: "pointer" }}>
            <LaunchSlideComposer slide={s} total={slides.length} size="thumbnail" />
          </button>
        ))}
      </div>
      <p style={{ color: "#252220", fontSize: 10, textAlign: "center" }}>CSS gradient placeholder · not final output · not for publishing</p>
    </div>
  );
}

// ── Debug: Manual Fit Room ────────────────────────────────────────────────────

function TypographyControlsPanel({ slide, controls, onChange, onReset }: { slide: LaunchSlide; controls: SlideTypographyControls; onChange: (k: string, v: unknown) => void; onReset: () => void }) {
  const lbl = { color: "#3E3B37", fontSize: 9, fontWeight: 700 as const, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4, display: "block" as const };
  const sel = (key: string, value: string) => ({
    value,
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(key, e.target.value),
    style: { width: "100%", height: 30, background: "#0E0C0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#8C8784", fontSize: 11, padding: "0 8px", outline: "none" } as React.CSSProperties,
  });
  const slider = (label: string, key: string, value: number, min: number, max: number, display: string) => (
    <div><span style={lbl}>{label}: <span style={{ color: "#6B6865", fontWeight: 400 }}>{display}</span></span><input type="range" min={min} max={max} value={value} onChange={(e) => onChange(key, Number(e.target.value))} style={{ width: "100%" }} /></div>
  );
  return (
    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ color: "#A09D9A", fontSize: 11, fontWeight: 700 }}>Typography Controls</p>
        <button onClick={onReset} style={{ height: 24, paddingLeft: 8, paddingRight: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 5, color: "#3E3B37", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>RESET</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ gridColumn: "span 2" }}>
          <span style={lbl}>Template</span>
          <select {...sel("template", controls.template)}>
            {["left-heavy","right-heavy","bottom-anchor","top-anchor","center-statement","split-tension"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        {slider("X Offset", "x_offset", controls.x_offset, -20, 20, `${controls.x_offset}%`)}
        {slider("Y Offset", "y_offset", controls.y_offset, -20, 20, `${controls.y_offset}%`)}
        {slider("Text Width", "text_width", controls.text_width, 30, 85, `${controls.text_width}%`)}
        {slider("Main Scale", "main_scale", Math.round(controls.main_scale * 100), 60, 180, `${controls.main_scale.toFixed(1)}×`)}
        {slider("Support Scale", "support_scale", Math.round(controls.support_scale * 100), 60, 180, `${controls.support_scale.toFixed(1)}×`)}
        <div style={{ gridColumn: "span 2" }}>
          <span style={lbl}>Overlay Mask</span>
          <select {...sel("overlay_mask", controls.overlay_mask)}>
            {["none","left-gradient","right-gradient","top-gradient","bottom-glass","center-vignette","full-darken"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          {slider("Mask Strength", "mask_strength", controls.mask_strength, 0, 100, `${controls.mask_strength}%`)}
        </div>
        <div><span style={lbl}>Text Color</span><select {...sel("text_color_mode", controls.text_color_mode)}><option value="white">white</option><option value="warm-white">warm-white</option></select></div>
        <div><span style={lbl}>Emphasis</span><select {...sel("emphasis_style", controls.emphasis_style)}><option value="orange">orange</option><option value="underline">underline</option><option value="boxed">boxed</option><option value="none">none</option></select></div>
        <div style={{ gridColumn: "span 2" }}>
          <button onClick={() => onChange("footer_visible", !controls.footer_visible)} style={{ height: 28, paddingLeft: 12, paddingRight: 12, background: controls.footer_visible ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.02)", border: controls.footer_visible ? "1px solid rgba(249,115,22,0.2)" : "1px solid rgba(255,255,255,0.07)", borderRadius: 7, color: controls.footer_visible ? "#FB923C" : "#3E3B37", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            FOOTER {controls.footer_visible ? "ON" : "OFF"}
          </button>
        </div>
      </div>
      <p style={{ color: "#252220", fontSize: 9, marginTop: 10 }}>Slide default: {slide.typography.template} · {slide.typography.overlay_mask}</p>
    </div>
  );
}

function UploadPanel({ slideIndex, localState, onFileUpload, onRemoveAsset, onApprove, onReject, onReviewNote }: { slideIndex: number; localState: LocalSlideState; onFileUpload: (i: number, file: File) => void; onRemoveAsset: (i: number) => void; onApprove: (i: number) => void; onReject: (i: number) => void; onReviewNote: (i: number, note: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAsset = localState.local_asset_status === "preview_uploaded" || localState.local_asset_status === "local_approved";
  return (
    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
      <p style={{ color: "#A09D9A", fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Upload Asset (still preview only)</p>
      <input ref={inputRef} type="file" accept="image/*,video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileUpload(slideIndex, f); e.target.value = ""; }} style={{ display: "none" }} />
      <div style={{ display: "flex", gap: 8, marginBottom: hasAsset ? 8 : 0 }}>
        <button onClick={() => inputRef.current?.click()} style={{ flex: 1, height: 32, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 8, color: "#FB923C", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{hasAsset ? "Replace" : "Upload Image / Video"}</button>
        {hasAsset && <button onClick={() => onRemoveAsset(slideIndex)} style={{ height: 32, paddingLeft: 10, paddingRight: 10, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 8, color: "#f87171", fontSize: 11, cursor: "pointer" }}>Remove</button>}
      </div>
      {localState.local_asset_status === "preview_uploaded" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <button onClick={() => onApprove(slideIndex)} style={{ flex: 1, height: 30, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, color: "#4ade80", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓ Local Approve</button>
            <button onClick={() => onReject(slideIndex)} style={{ flex: 1, height: 30, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✗ Reject</button>
          </div>
          <input type="text" value={localState.local_review_note ?? ""} onChange={(e) => onReviewNote(slideIndex, e.target.value)} placeholder="Review note (optional)" style={{ width: "100%", height: 28, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, color: "#8C8784", fontSize: 11, padding: "0 8px", outline: "none", boxSizing: "border-box" }} />
        </>
      )}
    </div>
  );
}

function ManualFitRoom({ slides, localStates, controls, fitRoomSlide, onSlideSelect, onFileUpload, onRemoveAsset, onApprove, onReject, onReviewNote, onControlChange, onResetControls }: { slides: LaunchSlide[]; localStates: LocalSlideState[]; controls: SlideTypographyControls[]; fitRoomSlide: number; onSlideSelect: (i: number) => void; onFileUpload: (i: number, file: File) => void; onRemoveAsset: (i: number) => void; onApprove: (i: number) => void; onReject: (i: number) => void; onReviewNote: (i: number, note: string) => void; onControlChange: (i: number, k: string, v: unknown) => void; onResetControls: (i: number) => void }) {
  return (
    <div>
      <div style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.12)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
        <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>Manual Fit Room — debug fallback only</p>
        <p style={{ color: "#52504E", fontSize: 11 }}>Upload your own asset to test typography. This is not the final publish flow.</p>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {slides.map((s, i) => {
          const ls = localStates[i];
          const active = i === fitRoomSlide;
          let c = "#3E3B37", bg = "rgba(255,255,255,0.02)", bd = "rgba(255,255,255,0.06)";
          if (ls.local_asset_status === "local_approved") { c = "#4ade80"; bg = "rgba(34,197,94,0.08)"; bd = "rgba(34,197,94,0.2)"; }
          else if (ls.local_asset_status === "preview_uploaded") { c = "#FB923C"; bg = "rgba(249,115,22,0.08)"; bd = "rgba(249,115,22,0.2)"; }
          return (
            <button key={i} onClick={() => onSlideSelect(i)} style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 8, background: active ? "rgba(249,115,22,0.10)" : bg, border: active ? "1.5px solid rgba(249,115,22,0.32)" : `1px solid ${bd}`, color: active ? "#FB923C" : c, fontSize: 11, fontWeight: 700, fontFamily: "monospace", cursor: "pointer" }}>
              {String(s.slide_number).padStart(2, "0")}
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,0.9fr)", gap: 14, alignItems: "start" }}>
        <EditorialSlideArtboard slide={slides[fitRoomSlide]} total={slides.length} localState={localStates[fitRoomSlide]} controls={controls[fitRoomSlide]} />
        <div>
          <UploadPanel slideIndex={fitRoomSlide} localState={localStates[fitRoomSlide]} onFileUpload={onFileUpload} onRemoveAsset={onRemoveAsset} onApprove={onApprove} onReject={onReject} onReviewNote={onReviewNote} />
          <TypographyControlsPanel slide={slides[fitRoomSlide]} controls={controls[fitRoomSlide]} onChange={(k, v) => onControlChange(fitRoomSlide, k, v)} onReset={() => onResetControls(fitRoomSlide)} />
        </div>
      </div>
    </div>
  );
}

// ── Canva Motion Pack section ─────────────────────────────────────────────────

const CANVA_INTEGRATION_CHECKLIST = [
  "Create Canva Developer account at developers.canva.com",
  "Confirm Canva Connect OAuth is available for your account type",
  "Confirm Brand Template API and Autofill API access",
  "Confirm MP4 video export API access (not just PNG / PDF)",
  "Confirm whether Canva AI video generation has a public API endpoint",
  "If AI video API exists: confirm it supports 4:5 ratio (1080×1350px)",
  "Set CANVA_CLIENT_ID and CANVA_CLIENT_SECRET in .env.local (server-side only)",
  "Test OAuth flow locally before building any route",
  "If AI video API is not API-accessible: use Path A (manual) or connect Runway",
] as const;

function CanvaMotionPackSection() {
  const { slides, final_output_target, export_spec, canva_api_status } = CANVA_MOTION_PACK;
  const allPromptsText = buildAllPromptsText();
  const templateSpecText = buildTemplateSpecText();

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <p style={{ color: "#FAFAF9", fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 4 }}>
            Canva Motion Pack
          </p>
          <p style={{ color: "#3E3B37", fontSize: 11 }}>
            {final_output_target} · {export_spec}
          </p>
        </div>
        <span style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 7, padding: "4px 10px", color: "#f87171", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", flexShrink: 0, marginTop: 2 }}>
          NOT CONNECTED
        </span>
      </div>

      {/* Status banner */}
      <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.10)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
        <p style={{ color: "#f87171", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
          Canva AI video failed the 4:5 requirement in user testing
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <p style={{ color: "#A09D9A", fontSize: 11, lineHeight: 1.6 }}>
            · User tested Canva AI video — current output is <strong style={{ color: "#f87171" }}>16:9 only</strong>. Not suitable as primary 4:5 motion background generator.
          </p>
          <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.6 }}>
            · Canva can still be used for composition, template layout, text animation, and MP4 export — with an external vertical video as input.
          </p>
          <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.6 }}>
            · Final motion background must come from a vertical-capable provider: Runway, Kling, or Pika.
          </p>
          <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.6 }}>
            · Still image → Canva animation (pan/zoom) is a fallback only — not true cinematic motion background.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 5, padding: "2px 8px", color: "#f87171", fontSize: 9, fontWeight: 700 }}>
            AI VIDEO: 16:9 ONLY — NOT SUITABLE
          </span>
          <span style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.14)", borderRadius: 5, padding: "2px 8px", color: "#FB923C", fontSize: 9, fontWeight: 700 }}>
            COMPOSITION / EXPORT: PLANNED
          </span>
          <span style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 5, padding: "2px 8px", color: "#3E3B37", fontSize: 9, fontWeight: 700 }}>
            API STATUS: {canva_api_status.toUpperCase()}
          </span>
        </div>
        <p style={{ color: "#252220", fontSize: 10, marginTop: 8 }}>
          See docs/canva-motion-workflow.md for corrected workflow
        </p>
      </div>

      {/* Bulk copy actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <CopyButton text={allPromptsText} label="Copy All 8 Prompts" />
        <CopyButton text={templateSpecText} label="Copy 8-Page Template Spec" />
      </div>

      {/* Per-slide cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {slides.map((s, i) => {
          const promptText = buildSlidePromptText(s, i, slides.length);
          return (
            <div key={s.slide_id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#3E3B37", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>
                    {String(i + 1).padStart(2, "0")}/{String(slides.length).padStart(2, "0")}
                  </span>
                  <span style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.18)", borderRadius: 5, padding: "2px 8px", color: "#FB923C", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>
                    {s.role}
                  </span>
                  <span style={{ color: "#252220", fontSize: 9 }}>
                    {s.text_safe_area} text · {s.subject_position} subject · {s.duration_seconds}s · {s.aspect_ratio}
                  </span>
                </div>
                <CopyButton text={promptText} label="Copy Slide" small />
              </div>

              {/* Main copy preview */}
              <div style={{ marginBottom: 8 }}>
                {s.main_lines.map((line, li) => (
                  <p key={li} style={{ color: "#A09D9A", fontSize: 13, fontWeight: 700, lineHeight: 1.4, margin: "0 0 1px 0" }}>
                    {line.split("").map((char, ci) =>
                      s.highlight_words.some((w) => {
                        const lineIdx = line.indexOf(w);
                        return lineIdx !== -1 && ci >= lineIdx && ci < lineIdx + w.length;
                      }) ? (
                        <span key={ci} style={{ color: "#F97316" }}>{char}</span>
                      ) : (
                        <span key={ci}>{char}</span>
                      )
                    )}
                  </p>
                ))}
              </div>

              {/* Support copy preview */}
              <div style={{ marginBottom: 10 }}>
                {s.support_lines.map((line, li) => (
                  <p key={li} style={{ color: "#3E3B37", fontSize: 11, lineHeight: 1.6, margin: 0 }}>{line}</p>
                ))}
              </div>

              {/* Video prompt preview */}
              <div style={{ background: "rgba(255,255,255,0.015)", borderRadius: 8, padding: "8px 10px" }}>
                <p style={{ color: "#252220", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                  Video Prompt for Canva
                </p>
                <p style={{ color: "#3E3B37", fontSize: 10, lineHeight: 1.65 }}>
                  {s.video_prompt_for_canva.slice(0, 140)}
                  {s.video_prompt_for_canva.length > 140 ? "…" : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Canva Integration Checklist */}
      <div>
        <p style={{ color: "#A09D9A", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
          Canva Integration Checklist
        </p>
        <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, overflow: "hidden" }}>
          {CANVA_INTEGRATION_CHECKLIST.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", borderBottom: i < CANVA_INTEGRATION_CHECKLIST.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ color: "#252220", fontSize: 9, fontFamily: "monospace", fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                [ ]
              </span>
              <p style={{ color: "#6B6865", fontSize: 11, lineHeight: 1.6 }}>{item}</p>
            </div>
          ))}
        </div>
        <p style={{ color: "#252220", fontSize: 10, marginTop: 8, lineHeight: 1.6 }}>
          See docs/canva-motion-workflow.md · Path A (manual prototype) · Path B (Connect API) · Path C (AI video API — do not assume available)
        </p>
      </div>
    </div>
  );
}

// ── Still Preview Quality Gate (debug) ────────────────────────────────────────

function StillGatePanel({ gate }: { gate: QualityGateResult }) {
  return (
    <div>
      <div style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.12)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
        <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 700 }}>Still Preview Gate — not motion gate</p>
        <p style={{ color: "#52504E", fontSize: 11, marginTop: 2 }}>Static image completion does not indicate motion readiness. Do not use this as publish signal.</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: "#FAFAF9", fontSize: 13, fontWeight: 700 }}>Still Preview Quality</span>
        <span style={{ color: "#FB923C", fontSize: 13, fontWeight: 700 }}>{gate.overall_score}/10</span>
      </div>
      {gate.blocking_reasons.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
          {gate.blocking_reasons.map((r, i) => <p key={i} style={{ color: "#A09D9A", fontSize: 11, marginBottom: 3 }}>✗ {r.split(":")[0]}</p>)}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {gate.dimensions.map((d) => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
            <span style={{ color: d.passed ? "#4ade80" : "#f87171", fontSize: 11 }}>{d.passed ? "✓" : "✗"} {d.name}</span>
            <span style={{ color: "#52504E", fontSize: 11 }}>{d.score}/{d.max_score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FinalLaunchStudioPage() {
  const { slides, caption, hashtags, motion_gate, quality_gate, launch_checklist, topic, thesis, deep_insight } = FINAL_LAUNCH_PACK;

  // Motion pipeline state
  const [selectedMotionSlide, setSelectedMotionSlide] = useState(0);
  const [humanApproved, setHumanApproved] = useState(false);
  // motionVideoUrls: runtime-generated video URLs keyed by slide index (0-based)
  const [motionVideoUrls, setMotionVideoUrls] = useState<Record<number, string>>({});

  // Slide 1 — first-frame motion pipeline state
  const [slide1KeyframeUrl, setSlide1KeyframeUrl] = useState<string | undefined>(undefined);
  const [slide1KeyframeStatus, setSlide1KeyframeStatus] = useState<"missing" | "generating" | "generated" | "failed">("missing");
  const [slide1MotionStatus, setSlide1MotionStatus] = useState<"missing" | "generating" | "generated" | "failed">("missing");
  const [slide1MotionError, setSlide1MotionError] = useState<string | undefined>(undefined);
  const [slide1RatioStatus, setSlide1RatioStatus] = useState<RatioStatus>("unknown");

  // Still preview pipeline state (debug)
  const [artworks, setArtworks] = useState<SlideArtworkState[]>(() => slides.map(emptyArtwork));
  const [generating, setGenerating] = useState(false);
  const [generatingSlide, setGeneratingSlide] = useState<number | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState(0);
  const cancelRef = useRef(false);

  // Fit Room state (debug)
  const [fitRoomSlide, setFitRoomSlide] = useState(0);
  const [localStates, setLocalStates] = useState<LocalSlideState[]>(() =>
    slides.map(() => ({ local_asset_status: "missing" as const }))
  );
  const [controls, setControls] = useState<SlideTypographyControls[]>(() =>
    slides.map(defaultControls)
  );

  // Still preview generation handlers
  const generateOne = useCallback(async (i: number) => {
    const slide = slides[i];
    setArtworks((prev) =>
      prev.map((a, idx) =>
        idx === i ? { ...a, background_status: "generating", final_artwork_status: "missing", error: undefined } : a
      )
    );
    try {
      const res = await fetch("/api/debug/final-launch/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slide_id: `slide-${slide.slide_number}`,
          prompt: slide.still_preview.image_generation_prompt,
          negative_prompt: slide.still_preview.negative_prompt,
        }),
      });
      const data = (await res.json()) as { status: string; image_url?: string; generated_at?: string; error?: string };
      if (data.status === "generated" && data.image_url) {
        setArtworks((prev) =>
          prev.map((a, idx) =>
            idx === i ? { background_status: "generated", composition_status: "composed", final_artwork_status: "ready", background_url: data.image_url, generated_at: data.generated_at } : a
          )
        );
      } else {
        setArtworks((prev) =>
          prev.map((a, idx) =>
            idx === i ? { ...a, background_status: "failed", final_artwork_status: "missing", error: data.error ?? "Unknown error" } : a
          )
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setArtworks((prev) =>
        prev.map((a, idx) => idx === i ? { ...a, background_status: "failed", final_artwork_status: "missing", error: msg } : a)
      );
    }
  }, [slides]);

  const handleGenerateAll = useCallback(async () => {
    cancelRef.current = false;
    setGenerating(true);
    for (let i = 0; i < slides.length; i++) {
      if (cancelRef.current) break;
      setGeneratingSlide(i);
      await generateOne(i);
    }
    setGenerating(false);
    setGeneratingSlide(null);
  }, [slides, generateOne]);

  const handleRegenerate = useCallback(async (i: number) => {
    if (generating) return;
    setGenerating(true);
    setGeneratingSlide(i);
    cancelRef.current = false;
    await generateOne(i);
    setGenerating(false);
    setGeneratingSlide(null);
  }, [generating, generateOne]);

  // Fit Room handlers
  const handleFileUpload = useCallback((i: number, file: File) => {
    const url = URL.createObjectURL(file);
    const assetType: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
    setLocalStates((prev) => prev.map((s, idx) => idx === i ? { ...s, local_asset_url: url, local_asset_type: assetType, local_asset_status: "preview_uploaded" } : s));
  }, []);
  const handleRemoveAsset = useCallback((i: number) => {
    setLocalStates((prev) => prev.map((s, idx) => idx === i ? { local_asset_status: "missing", local_asset_url: undefined, local_asset_type: undefined, local_review_note: undefined } : s));
  }, []);
  const handleApprove = useCallback((i: number) => {
    setLocalStates((prev) => prev.map((s, idx) => idx === i ? { ...s, local_asset_status: "local_approved" } : s));
  }, []);
  const handleReject = useCallback((i: number) => {
    setLocalStates((prev) => prev.map((s, idx) => idx === i ? { ...s, local_asset_status: "rejected" } : s));
  }, []);
  const handleReviewNote = useCallback((i: number, note: string) => {
    setLocalStates((prev) => prev.map((s, idx) => idx === i ? { ...s, local_review_note: note } : s));
  }, []);
  const handleControlChange = useCallback((i: number, key: string, value: unknown) => {
    setControls((prev) => prev.map((c, idx) => idx === i ? { ...c, [key]: value } : c));
  }, []);
  const handleResetControls = useCallback((i: number) => {
    setControls((prev) => prev.map((c, idx) => idx === i ? defaultControls(slides[idx]) : c));
  }, [slides]);

  // Step 1: generate 4:5 keyframe via OpenAI
  const handleGenerateSlide1Keyframe = useCallback(async () => {
    setSlide1KeyframeStatus("generating");
    setSlide1KeyframeUrl(undefined);
    try {
      const res = await fetch("/api/debug/final-launch/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slide_id: "slide-1",
          prompt: SLIDE1_KEYFRAME_PROMPT,
          negative_prompt: SLIDE1_KEYFRAME_NEGATIVE,
        }),
      });
      const data = (await res.json()) as { status: string; image_url?: string; error?: string };
      if (data.status === "generated" && data.image_url) {
        setSlide1KeyframeUrl(data.image_url);
        setSlide1KeyframeStatus("generated");
      } else {
        setSlide1KeyframeStatus("failed");
      }
    } catch {
      setSlide1KeyframeStatus("failed");
    }
  }, []);

  // Step 2: send keyframe to Runway image-to-video, get motion clip
  const handleGenerateSlide1Motion = useCallback(async () => {
    if (!slide1KeyframeUrl) return;
    setSlide1MotionStatus("generating");
    setSlide1MotionError(undefined);
    try {
      const res = await fetch("/api/debug/final-launch/generate-motion-from-keyframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slide_id: "slide-1",
          keyframe_url: slide1KeyframeUrl,
          duration_seconds: 5,
        }),
      });
      const data = (await res.json()) as {
        status: string;
        background_video_url?: string;
        error?: string;
      };
      if (data.status === "video_generated" && data.background_video_url) {
        setMotionVideoUrls((prev) => ({ ...prev, 0: data.background_video_url! }));
        setSlide1MotionStatus("generated");
        setSelectedMotionSlide(0);
      } else {
        setSlide1MotionError(data.error ?? "Unknown error from Runway");
        setSlide1MotionStatus("failed");
      }
    } catch (err) {
      setSlide1MotionError(err instanceof Error ? err.message : String(err));
      setSlide1MotionStatus("failed");
    }
  }, [slide1KeyframeUrl]);

  // Detect video ratio via browser metadata — runs whenever slide 1 video URL changes
  const slide1VideoUrl = motionVideoUrls[0];
  useEffect(() => {
    if (!slide1VideoUrl) {
      setSlide1RatioStatus("unknown");
      return;
    }
    setSlide1RatioStatus("unknown");
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      setSlide1RatioStatus(validateVideoRatio(video.videoWidth, video.videoHeight));
      video.src = "";
    };
    video.onerror = () => {
      setSlide1RatioStatus("unknown");
      video.src = "";
    };
    video.src = slide1VideoUrl;
  }, [slide1VideoUrl]);

  return (
    <div style={{ minHeight: "100vh", background: "#0C0A08", padding: "40px 16px 100px" }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>

        {/* ── Warning ──────────────────────────────────────────── */}
        <div style={{ background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.14)", borderRadius: 12, padding: "14px 18px", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FB923C", marginTop: 5, flexShrink: 0 }} />
            <div>
              <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                Instagram is not connected — Manual Launch Only
              </p>
              <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.6 }}>
                Phoenix did not post anything. No production writes. Final output target: 8 × 4:5 MP4 motion slides. Static still_preview is keyframe reference only — it is not publishable final output.
              </p>
            </div>
          </div>
        </div>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.14)", borderRadius: 8, padding: "4px 12px", marginBottom: 12 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#60a5fa" }} />
            <span style={{ color: "#60a5fa", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Motion Launch Pipeline · Debug Only</span>
          </div>
          <h1 style={{ color: "#FAFAF9", fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 8 }}>{topic}</h1>
          <p style={{ color: "#FB923C", fontSize: 13, fontWeight: 500, lineHeight: 1.6, marginBottom: 4 }}>{thesis}</p>
          <p style={{ color: "#52504E", fontSize: 12, lineHeight: 1.6, fontStyle: "italic" }}>&ldquo;{deep_insight}&rdquo;</p>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 28 }} />

        {/* ── Motion Gate ───────────────────────────────────────── */}
        <MotionQualityGatePanel
          gate={motion_gate}
          humanApproved={humanApproved}
          onMarkApproved={() => setHumanApproved((v) => !v)}
        />

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 28 }} />

        {/* ── Motion Provider Status ────────────────────────────── */}
        <MotionProviderPanel />

        {/* ── Provider Capability Guard ─────────────────────────── */}
        <ProviderCapabilityPanel />

        {/* ── Slide 1 — First-Frame Motion Pipeline ────────────── */}
        <div style={{ marginBottom: 24, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ color: "#FAFAF9", fontSize: 13, fontWeight: 700, marginBottom: 3 }}>Slide 1 — First-Frame Motion Pipeline</p>
              <p style={{ color: "#3E3B37", fontSize: 11, lineHeight: 1.55 }}>
                OpenAI generates 4:5 keyframe → Runway animates from keyframe → Phoenix overlays Chinese text
              </p>
            </div>
            {slide1MotionStatus === "generated" && slide1RatioStatus === "passed_4_5" && (
              <span style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.22)", borderRadius: 7, padding: "4px 12px", color: "#4ade80", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", flexShrink: 0, marginTop: 2 }}>
                SLIDE 1 READY FOR REVIEW
              </span>
            )}
            {slide1MotionStatus === "generated" && slide1RatioStatus !== "passed_4_5" && (
              <span style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.20)", borderRadius: 7, padding: "4px 12px", color: "#FB923C", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", flexShrink: 0, marginTop: 2 }}>
                {slide1RatioStatus === "unknown" ? "RATIO UNKNOWN" : "RATIO FAILED"}
              </span>
            )}
          </div>

          {/* Step 1 — Keyframe */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ color: "#6B6865", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Step 1 — Generate 4:5 Keyframe (OpenAI)
            </p>
            <button
              onClick={handleGenerateSlide1Keyframe}
              disabled={slide1KeyframeStatus === "generating"}
              style={{
                width: "100%", height: 40, borderRadius: 10,
                background: slide1KeyframeStatus === "generating" ? "rgba(255,255,255,0.02)" : slide1KeyframeStatus === "generated" ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.04)",
                border: slide1KeyframeStatus === "generating" ? "1px solid rgba(255,255,255,0.06)" : slide1KeyframeStatus === "generated" ? "1px solid rgba(249,115,22,0.18)" : "1px solid rgba(255,255,255,0.09)",
                color: slide1KeyframeStatus === "generating" ? "#3E3B37" : slide1KeyframeStatus === "generated" ? "#FB923C" : "#A09D9A",
                fontSize: 12, fontWeight: 700, cursor: slide1KeyframeStatus === "generating" ? "not-allowed" : "pointer",
              }}
            >
              {slide1KeyframeStatus === "generating" ? "Generating 4:5 keyframe… (20–40s)" : slide1KeyframeStatus === "generated" ? "↺ Regenerate Slide 1 Keyframe" : "Generate Slide 1 Keyframe (OpenAI)"}
            </button>

            {slide1KeyframeStatus === "failed" && (
              <p style={{ color: "#f87171", fontSize: 10, marginTop: 6 }}>Keyframe generation failed. Check OPENAI_API_KEY in .env.local.</p>
            )}

            {slide1KeyframeUrl && slide1KeyframeStatus === "generated" && (
              <div style={{ marginTop: 10 }}>
                <div style={{ position: "relative", width: 120, aspectRatio: "4 / 5", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slide1KeyframeUrl} alt="Slide 1 keyframe" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <p style={{ color: "#252220", fontSize: 9, marginTop: 4 }}>Still keyframe only — not final motion output</p>
              </div>
            )}
          </div>

          {/* Step 2 — Motion from keyframe */}
          <div>
            <p style={{ color: slide1KeyframeStatus === "generated" ? "#6B6865" : "#252220", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Step 2 — Generate Motion From Keyframe (Runway)
            </p>
            <button
              onClick={handleGenerateSlide1Motion}
              disabled={slide1KeyframeStatus !== "generated" || slide1MotionStatus === "generating"}
              style={{
                width: "100%", height: 40, borderRadius: 10,
                background: slide1KeyframeStatus !== "generated" ? "rgba(255,255,255,0.01)" : slide1MotionStatus === "generating" ? "rgba(255,255,255,0.02)" : slide1MotionStatus === "generated" ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.04)",
                border: slide1KeyframeStatus !== "generated" ? "1px solid rgba(255,255,255,0.04)" : slide1MotionStatus === "generating" ? "1px solid rgba(255,255,255,0.06)" : slide1MotionStatus === "generated" ? "1px solid rgba(34,197,94,0.18)" : "1px solid rgba(255,255,255,0.09)",
                color: slide1KeyframeStatus !== "generated" ? "#1A1816" : slide1MotionStatus === "generating" ? "#3E3B37" : slide1MotionStatus === "generated" ? "#4ade80" : "#A09D9A",
                fontSize: 12, fontWeight: 700,
                cursor: slide1KeyframeStatus !== "generated" || slide1MotionStatus === "generating" ? "not-allowed" : "pointer",
              }}
            >
              {slide1KeyframeStatus !== "generated"
                ? "Generate Slide 1 Motion — Keyframe Required First"
                : slide1MotionStatus === "generating"
                ? "Animating keyframe… (60–120s)"
                : slide1MotionStatus === "generated"
                ? "↺ Regenerate Slide 1 Motion"
                : "Generate Slide 1 Motion From Keyframe (Runway)"}
            </button>

            {slide1MotionStatus === "generating" && (
              <p style={{ color: "#3E3B37", fontSize: 10, textAlign: "center", marginTop: 6 }}>
                Runway is animating the keyframe. Do not close this tab.
              </p>
            )}

            {slide1MotionStatus === "failed" && slide1MotionError && (
              <div style={{ marginTop: 10, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ color: "#f87171", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>Motion generation failed</p>
                <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.6 }}>{slide1MotionError}</p>
              </div>
            )}
          </div>

          {/* Step 3 — Ratio Validation (shown once video exists) */}
          {slide1MotionStatus === "generated" && (
            <div style={{ marginTop: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "#6B6865", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                Step 3 — Ratio Validation (browser onLoadedMetadata)
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{
                  background: slide1RatioStatus === "passed_4_5" ? "rgba(34,197,94,0.08)" : slide1RatioStatus === "failed" ? "rgba(239,68,68,0.08)" : "rgba(249,115,22,0.08)",
                  border: `1px solid ${slide1RatioStatus === "passed_4_5" ? "rgba(34,197,94,0.2)" : slide1RatioStatus === "failed" ? "rgba(239,68,68,0.2)" : "rgba(249,115,22,0.2)"}`,
                  borderRadius: 6, padding: "3px 10px",
                  color: slide1RatioStatus === "passed_4_5" ? "#4ade80" : slide1RatioStatus === "failed" ? "#f87171" : "#FB923C",
                  fontSize: 10, fontWeight: 700,
                }}>
                  {slide1RatioStatus === "passed_4_5" ? "✓ Ratio 4:5 — passed" : slide1RatioStatus === "failed" ? "✗ Ratio failed — not 4:5" : "⋯ Validating ratio…"}
                </span>
              </div>
              {slide1RatioStatus === "failed" && (
                <p style={{ color: "#f87171", fontSize: 10, marginTop: 8, lineHeight: 1.55 }}>
                  This video is not 4:5 and cannot be used as final motion background. Provider output must be re-evaluated.
                </p>
              )}
              {slide1RatioStatus === "unknown" && (
                <p style={{ color: "#3E3B37", fontSize: 10, marginTop: 8, lineHeight: 1.55 }}>
                  Video ratio has not been validated yet. Load the video to measure dimensions.
                </p>
              )}
            </div>
          )}

          {/* Pipeline status summary */}
          <div style={{ marginTop: 14, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ color: "#252220", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Slide 1 Pipeline Status</p>
            {(
              [
                {
                  label: "Keyframe",
                  value: slide1KeyframeStatus === "generated" ? "generated" : slide1KeyframeStatus === "generating" ? "generating" : slide1KeyframeStatus === "failed" ? "failed" : "missing",
                  pass: slide1KeyframeStatus === "generated",
                  fail: slide1KeyframeStatus === "failed",
                },
                {
                  label: "Motion",
                  value: slide1MotionStatus === "generated" ? "generated" : slide1MotionStatus === "generating" ? "generating" : slide1MotionStatus === "failed" ? "failed" : "missing",
                  pass: slide1MotionStatus === "generated",
                  fail: slide1MotionStatus === "failed",
                },
                {
                  label: "Ratio",
                  value: slide1RatioStatus === "passed_4_5" ? "passed 4:5" : slide1RatioStatus === "failed" ? "failed — not 4:5" : "unknown",
                  pass: slide1RatioStatus === "passed_4_5",
                  fail: slide1RatioStatus === "failed",
                },
              ] as { label: string; value: string; pass: boolean; fail: boolean }[]
            ).map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 5, marginBottom: 5, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color: "#3E3B37", fontSize: 10, fontWeight: 600 }}>{row.label}</span>
                <span style={{ color: row.pass ? "#4ade80" : row.fail ? "#f87171" : "#FB923C", fontSize: 10, fontWeight: 700 }}>{row.value}</span>
              </div>
            ))}
            <p style={{ color: "#252220", fontSize: 9, marginTop: 2 }}>
              All 3 must pass · Ratio passed_4_5 required · 8/8 slides needed for Motion Gate
            </p>
          </div>

          {/* Overall note */}
          <div style={{ marginTop: 10, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.10)", borderRadius: 8, padding: "8px 12px" }}>
            <p style={{ color: "#f87171", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>MOTION NOT READY — 1/8 SLIDES</p>
            <p style={{ color: "#52504E", fontSize: 10, lineHeight: 1.55 }}>
              Slide 1 is the first-frame motion spike. All 8 slides must be generated and ratio-validated before Motion Gate clears.
            </p>
          </div>
        </div>

        {/* ── Generate All Motion Slides (disabled — no provider) ── */}
        <div style={{ marginBottom: 24 }}>
          <button
            disabled
            style={{ width: "100%", height: 46, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "#1A1816", fontSize: 13, fontWeight: 700, cursor: "not-allowed", letterSpacing: "0.02em" }}
          >
            Generate All 8 Motion Slides — Motion Provider Required
          </button>
          <p style={{ color: "#252220", fontSize: 10, textAlign: "center", marginTop: 6 }}>
            Connect Runway / Kling / Pika / Remotion to enable motion generation
          </p>
        </div>

        {/* ── Motion Preview ────────────────────────────────────── */}
        <MotionPreviewPanel
          slides={slides}
          selectedSlide={selectedMotionSlide}
          onSelect={setSelectedMotionSlide}
          motionVideoUrls={motionVideoUrls}
        />

        {/* ── Per-Slide Motion Status ───────────────────────────── */}
        <SlideMotionStatus slides={slides} />

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 28 }} />

        {/* ── Caption ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700 }}>Caption</p>
              <p style={{ color: "#3E3B37", fontSize: 11, marginTop: 2 }}>{caption.length} characters</p>
            </div>
            <CopyButton text={caption} label="Copy Caption" />
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px" }}>
            <p style={{ color: "#A09D9A", fontSize: 13, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{caption}</p>
          </div>
        </div>

        {/* ── Hashtags ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700 }}>Hashtags</p>
            <CopyButton text={hashtags.join(" ")} label="Copy All" />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {hashtags.map((tag) => (
              <span key={tag} style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.14)", borderRadius: 20, padding: "5px 14px", color: "#FB923C", fontSize: 13 }}>{tag}</span>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 24 }} />

        {/* ── Checklist ────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Motion Launch Checklist</p>
          <p style={{ color: "#3E3B37", fontSize: 11, marginBottom: 14 }}>Instagram 未串接 — 依照以下步驟準備 motion slides 後手動發布</p>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
            {launch_checklist.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 16px", borderBottom: i < launch_checklist.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i < 3 ? "rgba(59,130,246,0.02)" : "transparent" }}>
                <span style={{ color: i < 3 ? "#60a5fa" : "#3E3B37", fontSize: 10, fontWeight: 700, fontFamily: "monospace", flexShrink: 0, marginTop: 1 }}>{String(i + 1).padStart(2, "0")}</span>
                <p style={{ color: i < 3 ? "#A09D9A" : "#6B6865", fontSize: 12, lineHeight: 1.6 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 28 }} />

        {/* ── Canva Motion Pack ─────────────────────────────────── */}
        <CanvaMotionPackSection />

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 24 }} />

        {/* ── Debug Sections ────────────────────────────────────── */}
        <p style={{ color: "#252220", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Debug Sections</p>

        <CollapsibleSection title="Still Preview Pipeline" subtitle="keyframe only · not final output · static image ≠ motion ready">
          <StillPreviewPipeline
            slides={slides}
            artworks={artworks}
            generating={generating}
            generatingSlide={generatingSlide}
            selectedArtwork={selectedArtwork}
            onSelect={setSelectedArtwork}
            onGenerateAll={handleGenerateAll}
            onCancel={() => { cancelRef.current = true; }}
            onClearAll={() => setArtworks(slides.map(emptyArtwork))}
            onRegenerate={handleRegenerate}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Still Preview Quality Gate" subtitle="debug only · still_preview ≠ final output">
          <StillGatePanel gate={quality_gate} />
        </CollapsibleSection>

        <CollapsibleSection title="Motion Generation Prompts" subtitle="per-slide video prompts">
          <MotionPromptLayer slides={slides} />
        </CollapsibleSection>

        <CollapsibleSection title="Keyframe Image Prompts" subtitle="still_preview prompts for OpenAI">
          <StillPreviewPromptLayer slides={slides} />
        </CollapsibleSection>

        <CollapsibleSection title="Content Layer" subtitle="8 張文案 · main / support / highlight">
          <ContentLayer slides={slides} />
        </CollapsibleSection>

        <CollapsibleSection title="Typography Layer" subtitle="template · overlay · readability">
          <TypographyLayer slides={slides} />
        </CollapsibleSection>

        <CollapsibleSection title="CSS Gradient Placeholder" subtitle="not final output · gradients only · no real background">
          <CSSPreviewLayer slides={slides} />
        </CollapsibleSection>

        <CollapsibleSection title="Manual Fit Room" subtitle="debug fallback · upload still asset to test typography">
          <ManualFitRoom
            slides={slides}
            localStates={localStates}
            controls={controls}
            fitRoomSlide={fitRoomSlide}
            onSlideSelect={setFitRoomSlide}
            onFileUpload={handleFileUpload}
            onRemoveAsset={handleRemoveAsset}
            onApprove={handleApprove}
            onReject={handleReject}
            onReviewNote={handleReviewNote}
            onControlChange={handleControlChange}
            onResetControls={handleResetControls}
          />
        </CollapsibleSection>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 24 }}>
          <p style={{ color: "#252220", fontSize: 10, lineHeight: 1.7 }}>
            Motion Launch Pipeline · Internal debug only · Not in main navigation
            <br />
            Phoenix did not post to Instagram · No production writes · Manual launch only
          </p>
        </div>

      </div>
    </div>
  );
}
