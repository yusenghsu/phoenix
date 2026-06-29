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
  type ProviderRatioStatus,
  validateProviderRatio,
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
import {
  SLIDE_MOTION_CONFIGS,
  type SlideMotionConfig,
} from "@/lib/launch/slide-motion-config";

// ── Dark theme color tokens ───────────────────────────────────────────────────
const UI = {
  text:       "#F8F4EA",   // primary headings
  textSoft:   "#CFC7BA",   // general body text
  textMuted:  "#9B9387",   // supporting / label text
  textFaint:  "#6F675E",   // disabled only — never for important info
  orange:     "#F97316",
  orangeSoft: "#FDBA74",
  green:      "#4ADE80",
  red:        "#F87171",
  blue:       "#60A5FA",
};

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

// Normal motion prompt — matches the route default; passed explicitly for attempt history tracking.
const SLIDE1_MOTION_PROMPT =
  "Turn this 4:5 vertical keyframe into a subtle cinematic motion background. " +
  "Keep the composition and aspect ratio. The young insurance salesperson stays on the right side, " +
  "looking at the phone. Add very slow push-in camera movement, soft passing car lights in the background, " +
  "subtle phone glow on the face, minimal subject movement, quiet night atmosphere, restrained emotional tension. " +
  "Keep the left side clean and dark for Chinese text overlay. " +
  "No text, no logo, no fast motion, no exaggerated acting, no warped face, no distorted hands.";

// Safe retry prompt — use when normal prompt causes INTERNAL.BAD_OUTPUT or similar Runway failure.
const SLIDE1_SAFE_RETRY_PROMPT =
  "Turn this vertical portrait image into a subtle cinematic video. " +
  "Keep the same composition. Use a very slow push-in camera movement. " +
  "Keep the person stable and natural. Add only slight background light movement and subtle phone glow. " +
  "Do not change the face, hands, clothing, phone, or body shape. " +
  "No text, no logos, no fast motion, no dramatic acting, no camera shake, no distortion.";

// Safer keyframe prompt — more face/hand detail, less dark, better suited for Runway image-to-video.
const SLIDE1_SAFER_KEYFRAME_PROMPT =
  "realistic cinematic vertical 4:5 portrait image, Taiwan quiet city street at night, " +
  "a young Taiwanese insurance salesperson standing on the right third of the frame, " +
  "looking down at a phone held naturally near chest level, calm and hesitant expression, " +
  "dark navy business casual jacket, warm street lights, soft background bokeh, " +
  "enough visible face detail, clean dark negative space on the left half for Chinese text overlay, " +
  "documentary realism, premium dark orange mood, stable natural pose, simple hands, " +
  "no readable text, no logos, no cartoon, no anime, no exaggerated expression, " +
  "no extreme darkness, no fashion ad, no corporate stock photo";

const SLIDE1_SAFER_KEYFRAME_NEGATIVE =
  "text, readable signs, logos, watermark, cartoon, anime, orange suit, luxury fashion, " +
  "influencer style, overbright lighting, extreme darkness, distorted hands, extra fingers, " +
  "malformed phone, fake advertising style, stock photo look";

// Slide 2 / PAIN — low-risk keyframe prompt
// 主題：你怕的不是被拒絕，是被貼上「變現實」的標籤
// 場景：空桌 + 手機 + 咖啡 + 模糊背景，作為 fallback 首幀（#070D：人物畫面不是自動失敗原因）
const SLIDE2_LOWRISK_KEYFRAME_PROMPT =
  "nighttime cafe corner, an empty table with a faintly glowing phone screen — " +
  "absolutely no readable text on phone screen — a cup of coffee placed beside it, " +
  "the chair across the table is empty, background shows only blurry indistinct silhouettes " +
  "and warm amber ambient lighting, mood is awkward and pressured, afraid of being misunderstood by friends, " +
  "cinematic look, low-key lighting, black-gold-orange color grade, 4:5 vertical composition, " +
  "large dark negative space in upper-left area reserved for Chinese text overlay, " +
  "no people in foreground, no clear face, no clear hands, no readable text anywhere";

const SLIDE2_LOWRISK_KEYFRAME_NEGATIVE =
  "clear face, close-up face, person in foreground, detailed hands, readable text, phone message text, " +
  "logo, signboard text, two people talking face to face, romance, couple, smiling, bright daytime, " +
  "cheerful mood, sales presentation, office meeting, distorted face, extra fingers, deformed hands, " +
  "coffee shop conversation, friends chatting";

// Slide 2 / PAIN — low-risk motion prompt
// 完全不提臉部 / 手部 / 人物詞彙，只描述靜物與運鏡，降低 Runway content filter 風險
const SLIDE2_LOWRISK_MOTION_PROMPT =
  "Create a very subtle cinematic motion from this vertical keyframe. Keep the scene almost still. " +
  "Slow camera push-in only. Slight warm light flicker. Very subtle bokeh movement in the background. " +
  "Preserve the table, phone, coffee cup, chair, lighting, and dark negative space. " +
  "No text. No logo. No new objects. No dramatic movement. No composition change. " +
  "Keep the phone screen unchanged.";

// Diagnostic data returned by the Runway failure route response
interface RunwayDiagnostic {
  error: string;
  task_id?: string;
  failure_code?: string;
  failure_message?: string;
  debug_hint?: string;
}

interface MotionAttempt {
  attempt_number: number;
  prompt_mode: "normal" | "safe";
  task_id?: string;
  status: "generating" | "generated" | "failed";
  failure_code?: string;
  failure_message?: string;
  created_at: string;
}

// Per-slide motion pipeline state — bridges old slide1* state and future 8-slide state
interface SlideMotionState {
  slideId: string;
  manifestKey: string;
  keyframeStatus: "missing" | "generating" | "generated" | "failed";
  keyframeUrl?: string;
  motionStatus: "missing" | "generating" | "generated" | "failed";
  motionError?: RunwayDiagnostic;
  providerRatioStatus: "unknown" | "accepted_intermediate" | "failed";
  providerRatioDims?: { width: number; height: number };
  providerRatioNote?: string;
  compositionStatus: "missing" | "needed" | "composing" | "composed" | "failed";
  finalRatioStatus: "unknown" | "passed_4_5";
  finalVideoUrl?: string;
  intermediateVideoUrl?: string;
  composingError?: string;
  motionAttempts: MotionAttempt[];
  recoverTaskId: string;
  recoverStatus: "idle" | "recovering" | "recovered" | "failed";
  recoverError?: string;
  recoverDiagnostic?: { attempted_endpoint?: string; runway_http_status?: number; hint?: string };
  lowRiskKeyframe?: boolean;
}

function createEmptySlideMotionState(slideIndex: number): SlideMotionState {
  const config = SLIDE_MOTION_CONFIGS[slideIndex];
  return {
    slideId: config?.slideId ?? `slide-0${String(slideIndex + 1).padStart(2, "0")}`,
    manifestKey: config?.id ?? `slide_0${String(slideIndex + 1).padStart(2, "0")}`,
    keyframeStatus: "missing",
    motionStatus: "missing",
    providerRatioStatus: "unknown",
    compositionStatus: "missing",
    finalRatioStatus: "unknown",
    motionAttempts: [],
    recoverTaskId: "",
    recoverStatus: "idle",
  };
}

function getEffectiveCompositionStatus(s: SlideMotionState): SlideMotionState["compositionStatus"] {
  return s.finalVideoUrl && s.finalRatioStatus === "passed_4_5" ? "composed" : s.compositionStatus;
}

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
    <button onClick={handle} style={{ height: small ? 28 : 34, paddingLeft: small ? 10 : 14, paddingRight: small ? 10 : 14, borderRadius: 7, background: copied ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)", border: copied ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(255,255,255,0.08)", color: copied ? "#4ade80" : "#9B9387", fontSize: small ? 10 : 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
      {copied ? "✓ 已複製" : label}
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
    <span style={{ color: "#9B9387", fontSize: 10, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.04em" }}>
      {String(n).padStart(2, "0")}/{String(total).padStart(2, "0")}
    </span>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ color: "#9B9387", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{label}</p>
      <p style={{ color: "#CFC7BA", fontSize: 11 }}>{value}</p>
    </div>
  );
}

function CollapsibleSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 10 }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: "100%", height: 42, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 16, paddingRight: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: open ? "10px 10px 0 0" : 10, color: "#CFC7BA", fontSize: 11, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
        <div>
          <span>{title}</span>
          {subtitle && <span style={{ color: "#9B9387", fontSize: 9, fontWeight: 400, marginLeft: 8 }}>{subtitle}</span>}
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
            動態背景供應商未連接
          </p>
          <p style={{ color: "#CFC7BA", fontSize: 11, lineHeight: 1.65, marginBottom: 14 }}>
            Phoenix 需要支援<strong style={{ color: "#CFC7BA" }}>垂直格式的動態供應商</strong>來生成 4:5 背景影片。Canva AI 影片僅支援 16:9，不符合 4:5 要求。
          </p>

          {/* Primary motion providers */}
          <p style={{ color: "#9B9387", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            主要｜動態背景（4:5 / 9:16 直式）
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {motionProviders.map((p) => (
              <span key={p.id} style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 6, padding: "3px 10px", color: "#f87171", fontSize: 10 }}>
                {p.label}
              </span>
            ))}
          </div>

          {/* Composition/export providers */}
          <p style={{ color: "#9B9387", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
            合成／輸出（需外部影片輸入）
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {compositionProviders.map((p) => (
              <span key={p.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "3px 10px", color: "#9B9387", fontSize: 10 }}>
                {p.label}
              </span>
            ))}
          </div>

          {/* Fallback note */}
          <div style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.10)", borderRadius: 8, padding: "8px 10px" }}>
            <p style={{ color: "#FB923C", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 3 }}>僅作備用</p>
            <p style={{ color: "#CFC7BA", fontSize: 10, lineHeight: 1.55 }}>
              OpenAI 4:5 靜態圖 + Canva 平移縮放動畫，非真正電影感動態背景，不滿足動態門檻。
            </p>
          </div>

          <p style={{ color: "#9B9387", fontSize: 10, marginTop: 10 }}>
            在 .env.local 設定 RUNWAY_API_KEY 以啟用 Runway。詳見 docs/canva-motion-workflow.md。
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Provider Capability Guard ─────────────────────────────────────────────────

function ProviderCapabilityPanel() {
  const boolLabel = (v: boolean | "unknown") =>
    v === "unknown" ? "未知" : v ? "是" : "否";
  const boolColor = (v: boolean | "unknown") =>
    v === "unknown" ? "#FB923C" : v ? "#4ade80" : "#f87171";

  return (
    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ color: "#CFC7BA", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
          動態供應商能力驗證
        </p>
        <p style={{ color: "#CFC7BA", fontSize: 11, lineHeight: 1.65 }}>
          最終輸出要求：<strong style={{ color: "#CFC7BA" }}>4:5 · 1080×1350 · MP4</strong>。
          每個供應商的輸出比例必須在生成後驗證。
          不假設任何輸入尺寸的比例，包括圖轉影片。
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
                    未驗證
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
                {cap.can_be_primary_provider ? "主要供應商已核准" : "未核准為主要供應商"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ color: "#9B9387", fontSize: 9 }}>
                原生 4:5：<span style={{ color: boolColor(cap.supports_native_4_5) }}>{boolLabel(cap.supports_native_4_5)}</span>
              </span>
              <span style={{ color: "#9B9387", fontSize: 9 }}>
                9:16：<span style={{ color: boolColor(cap.supports_9_16) }}>{boolLabel(cap.supports_9_16)}</span>
              </span>
              <span style={{ color: "#9B9387", fontSize: 9 }}>
                自訂解析度：<span style={{ color: boolColor(cap.supports_custom_resolution) }}>{boolLabel(cap.supports_custom_resolution)}</span>
              </span>
              {cap.requires_final_composition_to_4_5 && (
                <span style={{ color: "#9B9387", fontSize: 9 }}>
                  最終 4:5 合成：<span style={{ color: "#FB923C" }}>必須</span>
                </span>
              )}
            </div>
            <p style={{ color: "#9B9387", fontSize: 10, lineHeight: 1.55 }}>{cap.notes}</p>
          </div>
        ))}
      </div>
      <p style={{ color: "#9B9387", fontSize: 10, marginTop: 10 }}>
        比例狀態透過 <span style={{ color: "#9B9387", fontFamily: "monospace" }}>video.videoWidth / video.videoHeight</span>（瀏覽器 onLoadedMetadata）測量。通過 4:5 是進入審核前的必要條件。
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
      <p style={{ color: "#9B9387", fontSize: 11, lineHeight: 1.55 }}>{dim.reason}</p>
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
          <p style={{ color: "#FAFAF9", fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>動態門檻</p>
          <p style={{ color: "#9B9387", fontSize: 11, marginTop: 2 }}>Motion-first · 無 video = 0 · 靜態圖不提高 motion 分數</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
          <div style={{ background: statusBg, border: `1px solid ${statusBd}`, borderRadius: 8, padding: "6px 12px" }}>
            <p style={{ color: "#9B9387", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 3 }}>動態流程狀態</p>
            <p style={{ color: statusColor, fontSize: 10, fontWeight: 700 }}>
              {gate.motion_ready
                ? "可進行人工審核"
                : motionNotReady
                ? "動態尚未就緒"
                : "動態尚未就緒"}
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
            {humanApproved ? "✓ 已核准手動發布" : "標記為已核准手動發布"}
          </button>
          {humanApproved && <p style={{ color: "#9B9387", fontSize: 10, textAlign: "center", marginTop: 6 }}>僅本地狀態｜無生產環境寫入｜未串接 IG</p>}
        </div>
      )}

      {gate.blocking_reasons.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
          <p style={{ color: "#f87171", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            阻塞項目｜動態尚未就緒（{gate.blocking_reasons.length}）
          </p>
          {gate.blocking_reasons.map((r, i) => (
            <p key={i} style={{ color: "#CFC7BA", fontSize: 11, lineHeight: 1.55, marginBottom: 4 }}>✗ {r.split(":")[0]}</p>
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
  slideMotionStates,
}: {
  slides: LaunchSlide[];
  selectedSlide: number;
  onSelect: (i: number) => void;
  slideMotionStates: SlideMotionState[];
}) {
  const safeIndex =
    Number.isInteger(selectedSlide) && selectedSlide >= 0 && selectedSlide < slides.length
      ? selectedSlide
      : 0;
  const current = slides[safeIndex];
  if (!current) return null;
  const state = slideMotionStates[safeIndex] ?? createEmptySlideMotionState(safeIndex);
  const isFinal = !!state.finalVideoUrl;
  const currentVideoUrl = state.finalVideoUrl ?? state.intermediateVideoUrl ?? current.motion_asset.background_video_url;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 2 }}>動態預覽</p>
        <p style={{ color: "#9B9387", fontSize: 11 }}>背景影片 + 文字疊加｜循環靜音播放｜4:5</p>
      </div>

      {/* Featured */}
      <div style={{ marginBottom: 14 }}>
        <MotionSlidePreview
          slide={current}
          videoUrl={currentVideoUrl}
          size="featured"
          isFinalComposed={isFinal}
        />
      </div>

      {/* Thumbnail grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {slides.map((s, i) => {
          const st = slideMotionStates[i];
          const thumbUrl = st?.finalVideoUrl ?? st?.intermediateVideoUrl ?? s.motion_asset.background_video_url;
          return (
            <button key={i} onClick={() => onSelect(i)} style={{ border: i === selectedSlide ? "1.5px solid rgba(249,115,22,0.45)" : "1px solid rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden", background: "none", padding: 0, cursor: "pointer" }}>
              <MotionSlidePreview slide={s} videoUrl={thumbUrl} size="thumbnail" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Per-slide Motion Status ───────────────────────────────────────────────────

function SlideMotionStatus({ slides }: { slides: LaunchSlide[] }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ color: "#CFC7BA", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>單張動態狀態</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {slides.map((s, i) => {
          const ma = s.motion_asset;
          const isReady = ma.status === "video_generated" || ma.status === "composed" || ma.status === "approved";
          const isFailed = ma.status === "failed";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: isReady ? "rgba(34,197,94,0.04)" : isFailed ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.015)", border: `1px solid ${isReady ? "rgba(34,197,94,0.12)" : isFailed ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.05)"}`, borderRadius: 10, padding: "9px 13px" }}>
              <span style={{ color: "#9B9387", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>{String(s.slide_number).padStart(2, "0")}</span>
              <RoleBadge label={s.role_label} />
              <span style={{ color: "#CFC7BA", fontSize: 10, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.main_lines[0] ?? s.main_copy}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "2px 8px", flexShrink: 0, color: isReady ? "#4ade80" : isFailed ? "#f87171" : "#FB923C", background: isReady ? "rgba(34,197,94,0.08)" : isFailed ? "rgba(239,68,68,0.08)" : "rgba(249,115,22,0.08)", border: `1px solid ${isReady ? "rgba(34,197,94,0.18)" : isFailed ? "rgba(239,68,68,0.15)" : "rgba(249,115,22,0.2)"}` }}>
                {ma.status.replace("_", " ").toUpperCase()}
              </span>
              <span style={{ color: "#9B9387", fontSize: 9, flexShrink: 0 }}>{ma.provider}</span>
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
        <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>靜態預覽非最終輸出</p>
        <p style={{ color: "#CFC7BA", fontSize: 11, lineHeight: 1.6 }}>
          靜態圖片僅為首幀預覽。最終輸出必須為 MP4 動態圖卡，完成靜態預覽不代表輪播已準備好發布。
        </p>
      </div>

      {/* Generate controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {!generating ? (
          <button onClick={onGenerateAll} style={{ height: 38, paddingLeft: 18, paddingRight: 18, borderRadius: 10, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#FB923C", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            生成全部 8 張首幀（OpenAI）
          </button>
        ) : (
          <button onClick={onCancel} style={{ height: 38, paddingLeft: 18, paddingRight: 18, borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            取消
          </button>
        )}
        {readyCount > 0 && !generating && (
          <button onClick={onClearAll} style={{ height: 38, paddingLeft: 14, paddingRight: 14, borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#9B9387", fontSize: 11, cursor: "pointer" }}>
            清除全部
          </button>
        )}
        <span style={{ color: "#9B9387", fontSize: 10, alignSelf: "center" }}>
          {readyCount}/8 張首幀就緒 · 模型：OPENAI_IMAGE_MODEL 環境變數
        </span>
      </div>

      {generating && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "#FB923C", fontSize: 11, fontWeight: 600 }}>生成第 {generatingSlide !== null ? generatingSlide + 1 : "—"} 張…</span>
            <span style={{ color: "#9B9387", fontSize: 11 }}>{progress}/8</span>
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
              <span style={{ color: "#9B9387", fontSize: 10, fontFamily: "monospace" }}>{String(s.slide_number).padStart(2, "0")}</span>
              <RoleBadge label={s.role_label} />
              <span style={{ flex: 1, color: "#CFC7BA", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.main_lines[0]}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: a.final_artwork_status === "ready" ? "#4ade80" : a.background_status === "failed" ? "#f87171" : "#9B9387" }}>
                {a.final_artwork_status === "ready" ? "就緒" : a.background_status === "failed" ? "失敗" : "缺失"}
              </span>
              <button onClick={() => onRegenerate(i)} disabled={generating} style={{ height: 24, paddingLeft: 8, paddingRight: 8, borderRadius: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: generating ? "#6F675E" : "#CFC7BA", fontSize: 9, cursor: generating ? "not-allowed" : "pointer" }}>
                {a.final_artwork_status === "ready" ? "↺ 重生" : "生成"}
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
              <p key={i} style={{ color: "#CFC7BA", fontSize: 12, lineHeight: 1.68, margin: "0 0 1px 0" }}>{line}</p>
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
        <p style={{ color: "#CFC7BA", fontSize: 10, fontWeight: 700 }}>{label}</p>
        <CopyButton text={content} label={copyLabel} small />
      </div>
      <p style={{ color: "#CFC7BA", fontSize: 11, lineHeight: 1.6 }}>{exp ? content : preview}</p>
      {content.length > 110 && (
        <button onClick={() => setExp((v) => !v)} style={{ background: "none", border: "none", padding: 0, color: "#9B9387", fontSize: 10, cursor: "pointer", marginTop: 4 }}>
          {exp ? "↑ 收合" : "↓ 展開全文"}
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
              <span style={{ color: "#9B9387", fontSize: 9 }}>{ma.duration_seconds}s · {ma.fps}fps · {ma.aspect_ratio}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <FieldRow label="鏡頭運動" value={ma.camera_motion} />
              <FieldRow label="主體動作" value={ma.subject_motion} />
              <FieldRow label="氛圍" value={ma.atmosphere_motion} />
              <FieldRow label="文字安全區" value={ma.text_safe_area} />
            </div>
            <PromptBlock label="影片生成提示詞" content={ma.video_generation_prompt} copyLabel="複製" />
            <PromptBlock label="負面提示詞" content={ma.negative_prompt} copyLabel="複製負面提示詞" />
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
              <FieldRow label="情緒基調" value={sp.mood} />
              <FieldRow label="文字安全區" value={sp.text_safe_area} />
              <FieldRow label="鏡頭" value={sp.camera_direction} />
              <FieldRow label="打光方向" value={sp.lighting_direction} />
            </div>
            <PromptBlock label="圖片生成提示詞" content={sp.image_generation_prompt} copyLabel="複製" />
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
              <span style={{ color: "#9B9387", fontSize: 9, fontWeight: 700 }}>{t.template}</span>
              <span style={{ color: t.readability_score >= 9 ? "#4ade80" : "#f87171", fontSize: 9, fontWeight: 700 }}>可讀性 {t.readability_score}/10</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <FieldRow label="遮罩" value={t.overlay_mask} />
              <FieldRow label="強調" value={t.emphasis_style} />
              <FieldRow label="主文字" value={t.main_font_size} />
              <FieldRow label="副文字" value={t.support_font_size} />
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
          <button key={i} onClick={() => setActive(i)} style={{ height: 30, paddingLeft: 12, paddingRight: 12, borderRadius: 8, background: i === active ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.02)", border: i === active ? "1px solid rgba(249,115,22,0.2)" : "1px solid rgba(255,255,255,0.06)", color: i === active ? "#FB923C" : "#9B9387", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
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
      <p style={{ color: "#9B9387", fontSize: 10, textAlign: "center" }}>CSS 漸層預覽｜非最終輸出｜不可發布</p>
    </div>
  );
}

// ── Debug: Manual Fit Room ────────────────────────────────────────────────────

function TypographyControlsPanel({ slide, controls, onChange, onReset }: { slide: LaunchSlide; controls: SlideTypographyControls; onChange: (k: string, v: unknown) => void; onReset: () => void }) {
  const lbl = { color: "#9B9387", fontSize: 9, fontWeight: 700 as const, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 4, display: "block" as const };
  const sel = (key: string, value: string) => ({
    value,
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(key, e.target.value),
    style: { width: "100%", height: 30, background: "#0E0C0A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#8C8784", fontSize: 11, padding: "0 8px", outline: "none" } as React.CSSProperties,
  });
  const slider = (label: string, key: string, value: number, min: number, max: number, display: string) => (
    <div><span style={lbl}>{label}: <span style={{ color: "#9B9387", fontWeight: 400 }}>{display}</span></span><input type="range" min={min} max={max} value={value} onChange={(e) => onChange(key, Number(e.target.value))} style={{ width: "100%" }} /></div>
  );
  return (
    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ color: "#CFC7BA", fontSize: 11, fontWeight: 700 }}>版面控制</p>
        <button onClick={onReset} style={{ height: 24, paddingLeft: 8, paddingRight: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 5, color: "#9B9387", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>重置</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ gridColumn: "span 2" }}>
          <span style={lbl}>模板</span>
          <select {...sel("template", controls.template)}>
            {["left-heavy","right-heavy","bottom-anchor","top-anchor","center-statement","split-tension"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        {slider("X 偏移", "x_offset", controls.x_offset, -20, 20, `${controls.x_offset}%`)}
        {slider("Y 偏移", "y_offset", controls.y_offset, -20, 20, `${controls.y_offset}%`)}
        {slider("文字寬度", "text_width", controls.text_width, 30, 85, `${controls.text_width}%`)}
        {slider("主文字縮放", "main_scale", Math.round(controls.main_scale * 100), 60, 180, `${controls.main_scale.toFixed(1)}×`)}
        {slider("副文字縮放", "support_scale", Math.round(controls.support_scale * 100), 60, 180, `${controls.support_scale.toFixed(1)}×`)}
        <div style={{ gridColumn: "span 2" }}>
          <span style={lbl}>遮罩</span>
          <select {...sel("overlay_mask", controls.overlay_mask)}>
            {["none","left-gradient","right-gradient","top-gradient","bottom-glass","center-vignette","full-darken"].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          {slider("遮罩強度", "mask_strength", controls.mask_strength, 0, 100, `${controls.mask_strength}%`)}
        </div>
        <div><span style={lbl}>文字顏色</span><select {...sel("text_color_mode", controls.text_color_mode)}><option value="white">white</option><option value="warm-white">warm-white</option></select></div>
        <div><span style={lbl}>強調</span><select {...sel("emphasis_style", controls.emphasis_style)}><option value="orange">orange</option><option value="underline">underline</option><option value="boxed">boxed</option><option value="none">none</option></select></div>
        <div style={{ gridColumn: "span 2" }}>
          <button onClick={() => onChange("footer_visible", !controls.footer_visible)} style={{ height: 28, paddingLeft: 12, paddingRight: 12, background: controls.footer_visible ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.02)", border: controls.footer_visible ? "1px solid rgba(249,115,22,0.2)" : "1px solid rgba(255,255,255,0.07)", borderRadius: 7, color: controls.footer_visible ? "#FB923C" : "#9B9387", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            頁尾 {controls.footer_visible ? "ON" : "OFF"}
          </button>
        </div>
      </div>
      <p style={{ color: "#9B9387", fontSize: 9, marginTop: 10 }}>圖卡預設：{slide.typography.template} · {slide.typography.overlay_mask}</p>
    </div>
  );
}

function UploadPanel({ slideIndex, localState, onFileUpload, onRemoveAsset, onApprove, onReject, onReviewNote }: { slideIndex: number; localState: LocalSlideState; onFileUpload: (i: number, file: File) => void; onRemoveAsset: (i: number) => void; onApprove: (i: number) => void; onReject: (i: number) => void; onReviewNote: (i: number, note: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAsset = localState.local_asset_status === "preview_uploaded" || localState.local_asset_status === "local_approved";
  return (
    <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
      <p style={{ color: "#CFC7BA", fontSize: 11, fontWeight: 700, marginBottom: 10 }}>上傳素材（僅限靜態預覽）</p>
      <input ref={inputRef} type="file" accept="image/*,video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileUpload(slideIndex, f); e.target.value = ""; }} style={{ display: "none" }} />
      <div style={{ display: "flex", gap: 8, marginBottom: hasAsset ? 8 : 0 }}>
        <button onClick={() => inputRef.current?.click()} style={{ flex: 1, height: 32, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 8, color: "#FB923C", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{hasAsset ? "替換" : "上傳圖片／影片"}</button>
        {hasAsset && <button onClick={() => onRemoveAsset(slideIndex)} style={{ height: 32, paddingLeft: 10, paddingRight: 10, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 8, color: "#f87171", fontSize: 11, cursor: "pointer" }}>移除</button>}
      </div>
      {localState.local_asset_status === "preview_uploaded" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <button onClick={() => onApprove(slideIndex)} style={{ flex: 1, height: 30, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, color: "#4ade80", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓ 本地核准</button>
            <button onClick={() => onReject(slideIndex)} style={{ flex: 1, height: 30, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✗ 拒絕</button>
          </div>
          <input type="text" value={localState.local_review_note ?? ""} onChange={(e) => onReviewNote(slideIndex, e.target.value)} placeholder="審核備註（選填）" style={{ width: "100%", height: 28, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, color: "#8C8784", fontSize: 11, padding: "0 8px", outline: "none", boxSizing: "border-box" }} />
        </>
      )}
    </div>
  );
}

function ManualFitRoom({ slides, localStates, controls, fitRoomSlide, onSlideSelect, onFileUpload, onRemoveAsset, onApprove, onReject, onReviewNote, onControlChange, onResetControls }: { slides: LaunchSlide[]; localStates: LocalSlideState[]; controls: SlideTypographyControls[]; fitRoomSlide: number; onSlideSelect: (i: number) => void; onFileUpload: (i: number, file: File) => void; onRemoveAsset: (i: number) => void; onApprove: (i: number) => void; onReject: (i: number) => void; onReviewNote: (i: number, note: string) => void; onControlChange: (i: number, k: string, v: unknown) => void; onResetControls: (i: number) => void }) {
  return (
    <div>
      <div style={{ background: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.12)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
        <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>手動排版室｜僅限除錯備用</p>
        <p style={{ color: "#CFC7BA", fontSize: 11 }}>上傳自己的素材以測試版面，這不是最終發布流程。</p>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {slides.map((s, i) => {
          const ls = localStates[i];
          const active = i === fitRoomSlide;
          let c = "#9B9387", bg = "rgba(255,255,255,0.02)", bd = "rgba(255,255,255,0.06)";
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
          <p style={{ color: "#9B9387", fontSize: 11 }}>
            {final_output_target} · {export_spec}
          </p>
        </div>
        <span style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 7, padding: "4px 10px", color: "#f87171", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", flexShrink: 0, marginTop: 2 }}>
          未連接
        </span>
      </div>

      {/* Status banner */}
      <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.10)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
        <p style={{ color: "#f87171", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
          Canva AI 影片在使用者測試中未能達到 4:5 要求
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <p style={{ color: "#CFC7BA", fontSize: 11, lineHeight: 1.6 }}>
            · 使用者測試 Canva AI 影片，目前輸出為<strong style={{ color: "#f87171" }}>僅 16:9</strong>，不適合作為主要 4:5 動態背景生成器。
          </p>
          <p style={{ color: "#CFC7BA", fontSize: 11, lineHeight: 1.6 }}>
            · Canva 仍可用於合成、模板排版、文字動畫和 MP4 輸出，需搭配外部垂直影片輸入。
          </p>
          <p style={{ color: "#CFC7BA", fontSize: 11, lineHeight: 1.6 }}>
            · 最終動態背景必須來自支援垂直格式的供應商：Runway、Kling 或 Pika。
          </p>
          <p style={{ color: "#CFC7BA", fontSize: 11, lineHeight: 1.6 }}>
            · 靜態圖 → Canva 平移縮放動畫僅作備用，非真正電影感動態背景。
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 5, padding: "2px 8px", color: "#f87171", fontSize: 9, fontWeight: 700 }}>
            AI 影片：僅 16:9｜不適用
          </span>
          <span style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.14)", borderRadius: 5, padding: "2px 8px", color: "#FB923C", fontSize: 9, fontWeight: 700 }}>
            合成／輸出：規劃中
          </span>
          <span style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 5, padding: "2px 8px", color: "#9B9387", fontSize: 9, fontWeight: 700 }}>
            API 狀態：{canva_api_status.toUpperCase()}
          </span>
        </div>
        <p style={{ color: "#9B9387", fontSize: 10, marginTop: 8 }}>
          詳見 docs/canva-motion-workflow.md
        </p>
      </div>

      {/* Bulk copy actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <CopyButton text={allPromptsText} label="複製全部 8 個提示詞" />
        <CopyButton text={templateSpecText} label="複製 8 頁模板規格" />
      </div>

      {/* Per-slide cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {slides.map((s, i) => {
          const promptText = buildSlidePromptText(s, i, slides.length);
          return (
            <div key={s.slide_id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#9B9387", fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>
                    {String(i + 1).padStart(2, "0")}/{String(slides.length).padStart(2, "0")}
                  </span>
                  <span style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.18)", borderRadius: 5, padding: "2px 8px", color: "#FB923C", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em" }}>
                    {s.role}
                  </span>
                  <span style={{ color: "#9B9387", fontSize: 9 }}>
                    {s.text_safe_area} text · {s.subject_position} subject · {s.duration_seconds}s · {s.aspect_ratio}
                  </span>
                </div>
                <CopyButton text={promptText} label="複製圖卡" small />
              </div>

              {/* Main copy preview */}
              <div style={{ marginBottom: 8 }}>
                {s.main_lines.map((line, li) => (
                  <p key={li} style={{ color: "#CFC7BA", fontSize: 13, fontWeight: 700, lineHeight: 1.4, margin: "0 0 1px 0" }}>
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
                  <p key={li} style={{ color: "#CFC7BA", fontSize: 11, lineHeight: 1.6, margin: 0 }}>{line}</p>
                ))}
              </div>

              {/* Video prompt preview */}
              <div style={{ background: "rgba(255,255,255,0.015)", borderRadius: 8, padding: "8px 10px" }}>
                <p style={{ color: "#9B9387", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                  Canva 影片提示詞
                </p>
                <p style={{ color: "#CFC7BA", fontSize: 10, lineHeight: 1.65 }}>
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
        <p style={{ color: "#CFC7BA", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
          Canva 整合清單
        </p>
        <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, overflow: "hidden" }}>
          {CANVA_INTEGRATION_CHECKLIST.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", borderBottom: i < CANVA_INTEGRATION_CHECKLIST.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ color: "#9B9387", fontSize: 9, fontFamily: "monospace", fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                [ ]
              </span>
              <p style={{ color: "#9B9387", fontSize: 11, lineHeight: 1.6 }}>{item}</p>
            </div>
          ))}
        </div>
        <p style={{ color: "#9B9387", fontSize: 10, marginTop: 8, lineHeight: 1.6 }}>
          詳見 docs/canva-motion-workflow.md · Path A（手動原型）· Path B（Connect API）· Path C（AI 影片 API，請勿假設已開放）
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
        <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 700 }}>靜態預覽門檻｜非動態門檻</p>
        <p style={{ color: "#CFC7BA", fontSize: 11, marginTop: 2 }}>靜態圖片完成不代表動態就緒，請勿以此作為發布信號。</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: "#FAFAF9", fontSize: 13, fontWeight: 700 }}>靜態預覽品質</span>
        <span style={{ color: "#FB923C", fontSize: 13, fontWeight: 700 }}>{gate.overall_score}/10</span>
      </div>
      {gate.blocking_reasons.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
          {gate.blocking_reasons.map((r, i) => <p key={i} style={{ color: "#CFC7BA", fontSize: 11, marginBottom: 3 }}>✗ {r.split(":")[0]}</p>)}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {gate.dimensions.map((d) => (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
            <span style={{ color: d.passed ? "#4ade80" : "#f87171", fontSize: 11 }}>{d.passed ? "✓" : "✗"} {d.name}</span>
            <span style={{ color: "#CFC7BA", fontSize: 11 }}>{d.score}/{d.max_score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Runway Diagnostic Panel ───────────────────────────────────────────────────

interface DiagManifestEntry {
  keyframe_url?: string;
  keyframe_mode?: string;
  low_risk_mode?: boolean;
  runway_motion_status?: string;
  runway_intermediate_video_url?: string;
  final_composition_status?: string;
  final_video_url?: string;
  final_ratio_status?: string;
  motion_prompt_mode?: string;
  motion_attempt_count?: number;
  last_failure?: { failure_code?: string; failure_message?: string; task_id?: string; timestamp?: string } | null;
  updated_at?: string;
}

function DiagRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <span style={{ color: "#6F675E", fontSize: 10, fontWeight: 600, width: 170, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ color: valueColor ?? "#CFC7BA", fontSize: 10, lineHeight: 1.5, wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

function RunwayDiagnosticPanel({ slide1State, slide2State }: { slide1State: SlideMotionState; slide2State: SlideMotionState }) {
  const [manifest, setManifest] = useState<Record<string, DiagManifestEntry> | null>(null);
  const [kfSizes, setKfSizes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/debug/final-launch/manifest")
      .then((r) => r.json())
      .then((d: { manifest?: Record<string, DiagManifestEntry> }) => setManifest(d.manifest ?? {}))
      .catch(() => setManifest({}));
  }, []);

  useEffect(() => {
    const urls = [slide1State.keyframeUrl, slide2State.keyframeUrl].filter(Boolean) as string[];
    for (const url of urls) {
      fetch(url, { method: "HEAD" })
        .then((r) => {
          const len = r.headers.get("content-length");
          setKfSizes((prev) => ({ ...prev, [url]: len ? `${(Number(len) / 1024).toFixed(1)} KB` : "(大小未知)" }));
        })
        .catch(() => setKfSizes((prev) => ({ ...prev, [url]: "(讀取失敗)" })));
    }
  }, [slide1State.keyframeUrl, slide2State.keyframeUrl]);

  // Evidence-based: single words like "face", "person", "hands" are NOT flagged.
  // Only explicit animation-command phrases that Runway's content filter has been shown to trigger.
  const ANIM_RISK_PHRASES = [
    "animate face", "animate faces", "animate hand", "animate hands",
    "animate person", "animate people", "animate the face",
    "create new people", "create new person", "add people", "add person",
    "close-up face", "extreme close-up", "detailed hand", "finger motion",
  ];
  const findHighRisk = (prompt: string) => ANIM_RISK_PHRASES.filter((p) => prompt.toLowerCase().includes(p));

  const slide2MotionPrompt = slide2State.lowRiskKeyframe ? SLIDE2_LOWRISK_MOTION_PROMPT : SLIDE_MOTION_CONFIGS[1].motionPrompt;
  const slide2HighRisk = findHighRisk(slide2MotionPrompt);
  const slide1HighRisk = findHighRisk(SLIDE1_MOTION_PROMPT);

  const slide2ManifestData = manifest?.slide_02;

  const slide2UiUrl = slide2State.keyframeUrl;
  const slide2ManifestUrl = slide2ManifestData?.keyframe_url;
  const urlsMatch = !!slide2UiUrl && !!slide2ManifestUrl && slide2UiUrl === slide2ManifestUrl;
  const urlMismatch = !!slide2UiUrl && !!slide2ManifestUrl && slide2UiUrl !== slide2ManifestUrl;

  const slide1SuccessAttempt = slide1State.motionAttempts.find((a) => a.status === "generated");
  const slide1LatestAttempt = slide1State.motionAttempts[0];
  const slide2Error = slide2State.motionError;

  const comparisons: [string, string, string][] = [
    ["endpoint", "POST /v1/image_to_video", "POST /v1/image_to_video"],
    ["model", "gen3a_turbo（預設）", "gen3a_turbo（預設）"],
    ["ratio", "832:1104", "832:1104"],
    ["duration", "5s", "5s"],
    ["promptImage", "data:image/png;base64,[省略]", "data:image/png;base64,[省略]"],
    ["image source", "本地 PNG → base64 data URI", "本地 PNG → base64 data URI"],
    ["promptText 前 80 字", SLIDE1_MOTION_PROMPT.slice(0, 80) + "…", slide2MotionPrompt.slice(0, 80) + "…"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Slide 1 — 成功 */}
      <div style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ color: "#4ade80", fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Slide 1 / HOOK — 成功任務</p>
        <DiagRow label="slide_id" value="slide-01" />
        <DiagRow label="keyframe_url" value={slide1State.keyframeUrl ?? "（未設定）"} />
        <DiagRow label="keyframe 存在" value={slide1State.keyframeUrl ? "✓ 是" : "✗ 否"} valueColor={slide1State.keyframeUrl ? "#4ade80" : "#f87171"} />
        <DiagRow label="keyframe 大小" value={slide1State.keyframeUrl ? (kfSizes[slide1State.keyframeUrl] ?? "讀取中…") : "—"} />
        <DiagRow label="intermediate_url" value={slide1State.intermediateVideoUrl ?? "（未生成）"} />
        <DiagRow label="final_video_url" value={slide1State.finalVideoUrl ?? "（未合成）"} />
        <DiagRow label="provider_ratio_status" value={slide1State.providerRatioStatus} valueColor={slide1State.providerRatioStatus === "accepted_intermediate" ? "#4ade80" : "#9B9387"} />
        <DiagRow label="final_ratio_status" value={slide1State.finalRatioStatus} valueColor={slide1State.finalRatioStatus === "passed_4_5" ? "#4ade80" : "#9B9387"} />
        <DiagRow label="Runway task_id" value={slide1SuccessAttempt?.task_id ?? slide1LatestAttempt?.task_id ?? "（未知）"} />
        <DiagRow label="prompt_mode" value={slide1SuccessAttempt?.prompt_mode ?? slide1LatestAttempt?.prompt_mode ?? "—"} />
        <DiagRow label="是否 image_to_video" value="✓ 是（/v1/image_to_video）" valueColor="#4ade80" />
        <DiagRow label="request ratio" value="832:1104" />
        <DiagRow label="model" value="gen3a_turbo（預設）" />
        <DiagRow label="duration" value="5s" />
        <div style={{ marginTop: 8 }}>
          <p style={{ color: "#6F675E", fontSize: 9, fontWeight: 600, marginBottom: 3 }}>motion prompt（前 500 字）</p>
          <pre style={{ color: "#9B9387", fontSize: 9, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 8, margin: 0 }}>{SLIDE1_MOTION_PROMPT.slice(0, 500)}</pre>
          {slide1HighRisk.length > 0 && <p style={{ color: "#fb923c", fontSize: 9, marginTop: 4 }}>⚠️ 高風險詞: {slide1HighRisk.join(", ")}</p>}
          {slide1HighRisk.length === 0 && <p style={{ color: "#4ade80", fontSize: 9, marginTop: 4 }}>✓ 無高風險詞</p>}
        </div>
      </div>

      {/* Slide 2 — 失敗 */}
      <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ color: "#f87171", fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Slide 2 / PAIN — 最近失敗任務</p>
        <DiagRow label="slide_id" value="slide-02" />
        <DiagRow label="keyframe_url" value={slide2State.keyframeUrl ?? "（未設定）"} />
        <DiagRow label="keyframe 存在" value={slide2State.keyframeUrl ? "✓ 是" : "✗ 否"} valueColor={slide2State.keyframeUrl ? "#4ade80" : "#f87171"} />
        <DiagRow label="keyframe 大小" value={slide2State.keyframeUrl ? (kfSizes[slide2State.keyframeUrl] ?? "讀取中…") : "—"} />
        <DiagRow label="lowRiskKeyframe" value={slide2State.lowRiskKeyframe ? "✓ true（低風險首幀）" : "✗ false（未標記）"} valueColor={slide2State.lowRiskKeyframe ? "#4ade80" : "#f87171"} />
        <DiagRow label="motionStatus" value={slide2State.motionStatus} valueColor={slide2State.motionStatus === "failed" ? "#f87171" : slide2State.motionStatus === "generated" ? "#4ade80" : "#9B9387"} />
        <DiagRow label="Runway task_id" value={slide2Error?.task_id ?? "（未取得）"} />
        <DiagRow label="failureCode" value={slide2Error?.failure_code ?? "—"} valueColor={slide2Error?.failure_code ? "#f87171" : "#9B9387"} />
        <DiagRow label="failureMessage" value={slide2Error?.failure_message ?? "—"} valueColor={slide2Error?.failure_message ? "#fb923c" : "#9B9387"} />
        <DiagRow label="是否 image_to_video" value="✓ 是（/v1/image_to_video）" valueColor="#4ade80" />
        <DiagRow label="request ratio" value="832:1104" />
        <DiagRow label="model" value="gen3a_turbo（預設）" />
        <DiagRow label="duration" value="5s" />
        <div style={{ marginTop: 8 }}>
          <p style={{ color: slide2State.lowRiskKeyframe ? "#4ade80" : "#fb923c", fontSize: 9, fontWeight: 700, marginBottom: 3 }}>
            {slide2State.lowRiskKeyframe ? "✓ 使用 SLIDE2_LOWRISK_MOTION_PROMPT" : "⚠️ 使用一般 motion prompt（高風險）"}
          </p>
          <pre style={{ color: "#9B9387", fontSize: 9, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 8, margin: 0 }}>{slide2MotionPrompt.slice(0, 500)}</pre>
          {slide2HighRisk.length > 0 && <p style={{ color: "#fb923c", fontSize: 9, marginTop: 4 }}>⚠️ 高風險詞（即使在 "Do not" 語境中 Runway 仍可能拒絕）: {slide2HighRisk.join(", ")}</p>}
          {slide2HighRisk.length === 0 && <p style={{ color: "#4ade80", fontSize: 9, marginTop: 4 }}>✓ 無高風險詞</p>}
        </div>
      </div>

      {/* Sanitized Request 比對 */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ color: "#CFC7BA", fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Sanitized Request 比對（無 API key）</p>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", gap: "4px 12px" }}>
          <span style={{ color: "#6F675E", fontSize: 9, fontWeight: 700 }}>欄位</span>
          <span style={{ color: "#4ade80", fontSize: 9, fontWeight: 700 }}>Slide 1（成功）</span>
          <span style={{ color: "#f87171", fontSize: 9, fontWeight: 700 }}>Slide 2（失敗）</span>
          {comparisons.flatMap(([field, s1, s2], i) => [
            <span key={`f${i}`} style={{ color: "#6F675E", fontSize: 9, paddingTop: 3 }}>{field}</span>,
            <span key={`s1${i}`} style={{ color: "#CFC7BA", fontSize: 9, paddingTop: 3, wordBreak: "break-all" }}>{s1}</span>,
            <span key={`s2${i}`} style={{ color: "#CFC7BA", fontSize: 9, paddingTop: 3, wordBreak: "break-all" }}>{s2}</span>,
          ])}
        </div>
        <p style={{ color: "#6F675E", fontSize: 9, marginTop: 8 }}>
          base URL: https://api.dev.runwayml.com · Authorization header 不顯示 · API key 不顯示
        </p>
      </div>

      {/* Keyframe URL 三方驗證 */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${urlMismatch ? "rgba(239,68,68,0.25)" : urlsMatch ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.06)"}`, borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ color: "#CFC7BA", fontSize: 11, fontWeight: 700, marginBottom: 10 }}>第 2 張 Keyframe URL 三方驗證</p>
        <DiagRow label="① UI 顯示 URL" value={slide2UiUrl ?? "（未設定）"} />
        <DiagRow label="② Manifest URL" value={slide2ManifestUrl ?? (manifest === null ? "讀取中…" : "（無記錄）")} />
        <DiagRow label="③ API 實際送出 URL" value={slide2UiUrl ?? "（同 UI — client 直接送 selectedState.keyframeUrl）"} />
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {urlsMatch && <p style={{ color: "#4ade80", fontSize: 10, fontWeight: 700 }}>✓ 三方一致 — UI ＝ Manifest ＝ API 送出素材</p>}
          {urlMismatch && (
            <>
              <p style={{ color: "#f87171", fontSize: 10, fontWeight: 700 }}>警告：第 2 張畫面素材與 API 實際送出素材不一致</p>
              <p style={{ color: "#9B9387", fontSize: 9, marginTop: 4 }}>建議：點選「還原已儲存素材」讓 UI 同步 manifest 的 keyframe URL</p>
            </>
          )}
          {slide2UiUrl && !slide2ManifestUrl && manifest !== null && (
            <p style={{ color: "#fb923c", fontSize: 10 }}>⚠️ UI 有 URL，但 manifest 無記錄 — generate-slide 可能未寫入</p>
          )}
          {!slide2UiUrl && !slide2ManifestUrl && manifest !== null && (
            <p style={{ color: "#6F675E", fontSize: 10 }}>— 兩者均未設定（首幀尚未產生）</p>
          )}
        </div>
      </div>

      {/* Runway 測試就緒狀態 */}
      {(() => {
        const kfOk = !!slide2UiUrl && !!slide2ManifestUrl && slide2UiUrl === slide2ManifestUrl;
        const promptOk = slide2HighRisk.length === 0;
        const ready = kfOk && promptOk;
        return (
          <div style={{ background: ready ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)", border: `1px solid ${ready ? "rgba(34,197,94,0.20)" : "rgba(239,68,68,0.20)"}`, borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ color: ready ? "#4ade80" : "#f87171", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
              {ready ? "✓ Slide 2 可測試 Runway" : "⊘ Slide 2 尚不可送入 Runway"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ color: kfOk ? "#4ade80" : "#f87171", fontSize: 10 }}>
                {kfOk ? "✓" : "✗"} 素材來源一致性：{kfOk ? "通過" : "不一致（請還原已儲存素材）"}
              </p>
              <p style={{ color: promptOk ? "#4ade80" : "#f87171", fontSize: 10 }}>
                {promptOk ? "✓" : "✗"} Prompt 安全性：{promptOk ? "通過（無高風險詞）" : `含高風險詞：${slide2HighRisk.join(", ")}`}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Prompt 驗證 */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ color: "#CFC7BA", fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Slide 2 Runway Prompt 驗證</p>
        {slide2State.lowRiskKeyframe ? (
          <p style={{ color: "#4ade80", fontSize: 10, marginBottom: 6 }}>✓ lowRiskKeyframe = true → 觸發 Runway 時使用 SLIDE2_LOWRISK_MOTION_PROMPT</p>
        ) : (
          <p style={{ color: "#f87171", fontSize: 10, marginBottom: 6, fontWeight: 700 }}>⚠️ lowRiskKeyframe 未設定 → 會使用一般 motion prompt（含高風險詞）</p>
        )}
        {slide2State.motionStatus === "missing" && (
          <p style={{ color: "#9B9387", fontSize: 10 }}>— 尚未觸發 Runway（motionStatus: missing）</p>
        )}
        {slide2HighRisk.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <p style={{ color: "#fb923c", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>Runway 可能仍拒絕（即使在 "Do not" 語境中）：</p>
            {slide2HighRisk.map((w) => (
              <p key={w} style={{ color: "#9B9387", fontSize: 9, paddingLeft: 10 }}>· &quot;{w}&quot;</p>
            ))}
          </div>
        )}
        {slide2HighRisk.length === 0 && <p style={{ color: "#4ade80", fontSize: 10 }}>✓ 無偵測到高風險詞</p>}
      </div>

      {/* Manifest slide_02 */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ color: "#CFC7BA", fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Manifest slide_02 原始資料</p>
        {manifest === null ? (
          <p style={{ color: "#6F675E", fontSize: 10 }}>讀取中…</p>
        ) : !slide2ManifestData ? (
          <p style={{ color: "#f87171", fontSize: 10 }}>⚠️ manifest 無 slide_02 記錄 — 首幀尚未產生或未寫入</p>
        ) : (
          <>
            {([
              ["keyframe_url", slide2ManifestData.keyframe_url ?? "（未設定）"],
              ["keyframe_mode", slide2ManifestData.keyframe_mode ?? "（未設定）"],
              ["low_risk_mode", String(slide2ManifestData.low_risk_mode ?? "（未設定）")],
              ["runway_motion_status", slide2ManifestData.runway_motion_status ?? "（未設定）"],
              ["runway_intermediate_video_url", slide2ManifestData.runway_intermediate_video_url ?? "（未設定）"],
              ["final_composition_status", slide2ManifestData.final_composition_status ?? "（未設定）"],
              ["final_video_url", slide2ManifestData.final_video_url ?? "（未設定）"],
              ["final_ratio_status", slide2ManifestData.final_ratio_status ?? "（未設定）"],
              ["motion_prompt_mode", slide2ManifestData.motion_prompt_mode ?? "（未設定）"],
              ["motion_attempt_count", String(slide2ManifestData.motion_attempt_count ?? "0")],
              ["last_failure.failure_code", slide2ManifestData.last_failure?.failure_code ?? "（無）"],
              ["last_failure.failure_message", slide2ManifestData.last_failure?.failure_message ?? "（無）"],
              ["last_failure.task_id", slide2ManifestData.last_failure?.task_id ?? "（無）"],
              ["last_failure.timestamp", slide2ManifestData.last_failure?.timestamp ?? "（無）"],
              ["updated_at", slide2ManifestData.updated_at ?? "（未設定）"],
            ] as [string, string][]).map(([k, v]) => <DiagRow key={k} label={k} value={v} />)}
          </>
        )}
      </div>

      {/* Evidence-based conclusion */}
      <div style={{ background: "rgba(251,146,60,0.03)", border: "1px solid rgba(251,146,60,0.12)", borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ color: "#FB923C", fontSize: 10, fontWeight: 700, marginBottom: 6 }}>目前判斷</p>
        <p style={{ color: "#CFC7BA", fontSize: 10, lineHeight: 1.7 }}>
          人物畫面不是自動失敗原因。請以素材來源一致性、Prompt 安全性與 Runway 實際回傳結果為準。
          若診斷區所有項目通過但 Runway 仍失敗，再考慮 Fallback 選項。
        </p>
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
  const [slide1MotionError, setSlide1MotionError] = useState<RunwayDiagnostic | undefined>(undefined);
  const [slide1ProviderRatioStatus, setSlide1ProviderRatioStatus] = useState<ProviderRatioStatus>("unknown");
  const [slide1ProviderRatioSource, setSlide1ProviderRatioSource] = useState<"metadata" | "declared_runway_request_ratio" | "unknown">("unknown");
  const [slide1ProviderRatioNote, setSlide1ProviderRatioNote] = useState<string | undefined>(undefined);
  const [slide1ProviderRatioDims, setSlide1ProviderRatioDims] = useState<{ width: number; height: number } | undefined>(undefined);
  const [slide1CompositionStatus, setSlide1CompositionStatus] = useState<"missing" | "needed" | "composing" | "composed" | "failed">("missing");
  const [slide1FinalRatioStatus, setSlide1FinalRatioStatus] = useState<RatioStatus>("unknown");
  const [slide1FinalVideoUrl, setSlide1FinalVideoUrl] = useState<string | undefined>(undefined);
  const [slide1ComposingError, setSlide1ComposingError] = useState<string | undefined>(undefined);
  const [motionAttempts, setMotionAttempts] = useState<MotionAttempt[]>([]);
  const attemptCountRef = useRef(0);
  const [hasSavedAssets, setHasSavedAssets] = useState(false);
  const [manifestRestoring, setManifestRestoring] = useState(false);
  const [recoverTaskId, setRecoverTaskId] = useState("019596b5-f932-4c39-a56f-d609f537bf30");
  const [recoverStatus, setRecoverStatus] = useState<"idle" | "recovering" | "recovered" | "failed">("idle");
  const [recoverError, setRecoverError] = useState<string | undefined>(undefined);
  const [recoverDiagnostic, setRecoverDiagnostic] = useState<{ attempted_endpoint?: string; runway_http_status?: number; hint?: string } | undefined>(undefined);

  // Still preview pipeline state (debug)
  const [artworks, setArtworks] = useState<SlideArtworkState[]>(() => slides.map(emptyArtwork));
  const [generating, setGenerating] = useState(false);
  const [generatingSlide, setGeneratingSlide] = useState<number | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState(0);
  const cancelRef = useRef(false);
  const [otherSlideStates, setOtherSlideStates] = useState<Record<number, SlideMotionState>>({});

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

  // Step 2: shared motion generation — tracks attempt history, supports normal and safe prompt modes
  const runSlide1MotionGeneration = useCallback(async (motionPrompt: string, promptMode: "normal" | "safe") => {
    if (!slide1KeyframeUrl) return;
    attemptCountRef.current += 1;
    const attemptNumber = attemptCountRef.current;
    const createdAt = new Date().toISOString();

    setSlide1MotionStatus("generating");
    setSlide1MotionError(undefined);

    const newAttempt: MotionAttempt = { attempt_number: attemptNumber, prompt_mode: promptMode, status: "generating", created_at: createdAt };
    setMotionAttempts((prev) => [newAttempt, ...prev].slice(0, 3));

    try {
      const res = await fetch("/api/debug/final-launch/generate-motion-from-keyframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slide_id: "slide-1",
          keyframe_url: slide1KeyframeUrl,
          motion_prompt: motionPrompt,
          duration_seconds: 5,
        }),
      });
      const data = (await res.json()) as {
        status: string;
        background_video_url?: string;
        error?: string;
        task_id?: string;
        failure_code?: string;
        failure_message?: string;
        debug_hint?: string;
      };
      if (data.status === "video_generated" && data.background_video_url) {
        setMotionVideoUrls((prev) => ({ ...prev, 0: data.background_video_url! }));
        setSlide1MotionStatus("generated");
        setSelectedMotionSlide(0);
        setMotionAttempts((prev) => prev.map((a) => a.attempt_number === attemptNumber ? { ...a, status: "generated", task_id: data.task_id } : a));
      } else {
        const diagnostic: RunwayDiagnostic = {
          error: data.error ?? "Unknown error from Runway",
          task_id: data.task_id,
          failure_code: data.failure_code,
          failure_message: data.failure_message,
          debug_hint: data.debug_hint,
        };
        setSlide1MotionError(diagnostic);
        setSlide1MotionStatus("failed");
        setMotionAttempts((prev) => prev.map((a) => a.attempt_number === attemptNumber ? { ...a, status: "failed", task_id: data.task_id, failure_code: data.failure_code, failure_message: data.failure_message } : a));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSlide1MotionError({ error: msg });
      setSlide1MotionStatus("failed");
      setMotionAttempts((prev) => prev.map((a) => a.attempt_number === attemptNumber ? { ...a, status: "failed", failure_message: msg } : a));
    }
  }, [slide1KeyframeUrl]);

  const handleGenerateSlide1Motion = useCallback(() => {
    return runSlide1MotionGeneration(SLIDE1_MOTION_PROMPT, "normal");
  }, [runSlide1MotionGeneration]);

  const handleRetrySlide1MotionSafe = useCallback(() => {
    return runSlide1MotionGeneration(SLIDE1_SAFE_RETRY_PROMPT, "safe");
  }, [runSlide1MotionGeneration]);

  const handleRegenerateSaferKeyframe = useCallback(async () => {
    setSlide1KeyframeStatus("generating");
    setSlide1KeyframeUrl(undefined);
    setSlide1MotionStatus("missing");
    setSlide1MotionError(undefined);
    setSlide1ProviderRatioStatus("unknown");
    setSlide1CompositionStatus("missing");
    try {
      const res = await fetch("/api/debug/final-launch/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slide_id: "slide-1",
          prompt: SLIDE1_SAFER_KEYFRAME_PROMPT,
          negative_prompt: SLIDE1_SAFER_KEYFRAME_NEGATIVE,
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

  // Step 4: compose final 1080×1350 MP4 with Chinese text overlay
  const handleComposeFinalSlide1 = useCallback(async () => {
    setSlide1CompositionStatus("composing");
    setSlide1ComposingError(undefined);
    try {
      const res = await fetch("/api/debug/final-launch/compose-slide-01", { method: "POST" });
      const data = (await res.json()) as {
        status: string;
        final_video_url?: string;
        final_ratio_status?: string;
        error?: string;
      };
      if (data.status === "composed" && data.final_video_url) {
        setSlide1FinalVideoUrl(data.final_video_url);
        setSlide1CompositionStatus("composed");
        setSlide1FinalRatioStatus("passed_4_5");
        setHasSavedAssets(true);
      } else {
        setSlide1ComposingError(data.error ?? "Composition failed.");
        setSlide1CompositionStatus("failed");
      }
    } catch (err) {
      setSlide1ComposingError(err instanceof Error ? err.message : String(err));
      setSlide1CompositionStatus("failed");
    }
  }, []);

  // Recover an existing successful Runway task by task ID
  const handleRecoverRunwayTask = useCallback(async () => {
    if (!recoverTaskId.trim()) return;
    setRecoverStatus("recovering");
    setRecoverError(undefined);
    try {
      const res = await fetch("/api/debug/final-launch/recover-runway-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide_id: "slide-01", task_id: recoverTaskId.trim() }),
      });
      const data = (await res.json()) as {
        status: string;
        runway_intermediate_video_url?: string;
        final_composition_status?: string;
        error?: string;
        failure_message?: string;
        attempted_endpoint?: string;
        runway_http_status?: number;
        hint?: string;
      };
      if (data.status === "recovered" && data.runway_intermediate_video_url) {
        setMotionVideoUrls((prev) => ({ ...prev, 0: data.runway_intermediate_video_url! }));
        setSlide1MotionStatus("generated");
        setSelectedMotionSlide(0);
        setSlide1CompositionStatus("needed");
        setHasSavedAssets(true);
        setRecoverStatus("recovered");
        setRecoverDiagnostic(undefined);
      } else {
        setRecoverError(data.error ?? data.failure_message ?? "Recovery failed.");
        setRecoverDiagnostic({
          attempted_endpoint: data.attempted_endpoint,
          runway_http_status: data.runway_http_status,
          hint: data.hint,
        });
        setRecoverStatus("failed");
      }
    } catch (err) {
      setRecoverError(err instanceof Error ? err.message : String(err));
      setRecoverStatus("failed");
    }
  }, [recoverTaskId]);

  // Restore saved slide assets from manifest on mount
  const restoreFromManifest = useCallback(async () => {
    setManifestRestoring(true);
    try {
      const res = await fetch("/api/debug/final-launch/manifest");
      if (!res.ok) return;
      const data = (await res.json()) as {
        status: string;
        manifest?: Record<string, {
          keyframe_url?: string;
          keyframe_mode?: "low_risk" | "normal";
          low_risk_mode?: boolean;
          runway_intermediate_video_url?: string;
          final_composition_status?: string;
          final_video_url?: string;
          final_ratio_status?: string;
          last_failure?: { failure_code?: string; failure_message?: string; task_id?: string; timestamp: string } | null;
        }>
      };
      if (!data.manifest) { setHasSavedAssets(false); return; }

      // Restore slide 1 (individual state vars)
      const slide01 = data.manifest.slide_01;
      if (slide01) {
        setHasSavedAssets(true);
        if (slide01.keyframe_url) {
          setSlide1KeyframeUrl(slide01.keyframe_url);
          setSlide1KeyframeStatus("generated");
        }
        if (slide01.runway_intermediate_video_url) {
          setMotionVideoUrls((prev) => ({ ...prev, 0: slide01.runway_intermediate_video_url! }));
          setSlide1MotionStatus("generated");
          setSelectedMotionSlide(0);
          const compStatus = slide01.final_composition_status;
          if (compStatus === "composed") setSlide1CompositionStatus("composed");
          else if (compStatus === "needed") setSlide1CompositionStatus("needed");
        }
        if (slide01.final_video_url) {
          setSlide1FinalVideoUrl(slide01.final_video_url);
          // final_video_url existing means composition completed — override any stale status
          setSlide1CompositionStatus("composed");
        }
        if (slide01.final_ratio_status === "passed_4_5") {
          setSlide1FinalRatioStatus("passed_4_5");
        }
      }

      // Restore slides 2-8 (otherSlideStates) in one pass
      const otherPatches: Record<number, Partial<SlideMotionState>> = {};
      for (let i = 1; i <= 7; i++) {
        const config = SLIDE_MOTION_CONFIGS[i];
        const manifestKey = config?.id ?? `slide_0${String(i + 1).padStart(2, "0")}`;
        const slideData = data.manifest[manifestKey];
        if (!slideData) continue;
        const p: Partial<SlideMotionState> = {};
        if (slideData.keyframe_url) {
          p.keyframeUrl = slideData.keyframe_url;
          p.keyframeStatus = "generated";
          // Restore low-risk flag from manifest; fall back to true for slide 2 (backward compat)
          if (slideData.keyframe_mode === "low_risk" || slideData.low_risk_mode) {
            p.lowRiskKeyframe = true;
          } else if (slideData.keyframe_mode === "normal") {
            p.lowRiskKeyframe = false;
          } else if (i === 1) {
            p.lowRiskKeyframe = true;
          }
        }
        // Restore last failure info if motion never succeeded
        if (slideData.last_failure && !slideData.runway_intermediate_video_url) {
          p.motionStatus = "failed";
          p.motionError = {
            error: slideData.last_failure.failure_message ?? "Previous Runway failure",
            task_id: slideData.last_failure.task_id,
            failure_code: slideData.last_failure.failure_code,
            failure_message: slideData.last_failure.failure_message,
          };
        }
        if (slideData.runway_intermediate_video_url) {
          p.intermediateVideoUrl = slideData.runway_intermediate_video_url;
          p.motionStatus = "generated";
          p.providerRatioStatus = "accepted_intermediate";
          p.compositionStatus = slideData.final_composition_status === "composed" ? "composed" : "needed";
          setMotionVideoUrls(prev => ({ ...prev, [i]: slideData.runway_intermediate_video_url! }));
        }
        if (slideData.final_video_url) { p.finalVideoUrl = slideData.final_video_url; p.compositionStatus = "composed"; }
        if (slideData.final_ratio_status === "passed_4_5") p.finalRatioStatus = "passed_4_5";
        if (Object.keys(p).length > 0) otherPatches[i] = p;
      }
      if (Object.keys(otherPatches).length > 0) {
        setOtherSlideStates(prev => {
          const next = { ...prev };
          for (const [idxStr, patch] of Object.entries(otherPatches)) {
            const idx = Number(idxStr);
            next[idx] = { ...(prev[idx] ?? createEmptySlideMotionState(idx)), ...patch };
          }
          return next;
        });
      }
    } catch {
      // Manifest fetch failed — non-critical, start fresh
    } finally {
      setManifestRestoring(false);
    }
  }, []);

  useEffect(() => {
    restoreFromManifest();
  }, [restoreFromManifest]);

  const handleClearSavedAssets = useCallback(async () => {
    try {
      await fetch("/api/debug/final-launch/manifest", { method: "DELETE" });
    } catch {
      // ignore
    }
    setHasSavedAssets(false);
    setSlide1KeyframeUrl(undefined);
    setSlide1KeyframeStatus("missing");
    setSlide1MotionStatus("missing");
    setSlide1MotionError(undefined);
    setSlide1ProviderRatioStatus("unknown");
    setSlide1ProviderRatioSource("unknown");
    setSlide1ProviderRatioNote(undefined);
    setSlide1ProviderRatioDims(undefined);
    setSlide1CompositionStatus("missing");
    setSlide1FinalVideoUrl(undefined);
    setSlide1FinalRatioStatus("unknown");
    setSlide1ComposingError(undefined);
    setMotionVideoUrls((prev) => { const next = { ...prev }; delete next[0]; return next; });
    setMotionAttempts([]);
    attemptCountRef.current = 0;
  }, []);

  // ── Generic per-slide handlers (delegate to slide-1 handlers for index 0) ──────

  const handleGenerateKeyframe = useCallback(async (slideIndex: number) => {
    if (slideIndex === 0) return handleGenerateSlide1Keyframe();
    const config = SLIDE_MOTION_CONFIGS[slideIndex];
    const slideId = config?.slideId ?? `slide-0${String(slideIndex + 1).padStart(2, "0")}`;
    const slide = slides[slideIndex];
    const patch = (p: Partial<SlideMotionState>) =>
      setOtherSlideStates(prev => ({ ...prev, [slideIndex]: { ...(prev[slideIndex] ?? createEmptySlideMotionState(slideIndex)), ...p } }));
    patch({ keyframeStatus: "generating", keyframeUrl: undefined });
    try {
      const res = await fetch("/api/debug/final-launch/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide_id: slideId, prompt: slide.still_preview.image_generation_prompt, negative_prompt: slide.still_preview.negative_prompt }),
      });
      const data = (await res.json()) as { status: string; image_url?: string; error?: string };
      if (data.status === "generated" && data.image_url) {
        patch({ keyframeStatus: "generated", keyframeUrl: data.image_url });
      } else {
        patch({ keyframeStatus: "failed" });
      }
    } catch {
      patch({ keyframeStatus: "failed" });
    }
  }, [handleGenerateSlide1Keyframe, slides]);

  const handleGenerateMotion = useCallback(async (slideIndex: number, promptMode: "normal" | "safe", keyframeUrl?: string, motionPromptOverride?: string) => {
    if (slideIndex === 0) {
      return promptMode === "safe" ? handleRetrySlide1MotionSafe() : handleGenerateSlide1Motion();
    }
    if (!keyframeUrl) return;
    const config = SLIDE_MOTION_CONFIGS[slideIndex];
    const slideId = config?.slideId ?? `slide-0${String(slideIndex + 1).padStart(2, "0")}`;
    const slide = slides[slideIndex];
    const motionPrompt = motionPromptOverride ?? slide.motion_asset.video_generation_prompt;
    const effectivePromptMode = motionPromptOverride && slideIndex === 1 ? "low_risk" : promptMode;
    const patch = (p: Partial<SlideMotionState>) =>
      setOtherSlideStates(prev => ({ ...prev, [slideIndex]: { ...(prev[slideIndex] ?? createEmptySlideMotionState(slideIndex)), ...p } }));
    patch({ motionStatus: "generating", motionError: undefined });
    try {
      const res = await fetch("/api/debug/final-launch/generate-motion-from-keyframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide_id: slideId, keyframe_url: keyframeUrl, motion_prompt: motionPrompt, motion_prompt_mode: effectivePromptMode, duration_seconds: 5 }),
      });
      const data = (await res.json()) as { status: string; background_video_url?: string; error?: string; task_id?: string; failure_code?: string; failure_message?: string; debug_hint?: string };
      if (data.status === "video_generated" && data.background_video_url) {
        patch({ motionStatus: "generated", intermediateVideoUrl: data.background_video_url, providerRatioStatus: "accepted_intermediate", compositionStatus: "needed" });
        setMotionVideoUrls(prev => ({ ...prev, [slideIndex]: data.background_video_url! }));
      } else {
        patch({ motionStatus: "failed", motionError: { error: data.error ?? "Unknown error", task_id: data.task_id, failure_code: data.failure_code, failure_message: data.failure_message, debug_hint: data.debug_hint } });
      }
    } catch (err) {
      patch({ motionStatus: "failed", motionError: { error: err instanceof Error ? err.message : String(err) } });
    }
  }, [handleRetrySlide1MotionSafe, handleGenerateSlide1Motion, slides]);

  const handleComposeFinalSlide = useCallback(async (slideIndex: number) => {
    if (slideIndex === 0) return handleComposeFinalSlide1();
    const config = SLIDE_MOTION_CONFIGS[slideIndex];
    const slideId = config?.slideId ?? `slide-0${String(slideIndex + 1).padStart(2, "0")}`;
    const patch = (p: Partial<SlideMotionState>) =>
      setOtherSlideStates(prev => ({ ...prev, [slideIndex]: { ...(prev[slideIndex] ?? createEmptySlideMotionState(slideIndex)), ...p } }));
    patch({ compositionStatus: "composing", composingError: undefined });
    try {
      const res = await fetch("/api/debug/final-launch/compose-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide_id: slideId }),
      });
      const data = (await res.json()) as { status: string; final_video_url?: string; error?: string };
      if (data.status === "composed" && data.final_video_url) {
        patch({ compositionStatus: "composed", finalVideoUrl: data.final_video_url, finalRatioStatus: "passed_4_5" });
      } else {
        patch({ compositionStatus: "failed", composingError: data.error ?? "Composition failed." });
      }
    } catch (err) {
      patch({ compositionStatus: "failed", composingError: err instanceof Error ? err.message : String(err) });
    }
  }, [handleComposeFinalSlide1]);

  const handleClearSlideAssets = useCallback(async (slideIndex: number) => {
    if (slideIndex === 0) return handleClearSavedAssets();
    const config = SLIDE_MOTION_CONFIGS[slideIndex];
    const slideId = config?.slideId ?? `slide-0${String(slideIndex + 1).padStart(2, "0")}`;
    try { await fetch(`/api/debug/final-launch/manifest?slide_id=${slideId}`, { method: "DELETE" }); } catch { /* ignore */ }
    setOtherSlideStates(prev => { const next = { ...prev }; delete next[slideIndex]; return next; });
    setMotionVideoUrls(prev => { const next = { ...prev }; delete next[slideIndex]; return next; });
  }, [handleClearSavedAssets]);

  const handleRestoreSlideAssets = useCallback(async (slideIndex: number) => {
    if (slideIndex === 0) return restoreFromManifest();
    setManifestRestoring(true);
    const config = SLIDE_MOTION_CONFIGS[slideIndex];
    const manifestKey = config?.id ?? `slide_0${String(slideIndex + 1).padStart(2, "0")}`;
    try {
      const res = await fetch("/api/debug/final-launch/manifest");
      if (!res.ok) return;
      const data = (await res.json()) as { status: string; manifest?: Record<string, { keyframe_url?: string; keyframe_mode?: "low_risk" | "normal"; low_risk_mode?: boolean; runway_intermediate_video_url?: string; final_composition_status?: string; final_video_url?: string; final_ratio_status?: string; last_failure?: { failure_code?: string; failure_message?: string; task_id?: string; timestamp: string } | null }> };
      const slideData = data.manifest?.[manifestKey];
      if (!slideData) return;
      const p: Partial<SlideMotionState> = {};
      if (slideData.keyframe_url) { p.keyframeUrl = slideData.keyframe_url; p.keyframeStatus = "generated"; }
      if (slideData.runway_intermediate_video_url) {
        p.intermediateVideoUrl = slideData.runway_intermediate_video_url;
        p.motionStatus = "generated";
        p.providerRatioStatus = "accepted_intermediate";
        p.compositionStatus = slideData.final_composition_status === "composed" ? "composed" : "needed";
        setMotionVideoUrls(prev => ({ ...prev, [slideIndex]: slideData.runway_intermediate_video_url! }));
      }
      if (slideData.final_video_url) { p.finalVideoUrl = slideData.final_video_url; p.compositionStatus = "composed"; }
      if (slideData.final_ratio_status === "passed_4_5") p.finalRatioStatus = "passed_4_5";
      setOtherSlideStates(prev => ({ ...prev, [slideIndex]: { ...(prev[slideIndex] ?? createEmptySlideMotionState(slideIndex)), ...p } }));
    } catch { /* non-critical */ } finally {
      setManifestRestoring(false);
    }
  }, [restoreFromManifest]);

  const handleRecoverTask = useCallback(async (slideIndex: number, taskId: string) => {
    if (slideIndex === 0) return handleRecoverRunwayTask();
    if (!taskId.trim()) return;
    const config = SLIDE_MOTION_CONFIGS[slideIndex];
    const slideId = config?.slideId ?? `slide-0${String(slideIndex + 1).padStart(2, "0")}`;
    const patch = (p: Partial<SlideMotionState>) =>
      setOtherSlideStates(prev => ({ ...prev, [slideIndex]: { ...(prev[slideIndex] ?? createEmptySlideMotionState(slideIndex)), ...p } }));
    patch({ recoverStatus: "recovering", recoverError: undefined, recoverDiagnostic: undefined });
    try {
      const res = await fetch("/api/debug/final-launch/recover-runway-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide_id: slideId, task_id: taskId.trim() }),
      });
      const data = (await res.json()) as { status: string; runway_intermediate_video_url?: string; error?: string; failure_message?: string; attempted_endpoint?: string; runway_http_status?: number; hint?: string };
      if (data.status === "recovered" && data.runway_intermediate_video_url) {
        patch({ recoverStatus: "recovered", motionStatus: "generated", intermediateVideoUrl: data.runway_intermediate_video_url, providerRatioStatus: "accepted_intermediate", compositionStatus: "needed" });
        setMotionVideoUrls(prev => ({ ...prev, [slideIndex]: data.runway_intermediate_video_url! }));
      } else {
        patch({ recoverStatus: "failed", recoverError: data.error ?? data.failure_message ?? "Recovery failed.", recoverDiagnostic: { attempted_endpoint: data.attempted_endpoint, runway_http_status: data.runway_http_status, hint: data.hint } });
      }
    } catch (err) {
      patch({ recoverStatus: "failed", recoverError: err instanceof Error ? err.message : String(err) });
    }
  }, [handleRecoverRunwayTask]);

  const handleRecoverTaskIdChange = useCallback((slideIndex: number, val: string) => {
    if (slideIndex === 0) {
      setRecoverTaskId(val);
      setRecoverStatus("idle");
      setRecoverError(undefined);
      setRecoverDiagnostic(undefined);
    } else {
      setOtherSlideStates(prev => ({ ...prev, [slideIndex]: { ...(prev[slideIndex] ?? createEmptySlideMotionState(slideIndex)), recoverTaskId: val, recoverStatus: "idle", recoverError: undefined, recoverDiagnostic: undefined } }));
    }
  }, []);

  // Low-risk keyframe for slide 2 / PAIN — resets motion state, uses safe scene prompt
  const handleGenerateLowRiskKeyframe = useCallback(async (slideIndex: number) => {
    const config = SLIDE_MOTION_CONFIGS[slideIndex];
    const slideId = config?.slideId ?? `slide-0${String(slideIndex + 1).padStart(2, "0")}`;
    const patch = (p: Partial<SlideMotionState>) =>
      setOtherSlideStates(prev => ({ ...prev, [slideIndex]: { ...(prev[slideIndex] ?? createEmptySlideMotionState(slideIndex)), ...p } }));
    patch({
      keyframeStatus: "generating",
      keyframeUrl: undefined,
      motionStatus: "missing",
      motionError: undefined,
      motionAttempts: [],
      providerRatioStatus: "unknown",
      compositionStatus: "missing",
      lowRiskKeyframe: true,
    });
    try {
      const res = await fetch("/api/debug/final-launch/generate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slide_id: slideId, prompt: SLIDE2_LOWRISK_KEYFRAME_PROMPT, negative_prompt: SLIDE2_LOWRISK_KEYFRAME_NEGATIVE, keyframe_mode: "low_risk" }),
      });
      const data = (await res.json()) as { status: string; image_url?: string; error?: string };
      if (data.status === "generated" && data.image_url) {
        patch({ keyframeStatus: "generated", keyframeUrl: data.image_url });
      } else {
        patch({ keyframeStatus: "failed" });
      }
    } catch {
      patch({ keyframeStatus: "failed" });
    }
  }, []);

  // Validate Runway intermediate output ratio — dual layer:
  // 1. Browser onLoadedMetadata (dimensions from actual video)
  // 2. 8-second fallback to declared Runway request ratio (832:1104) if metadata unavailable
  const slide1VideoUrl = motionVideoUrls[0];
  useEffect(() => {
    if (!slide1VideoUrl) {
      setSlide1ProviderRatioStatus("unknown");
      setSlide1ProviderRatioSource("unknown");
      setSlide1ProviderRatioNote(undefined);
      setSlide1ProviderRatioDims(undefined);
      setSlide1CompositionStatus("missing");
      return;
    }

    setSlide1ProviderRatioStatus("validating");
    setSlide1ProviderRatioSource("unknown");
    setSlide1ProviderRatioNote(undefined);
    setSlide1ProviderRatioDims(undefined);

    const video = document.createElement("video");
    video.preload = "metadata";
    video.crossOrigin = "anonymous";

    const applyDeclaredRatio = () => {
      // Runway request hardcoded to 832:1104 — use declared ratio as fallback
      setSlide1ProviderRatioStatus("accepted_intermediate");
      setSlide1ProviderRatioSource("declared_runway_request_ratio");
      setSlide1ProviderRatioNote("Video metadata was unavailable, but Runway request used accepted intermediate ratio 832:1104.");
      setSlide1CompositionStatus("needed");
    };

    const fallbackTimer = setTimeout(() => {
      video.src = "";
      applyDeclaredRatio();
    }, 8000);

    video.onloadedmetadata = () => {
      clearTimeout(fallbackTimer);
      const w = video.videoWidth;
      const h = video.videoHeight;
      video.src = "";
      setSlide1ProviderRatioDims({ width: w, height: h });
      const status = validateProviderRatio(w, h);
      setSlide1ProviderRatioStatus(status);
      setSlide1ProviderRatioSource("metadata");
      setSlide1ProviderRatioNote(undefined);
      if (status === "accepted_intermediate") setSlide1CompositionStatus("needed");
    };

    video.onerror = () => {
      clearTimeout(fallbackTimer);
      video.src = "";
      applyDeclaredRatio();
    };

    video.src = slide1VideoUrl;

    return () => {
      clearTimeout(fallbackTimer);
      video.src = "";
    };
  }, [slide1VideoUrl]);

  // Derived: final_video_url + passed_4_5 always means composed — immune to ratio validation race
  const effectiveFinalCompositionStatus: "missing" | "needed" | "composing" | "composed" | "failed" =
    slide1FinalVideoUrl && slide1FinalRatioStatus === "passed_4_5"
      ? "composed"
      : slide1CompositionStatus;

  // Bridge Slide 1 state into the generic 8-slide array. Slides 2-8 start empty.
  const slideMotionStates: SlideMotionState[] = slides.map((_, i) => {
    if (i === 0) {
      return {
        slideId: "slide-01",
        manifestKey: "slide_01",
        keyframeStatus: slide1KeyframeStatus,
        keyframeUrl: slide1KeyframeUrl,
        motionStatus: slide1MotionStatus,
        motionError: slide1MotionError,
        providerRatioStatus:
          slide1ProviderRatioStatus === "accepted_intermediate" ? "accepted_intermediate"
          : slide1ProviderRatioStatus === "failed" ? "failed"
          : "unknown",
        providerRatioDims: slide1ProviderRatioDims,
        providerRatioNote: slide1ProviderRatioNote,
        compositionStatus: slide1CompositionStatus,
        finalRatioStatus: slide1FinalRatioStatus === "passed_4_5" ? "passed_4_5" : "unknown",
        finalVideoUrl: slide1FinalVideoUrl,
        intermediateVideoUrl: motionVideoUrls[0],
        composingError: slide1ComposingError,
        motionAttempts,
        recoverTaskId,
        recoverStatus,
        recoverError,
        recoverDiagnostic,
      };
    }
    return otherSlideStates[i] ?? createEmptySlideMotionState(i);
  });

  const readySlideCount = slideMotionStates.filter(
    (s) =>
      s.keyframeStatus === "generated" &&
      s.motionStatus === "generated" &&
      s.providerRatioStatus === "accepted_intermediate" &&
      getEffectiveCompositionStatus(s) === "composed" &&
      s.finalRatioStatus === "passed_4_5"
  ).length;

  // Derived: selected slide for detail pipeline
  const safeSelectedIndex = Number.isInteger(selectedMotionSlide) && selectedMotionSlide >= 0 && selectedMotionSlide < slides.length ? selectedMotionSlide : 0;
  const selectedSlideNumber = safeSelectedIndex + 1;
  const selectedState = slideMotionStates[safeSelectedIndex];
  const effectiveSelectedCompositionStatus = getEffectiveCompositionStatus(selectedState);
  const selectedHasSavedAssets = !!(selectedState.keyframeUrl || selectedState.finalVideoUrl || selectedState.intermediateVideoUrl);
  const selectedRecoverTaskId = safeSelectedIndex === 0 ? recoverTaskId : (selectedState.recoverTaskId ?? "");
  const consecutiveFailedMotionAttempts = selectedState.motionAttempts.filter(a => a.status === "failed").length;
  const showLowRiskRecovery = safeSelectedIndex === 1 && selectedState.motionStatus !== "generated";

  // Slide 2 Runway gate: block only on URL mismatch OR prompt that explicitly requests animation of sensitive elements.
  // Single words like "face", "person", "hands" alone are NOT blockers — people are allowed.
  // Only explicit animation commands trigger the gate (evidence-based policy from #070D).
  const RUNWAY_ANIM_RISK_PHRASES = [
    "animate face", "animate faces", "animate hand", "animate hands",
    "animate person", "animate people", "animate the face",
    "create new people", "create new person", "add people", "add person",
    "close-up face", "extreme close-up", "detailed hand", "finger motion",
  ];
  const slide2MotionPromptForGate = slideMotionStates[1]?.lowRiskKeyframe ? SLIDE2_LOWRISK_MOTION_PROMPT : SLIDE_MOTION_CONFIGS[1].motionPrompt;
  const slide2PromptHasHighRisk = RUNWAY_ANIM_RISK_PHRASES.some(p => slide2MotionPromptForGate.toLowerCase().includes(p));
  const slide2KfUrl = slideMotionStates[1]?.keyframeUrl;
  const slide2KfIsCanonical = !slide2KfUrl || !slide2KfUrl.endsWith("-background.png");
  const slide2RunwayBlocked = safeSelectedIndex === 1 && (!slide2KfIsCanonical || slide2PromptHasHighRisk);
  const slide2RunwayBlockReason = !slide2KfIsCanonical
    ? "素材來源不一致，請點選「還原已儲存素材」"
    : slide2PromptHasHighRisk
    ? "Prompt 含明確動畫指令高風險詞，請修正"
    : "";

  return (
    <div style={{ minHeight: "100vh", background: "#0C0A08", padding: "40px 16px 100px" }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>

        {/* ── Warning ──────────────────────────────────────────── */}
        <div style={{ background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.14)", borderRadius: 12, padding: "14px 18px", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FB923C", marginTop: 5, flexShrink: 0 }} />
            <div>
              <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 700, marginBottom: 3 }}>
                Instagram 未串接｜手動發布
              </p>
              <p style={{ color: "#CFC7BA", fontSize: 11, lineHeight: 1.6 }}>
                Phoenix 未發布任何內容。沒有生產環境寫入。最終輸出目標：8 張 4:5 MP4 動態圖卡。靜態 still_preview 僅為首幀參考，不是可發布的最終輸出。
              </p>
            </div>
          </div>
        </div>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.14)", borderRadius: 8, padding: "4px 12px", marginBottom: 12 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#60a5fa" }} />
            <span style={{ color: "#60a5fa", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>動態發布流程｜僅限內部除錯</span>
          </div>
          <h1 style={{ color: "#FAFAF9", fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 8 }}>{topic}</h1>
          <p style={{ color: "#FB923C", fontSize: 13, fontWeight: 500, lineHeight: 1.6, marginBottom: 4 }}>{thesis}</p>
          <p style={{ color: "#CFC7BA", fontSize: 12, lineHeight: 1.6, fontStyle: "italic" }}>&ldquo;{deep_insight}&rdquo;</p>
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
              <p style={{ color: "#FAFAF9", fontSize: 13, fontWeight: 700, marginBottom: 3 }}>第 {selectedSlideNumber} 張｜首幀動態流程</p>
              <p style={{ color: "#9B9387", fontSize: 11, lineHeight: 1.55 }}>
                OpenAI 生成 4:5 首幀 → Runway 從首幀生成動態 → Phoenix 燒入中文文字
              </p>
              {/* Restore / Clear saved assets */}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {selectedHasSavedAssets && (
                  <button
                    onClick={() => handleRestoreSlideAssets(safeSelectedIndex)}
                    disabled={manifestRestoring}
                    style={{ height: 26, padding: "0 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#CFC7BA", fontSize: 9, fontWeight: 700, cursor: manifestRestoring ? "not-allowed" : "pointer" }}
                  >
                    {manifestRestoring ? "還原中…" : `還原第 ${selectedSlideNumber} 張已儲存素材`}
                  </button>
                )}
                {selectedHasSavedAssets && (
                  <button
                    onClick={() => handleClearSlideAssets(safeSelectedIndex)}
                    style={{ height: 26, padding: "0 10px", borderRadius: 6, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.14)", color: "#f87171", fontSize: 9, fontWeight: 700, cursor: "pointer" }}
                  >
                    {`清除第 ${selectedSlideNumber} 張已儲存素材`}
                  </button>
                )}
              </div>
            </div>
            {selectedState.finalRatioStatus === "passed_4_5" && (
              <span style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.22)", borderRadius: 7, padding: "4px 12px", color: "#4ade80", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", flexShrink: 0, marginTop: 2 }}>
                第 {selectedSlideNumber} 張｜可進行審核
              </span>
            )}
            {selectedState.motionStatus === "generated" && selectedState.providerRatioStatus === "accepted_intermediate" && selectedState.finalRatioStatus !== "passed_4_5" && (
              <span style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.20)", borderRadius: 7, padding: "4px 10px", color: "#FB923C", fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", flexShrink: 0, marginTop: 2, textAlign: "right" as const, maxWidth: 160 }}>
                動態已生成<br />需進行最終 4:5 合成
              </span>
            )}
            {selectedState.motionStatus === "generated" && selectedState.providerRatioStatus === "failed" && (
              <span style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 7, padding: "4px 10px", color: "#f87171", fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", flexShrink: 0, marginTop: 2 }}>
                比例驗證失敗
              </span>
            )}
          </div>

          {/* Slide 2 fallback banner — shown when motion not yet generated */}
          {showLowRiskRecovery && (
            <div style={{ marginBottom: 14, background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.18)", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                第 {selectedSlideNumber} 張動態尚未成功
              </p>
              <p style={{ color: "#CFC7BA", fontSize: 10, lineHeight: 1.65, marginBottom: 12 }}>
                失敗原因尚不能歸因於人物畫面。請先確認診斷區：素材來源一致、Prompt 安全性通過、API request 正確。若診斷皆通過但 Runway 仍失敗，再使用下方 Fallback 選項。
              </p>
              <button
                onClick={() => handleGenerateLowRiskKeyframe(safeSelectedIndex)}
                disabled={selectedState.keyframeStatus === "generating"}
                style={{
                  width: "100%", height: 42, borderRadius: 10,
                  background: selectedState.keyframeStatus === "generating" ? "rgba(255,255,255,0.02)" : "rgba(251,146,60,0.08)",
                  border: selectedState.keyframeStatus === "generating" ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(251,146,60,0.25)",
                  color: selectedState.keyframeStatus === "generating" ? "#9B9387" : "#FB923C",
                  fontSize: 12, fontWeight: 700,
                  cursor: selectedState.keyframeStatus === "generating" ? "not-allowed" : "pointer",
                }}
              >
                {selectedState.keyframeStatus === "generating" ? "生成更保守首幀中…（20–40 秒）" : `改用第 ${selectedSlideNumber} 張更保守首幀圖（Fallback）`}
              </button>
            </div>
          )}

          {/* Recover Existing Runway Task — dev-only */}
          {selectedState.motionStatus !== "generated" && (
            <div style={{ marginBottom: 14, background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "#60a5fa", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                恢復現有 Runway 任務
              </p>
              <p style={{ color: "#9B9387", fontSize: 10, lineHeight: 1.55, marginBottom: 10 }}>
                若 Runway 已成功完成，貼上 Task ID 即可下載並儲存影片，無需重新生成。
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  value={selectedRecoverTaskId}
                  onChange={(e) => handleRecoverTaskIdChange(safeSelectedIndex, e.target.value)}
                  placeholder="Runway 任務 ID"
                  style={{ flex: 1, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", color: "#CFC7BA", fontSize: 11, padding: "0 10px", fontFamily: "monospace", outline: "none" }}
                />
                <button
                  onClick={() => handleRecoverTask(safeSelectedIndex, selectedRecoverTaskId)}
                  disabled={!selectedRecoverTaskId.trim() || selectedState.recoverStatus === "recovering"}
                  style={{
                    height: 34, padding: "0 14px", borderRadius: 8,
                    background: selectedState.recoverStatus === "recovering" ? "rgba(255,255,255,0.02)" : "rgba(59,130,246,0.08)",
                    border: selectedState.recoverStatus === "recovering" ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(59,130,246,0.22)",
                    color: selectedState.recoverStatus === "recovering" ? "#9B9387" : "#60a5fa",
                    fontSize: 11, fontWeight: 700,
                    cursor: selectedState.recoverStatus === "recovering" ? "not-allowed" : "pointer",
                    flexShrink: 0,
                  }}
                >
                  {selectedState.recoverStatus === "recovering" ? "恢復中…" : "恢復"}
                </button>
              </div>
              {selectedState.recoverStatus === "recovered" && (
                <p style={{ color: "#4ade80", fontSize: 10, fontWeight: 700 }}>✓ Runway 任務已恢復｜影片已儲存於本地，清單已更新。</p>
              )}
              {selectedState.recoverStatus === "failed" && selectedState.recoverError && (
                <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ color: "#f87171", fontSize: 10, fontWeight: 700, marginBottom: 6 }}>✗ 恢復失敗</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <p style={{ color: "#CFC7BA", fontSize: 10, lineHeight: 1.55 }}>{selectedState.recoverError}</p>
                    {selectedState.recoverDiagnostic?.runway_http_status && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ color: "#9B9387", fontSize: 9, fontWeight: 600, flexShrink: 0 }}>HTTP 狀態碼</span>
                        <span style={{ color: "#f87171", fontSize: 9, fontFamily: "monospace" }}>{selectedState.recoverDiagnostic.runway_http_status}</span>
                      </div>
                    )}
                    {selectedState.recoverDiagnostic?.attempted_endpoint && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ color: "#9B9387", fontSize: 9, fontWeight: 600, flexShrink: 0 }}>端點</span>
                        <span style={{ color: "#CFC7BA", fontSize: 9, fontFamily: "monospace" }}>{selectedState.recoverDiagnostic.attempted_endpoint}</span>
                      </div>
                    )}
                    {selectedState.recoverDiagnostic?.hint && (
                      <p style={{ color: "#9B9387", fontSize: 9, lineHeight: 1.6, marginTop: 2 }}>{selectedState.recoverDiagnostic.hint}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1 — Keyframe */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ color: "#9B9387", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              步驟 1｜生成 4:5 首幀（OpenAI）
            </p>
            <button
              onClick={() => safeSelectedIndex === 1 ? handleGenerateLowRiskKeyframe(safeSelectedIndex) : handleGenerateKeyframe(safeSelectedIndex)}
              disabled={selectedState.keyframeStatus === "generating"}
              style={{
                width: "100%", height: 40, borderRadius: 10,
                background: selectedState.keyframeStatus === "generating" ? "rgba(255,255,255,0.02)" : selectedState.keyframeStatus === "generated" ? (safeSelectedIndex === 1 ? "rgba(239,68,68,0.08)" : "rgba(249,115,22,0.06)") : (safeSelectedIndex === 1 ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)"),
                border: selectedState.keyframeStatus === "generating" ? "1px solid rgba(255,255,255,0.06)" : selectedState.keyframeStatus === "generated" ? (safeSelectedIndex === 1 ? "1px solid rgba(239,68,68,0.22)" : "1px solid rgba(249,115,22,0.18)") : (safeSelectedIndex === 1 ? "1px solid rgba(239,68,68,0.18)" : "1px solid rgba(255,255,255,0.09)"),
                color: selectedState.keyframeStatus === "generating" ? "#9B9387" : selectedState.keyframeStatus === "generated" ? (safeSelectedIndex === 1 ? "#f87171" : "#FB923C") : (safeSelectedIndex === 1 ? "#f87171" : "#CFC7BA"),
                fontSize: 12, fontWeight: 700, cursor: selectedState.keyframeStatus === "generating" ? "not-allowed" : "pointer",
              }}
            >
              {selectedState.keyframeStatus === "generating"
                ? "生成首幀中…（20–40 秒）"
                : selectedState.keyframeStatus === "generated"
                  ? (safeSelectedIndex === 1 ? `↺ 改用第 ${selectedSlideNumber} 張更保守首幀圖（Fallback）` : `↺ 重新生成第 ${selectedSlideNumber} 張首幀`)
                  : (safeSelectedIndex === 1 ? `改用第 ${selectedSlideNumber} 張更保守首幀圖（Fallback）` : `生成第 ${selectedSlideNumber} 張首幀（OpenAI）`)}
            </button>

            {selectedState.keyframeStatus === "failed" && (
              <p style={{ color: "#f87171", fontSize: 10, marginTop: 6 }}>首幀生成失敗。請確認 .env.local 中的 OPENAI_API_KEY。</p>
            )}

            {selectedState.keyframeUrl && selectedState.keyframeStatus === "generated" && (
              <div style={{ marginTop: 10 }}>
                <div style={{ position: "relative", width: 120, aspectRatio: "4 / 5", borderRadius: 10, overflow: "hidden", border: `1px solid ${selectedState.lowRiskKeyframe ? "rgba(34,197,94,0.30)" : "rgba(255,255,255,0.10)"}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedState.keyframeUrl} alt={`第 ${selectedSlideNumber} 張首幀`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                {selectedState.lowRiskKeyframe ? (
                  <>
                    <p style={{ color: "#FB923C", fontSize: 9, fontWeight: 700, marginTop: 4 }}>保守首幀（Fallback 模式）</p>
                    <p style={{ color: "#9B9387", fontSize: 9, marginTop: 2, lineHeight: 1.55 }}>
                      靜物場景。若診斷通過但 Runway 仍失敗，再使用此首幀測試。
                    </p>
                  </>
                ) : (
                  <p style={{ color: "#9B9387", fontSize: 9, marginTop: 4 }}>僅為靜態首幀｜非最終動態輸出</p>
                )}
              </div>
            )}
          </div>

          {/* Step 2 — Motion from keyframe */}
          <div>
            <p style={{ color: "#9B9387", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              步驟 2｜從首幀生成動態（Runway）
            </p>
            <button
              onClick={() => handleGenerateMotion(safeSelectedIndex, "normal", selectedState.keyframeUrl, selectedState.lowRiskKeyframe && safeSelectedIndex === 1 ? SLIDE2_LOWRISK_MOTION_PROMPT : undefined)}
              disabled={selectedState.keyframeStatus !== "generated" || selectedState.motionStatus === "generating" || slide2RunwayBlocked}
              style={{
                width: "100%", height: 40, borderRadius: 10,
                background: selectedState.keyframeStatus !== "generated" || slide2RunwayBlocked ? "rgba(255,255,255,0.01)" : selectedState.motionStatus === "generating" ? "rgba(255,255,255,0.02)" : selectedState.motionStatus === "generated" ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.04)",
                border: selectedState.keyframeStatus !== "generated" || slide2RunwayBlocked ? "1px solid rgba(255,255,255,0.04)" : selectedState.motionStatus === "generating" ? "1px solid rgba(255,255,255,0.06)" : selectedState.motionStatus === "generated" ? "1px solid rgba(34,197,94,0.18)" : "1px solid rgba(255,255,255,0.09)",
                color: selectedState.keyframeStatus !== "generated" || slide2RunwayBlocked ? "#6F675E" : selectedState.motionStatus === "generating" ? "#9B9387" : selectedState.motionStatus === "generated" ? "#4ade80" : "#CFC7BA",
                fontSize: 12, fontWeight: 700,
                cursor: selectedState.keyframeStatus !== "generated" || selectedState.motionStatus === "generating" || slide2RunwayBlocked ? "not-allowed" : "pointer",
              }}
            >
              {selectedState.keyframeStatus !== "generated"
                ? `生成第 ${selectedSlideNumber} 張動態｜請先產生首幀圖`
                : slide2RunwayBlocked
                ? `⊘ Runway 已鎖定｜${slide2RunwayBlockReason}`
                : selectedState.motionStatus === "generating"
                ? "從首幀生成動態中…（60–120 秒）"
                : selectedState.motionStatus === "generated"
                ? `↺ 重新生成第 ${selectedSlideNumber} 張動態`
                : `從首幀生成第 ${selectedSlideNumber} 張動態（Runway）`}
            </button>

            {selectedState.motionStatus === "generating" && (
              <p style={{ color: "#9B9387", fontSize: 10, textAlign: "center", marginTop: 6 }}>
                Runway 正在從首幀生成動態，請勿關閉此頁籤。
              </p>
            )}

            {selectedState.motionStatus === "failed" && selectedState.motionError && (
              <div style={{ marginTop: 10, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ color: "#f87171", fontSize: 11, fontWeight: 700, marginBottom: 10 }}>動態生成失敗</p>

                {/* Diagnostic rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {selectedState.motionError.task_id && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: "#9B9387", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>任務 ID</span>
                      <span style={{ color: "#CFC7BA", fontSize: 10, fontFamily: "monospace", wordBreak: "break-all" as const, textAlign: "right" as const }}>{selectedState.motionError.task_id}</span>
                    </div>
                  )}
                  {selectedState.motionError.failure_code && (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: "#9B9387", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>失敗代碼</span>
                      <span style={{ color: "#f87171", fontSize: 10, fontFamily: "monospace" }}>{selectedState.motionError.failure_code}</span>
                    </div>
                  )}
                  {selectedState.motionError.failure_message && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ color: "#9B9387", fontSize: 10, fontWeight: 600 }}>失敗訊息</span>
                      <span style={{ color: "#CFC7BA", fontSize: 10, lineHeight: 1.55 }}>{selectedState.motionError.failure_message}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ color: "#9B9387", fontSize: 10, fontWeight: 600 }}>錯誤</span>
                    <span style={{ color: "#CFC7BA", fontSize: 10, lineHeight: 1.55 }}>{selectedState.motionError.error}</span>
                  </div>
                </div>

                {/* BAD_OUTPUT-specific hint */}
                {selectedState.motionError.failure_code?.includes("INTERNAL.BAD_OUTPUT") && (
                  <div style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                    <p style={{ color: "#FB923C", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>Runway 內部輸出品質拒絕</p>
                    <p style={{ color: "#9B9387", fontSize: 10, lineHeight: 1.6 }}>
                      Runway 因內部輸出品質拒絕此次生成。請嘗試安全提示詞或重新生成更安全的首幀後再重試，不要反覆使用相同輸入。
                    </p>
                  </div>
                )}

                {/* Dashboard hint */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                  <p style={{ color: "#9B9387", fontSize: 10, lineHeight: 1.6 }}>
                    {selectedState.motionError.debug_hint ?? "請至 Runway 後台 → 請求歷史記錄查看此任務 ID。"}
                    {selectedState.motionError.task_id && (
                      <span style={{ display: "block", color: "#9B9387", fontFamily: "monospace", fontSize: 9, marginTop: 3 }}>
                        任務：{selectedState.motionError.task_id}
                      </span>
                    )}
                  </p>
                </div>

                {/* Recovery actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {showLowRiskRecovery && (
                    <>
                      <div style={{ background: "rgba(251,146,60,0.04)", border: "1px solid rgba(251,146,60,0.15)", borderRadius: 8, padding: "10px 12px" }}>
                        <p style={{ color: "#FB923C", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
                          Fallback 選項：改用更保守首幀
                        </p>
                        <p style={{ color: "#CFC7BA", fontSize: 10, lineHeight: 1.6 }}>
                          人物畫面不是自動失敗原因。請先確認診斷區所有項目通過，若 Runway 仍持續失敗再考慮此 fallback。
                        </p>
                      </div>
                      <button
                        onClick={() => handleGenerateLowRiskKeyframe(safeSelectedIndex)}
                        style={{
                          width: "100%", height: 40, borderRadius: 8,
                          background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.22)",
                          color: "#FB923C", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        改用第 {selectedSlideNumber} 張更保守首幀圖（Fallback）
                      </button>
                    </>
                  )}
                  {!showLowRiskRecovery && (
                    <button
                      onClick={() => handleGenerateMotion(safeSelectedIndex, "safe", selectedState.keyframeUrl, selectedState.lowRiskKeyframe && safeSelectedIndex === 1 ? SLIDE2_LOWRISK_MOTION_PROMPT : undefined)}
                      style={{
                        width: "100%", height: 36, borderRadius: 8,
                        background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.22)",
                        color: "#FB923C", fontSize: 11, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      使用安全提示詞重試動態
                    </button>
                  )}
                  {safeSelectedIndex === 0 && (
                    <button
                      onClick={handleRegenerateSaferKeyframe}
                      disabled={selectedState.keyframeStatus !== "generated"}
                      style={{
                        width: "100%", height: 36, borderRadius: 8,
                        background: selectedState.keyframeStatus !== "generated" ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.04)",
                        border: selectedState.keyframeStatus !== "generated" ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(255,255,255,0.1)",
                        color: selectedState.keyframeStatus !== "generated" ? "#6F675E" : "#CFC7BA",
                        fontSize: 11, fontWeight: 700,
                        cursor: selectedState.keyframeStatus !== "generated" ? "not-allowed" : "pointer",
                      }}
                    >
                      重新生成更安全的首幀
                    </button>
                  )}
                  <CopyButton text={SLIDE1_SAFE_RETRY_PROMPT} label="複製安全重試提示詞" />
                </div>
              </div>
            )}
          </div>

          {/* Attempt History — client state only, last 3 attempts */}
          {selectedState.motionAttempts.length > 0 && (
            <div style={{ marginTop: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "#9B9387", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                嘗試記錄（最近 {selectedState.motionAttempts.length} 次）
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedState.motionAttempts.map((a) => (
                  <div key={a.attempt_number} style={{ display: "flex", flexDirection: "column", gap: 3, background: "rgba(255,255,255,0.015)", borderRadius: 7, padding: "8px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#CFC7BA", fontSize: 10, fontWeight: 600 }}>#{a.attempt_number} — {a.prompt_mode === "safe" ? "安全提示詞" : "一般提示詞"}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                        background: a.status === "generated" ? "rgba(34,197,94,0.08)" : a.status === "failed" ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
                        color: a.status === "generated" ? "#4ade80" : a.status === "failed" ? "#f87171" : "#9B9387",
                        border: `1px solid ${a.status === "generated" ? "rgba(34,197,94,0.2)" : a.status === "failed" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)"}`,
                      }}>
                        {a.status === "generated" ? "已生成" : a.status === "failed" ? "失敗" : "生成中"}
                      </span>
                    </div>
                    {a.task_id && (
                      <span style={{ color: "#9B9387", fontSize: 9, fontFamily: "monospace" }}>任務：{a.task_id}</span>
                    )}
                    {a.failure_code && (
                      <span style={{ color: "#f87171", fontSize: 9, fontFamily: "monospace" }}>{a.failure_code}</span>
                    )}
                    <span style={{ color: "#9B9387", fontSize: 9 }}>{new Date(a.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Provider Ratio Validation */}
          {selectedState.motionStatus === "generated" && (
            <div style={{ marginTop: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: "#9B9387", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                步驟 3｜來源比例驗證
              </p>
              <span style={{
                display: "inline-block",
                background: selectedState.providerRatioStatus === "accepted_intermediate" ? "rgba(249,115,22,0.08)" : selectedState.providerRatioStatus === "failed" ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${selectedState.providerRatioStatus === "accepted_intermediate" ? "rgba(249,115,22,0.2)" : selectedState.providerRatioStatus === "failed" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 6, padding: "3px 10px",
                color: selectedState.providerRatioStatus === "accepted_intermediate" ? "#FB923C" : selectedState.providerRatioStatus === "failed" ? "#f87171" : "#9B9387",
                fontSize: 10, fontWeight: 700,
              }}>
                {selectedState.providerRatioStatus === "accepted_intermediate"
                  ? "✓ 已接受中間比例"
                  : selectedState.providerRatioStatus === "failed"
                  ? "✗ 供應商比例驗證失敗｜非可接受的直式比例"
                  : selectedState.providerRatioStatus === "unknown" && selectedState.motionStatus === "generated"
                  ? "⋯ 等待影片中繼資料"
                  : "⋯ 等待影片中繼資料"}
              </span>

              {selectedState.providerRatioStatus === "accepted_intermediate" && (
                <div style={{ marginTop: 8 }}>
                  {selectedState.providerRatioDims && (
                    <p style={{ color: "#CFC7BA", fontSize: 9, fontFamily: "monospace", marginBottom: 4 }}>
                      偵測到：{selectedState.providerRatioDims.width}×{selectedState.providerRatioDims.height} · 來源：中繼資料
                    </p>
                  )}
                  {selectedState.providerRatioNote && (
                    <p style={{ color: "#CFC7BA", fontSize: 9, lineHeight: 1.55, marginBottom: 4 }}>
                      來源：Runway 申報比例 — {selectedState.providerRatioNote}
                    </p>
                  )}
                  <p style={{ color: "#FB923C", fontSize: 10, lineHeight: 1.55 }}>
                    已接受 Runway 申報的中間比例：832:1104。仍需進行最終 1080×1350 4:5 合成。
                  </p>
                </div>
              )}

              {selectedState.providerRatioStatus === "failed" && (
                <p style={{ color: "#f87171", fontSize: 10, marginTop: 8, lineHeight: 1.55 }}>
                  供應商輸出比例不是可接受的直式中間比例，無法繼續進行最終合成。
                </p>
              )}
            </div>
          )}

          {/* Step 4 — Final 4:5 Composition */}
          {selectedState.providerRatioStatus === "accepted_intermediate" && (
            <div style={{ marginTop: 14, background: effectiveSelectedCompositionStatus === "composed" ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${effectiveSelectedCompositionStatus === "composed" ? "rgba(34,197,94,0.18)" : "rgba(249,115,22,0.12)"}`, borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: effectiveSelectedCompositionStatus === "composed" ? "#4ade80" : "#FB923C", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                步驟 4｜最終 4:5 合成（1080×1350）
              </p>
              {effectiveSelectedCompositionStatus !== "composed" && (
                <p style={{ color: "#CFC7BA", fontSize: 11, lineHeight: 1.65, marginBottom: 10 }}>
                  使用 ffmpeg 將 Runway 影片縮放至 1080×1350 並燒入中文文字疊加，輸出 H.264 MP4。
                </p>
              )}
              {effectiveSelectedCompositionStatus === "composed" && selectedState.finalVideoUrl && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ color: "#4ade80", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>✓ 最終 4:5 MP4 已生成</p>
                  <p style={{ color: "#CFC7BA", fontSize: 9, fontFamily: "monospace" }}>{selectedState.finalVideoUrl}</p>
                </div>
              )}
              <button
                onClick={() => handleComposeFinalSlide(safeSelectedIndex)}
                disabled={selectedState.compositionStatus === "composing"}
                style={{
                  width: "100%", height: 40, borderRadius: 10,
                  background: selectedState.compositionStatus === "composing" ? "rgba(255,255,255,0.02)" : effectiveSelectedCompositionStatus === "composed" ? "rgba(34,197,94,0.07)" : "rgba(249,115,22,0.07)",
                  border: selectedState.compositionStatus === "composing" ? "1px solid rgba(255,255,255,0.06)" : effectiveSelectedCompositionStatus === "composed" ? "1px solid rgba(34,197,94,0.22)" : "1px solid rgba(249,115,22,0.22)",
                  color: selectedState.compositionStatus === "composing" ? "#9B9387" : effectiveSelectedCompositionStatus === "composed" ? "#4ade80" : "#FB923C",
                  fontSize: 12, fontWeight: 700,
                  cursor: selectedState.compositionStatus === "composing" ? "not-allowed" : "pointer",
                }}
              >
                {selectedState.compositionStatus === "composing"
                  ? "合成最終 1080×1350 MP4 中…（30–60 秒）"
                  : effectiveSelectedCompositionStatus === "composed"
                  ? `重新生成第 ${selectedSlideNumber} 張最終 4:5 MP4`
                  : `合成第 ${selectedSlideNumber} 張最終 4:5 MP4（ffmpeg）`}
              </button>
              {selectedState.compositionStatus === "failed" && selectedState.composingError && (
                <div style={{ marginTop: 8, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ color: "#f87171", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>合成失敗</p>
                  <p style={{ color: "#CFC7BA", fontSize: 10, lineHeight: 1.55 }}>{selectedState.composingError}</p>
                </div>
              )}
              <p style={{ color: "#9B9387", fontSize: 9, marginTop: 6 }}>
                狀態：<span style={{ color: effectiveSelectedCompositionStatus === "composed" ? "#4ade80" : selectedState.compositionStatus === "failed" ? "#f87171" : "#FB923C", fontWeight: 700 }}>{effectiveSelectedCompositionStatus === "composed" ? "已合成" : effectiveSelectedCompositionStatus === "composing" ? "合成中" : effectiveSelectedCompositionStatus === "needed" ? "待處理" : effectiveSelectedCompositionStatus === "failed" ? "失敗" : "尚未產生"}</span>
              </p>
            </div>
          )}

          {/* Pipeline status summary — 5 rows */}
          <div style={{ marginTop: 14, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ color: "#9B9387", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>第 {selectedSlideNumber} 張｜流程狀態</p>
            {(
              [
                {
                  label: "首幀圖",
                  value: selectedState.keyframeStatus === "generated" ? "已產生" : selectedState.keyframeStatus === "generating" ? "生成中" : selectedState.keyframeStatus === "failed" ? "失敗" : "尚未產生",
                  pass: selectedState.keyframeStatus === "generated",
                  fail: selectedState.keyframeStatus === "failed",
                },
                {
                  label: "Runway 動態背景",
                  value: selectedState.motionStatus === "generated" ? "已產生" : selectedState.motionStatus === "generating" ? "生成中" : selectedState.motionStatus === "failed" ? "失敗" : "尚未產生",
                  pass: selectedState.motionStatus === "generated",
                  fail: selectedState.motionStatus === "failed",
                },
                {
                  label: "來源比例",
                  value: selectedState.providerRatioStatus === "accepted_intermediate" ? "已接受中間素材" : selectedState.providerRatioStatus === "failed" ? "失敗" : "尚未驗證",
                  pass: selectedState.providerRatioStatus === "accepted_intermediate",
                  fail: selectedState.providerRatioStatus === "failed",
                },
                {
                  label: "最終合成",
                  value: effectiveSelectedCompositionStatus === "composed" ? "已合成" : effectiveSelectedCompositionStatus === "composing" ? "合成中" : effectiveSelectedCompositionStatus === "needed" ? "待處理" : effectiveSelectedCompositionStatus === "failed" ? "失敗" : "尚未產生",
                  pass: effectiveSelectedCompositionStatus === "composed",
                  fail: selectedState.compositionStatus === "failed",
                },
                {
                  label: "最終比例",
                  value: selectedState.finalRatioStatus === "passed_4_5" ? "通過 4:5" : "尚未驗證",
                  pass: selectedState.finalRatioStatus === "passed_4_5",
                  fail: false,
                },
              ] as { label: string; value: string; pass: boolean; fail: boolean }[]
            ).map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 5, marginBottom: 5, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color: "#9B9387", fontSize: 10, fontWeight: 600 }}>{row.label}</span>
                <span style={{ color: row.pass ? "#4ade80" : row.fail ? "#f87171" : "#FB923C", fontSize: 10, fontWeight: 700 }}>{row.value}</span>
              </div>
            ))}
            <p style={{ color: "#9B9387", fontSize: 9, marginTop: 2 }}>
              最終比例通過 4:5 是審核前的必要條件 · 動態門檻需要 8/8 張全部完成
            </p>
          </div>

          {/* Overall note */}
          <div style={{ marginTop: 10, background: readySlideCount === 8 ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)", border: `1px solid ${readySlideCount === 8 ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)"}`, borderRadius: 8, padding: "8px 12px" }}>
            <p style={{ color: readySlideCount === 8 ? "#4ade80" : "#f87171", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>
              {readySlideCount === 8 ? "動態就緒｜8/8 張最終 MP4" : `動態尚未就緒｜${readySlideCount}/8 張`}
            </p>
            <p style={{ color: "#CFC7BA", fontSize: 10, lineHeight: 1.55 }}>
              {readySlideCount === 8
                ? "所有 8 張圖卡已完成完整流程，可進行手動發布。"
                : "Runway 輸出中間格式 832:1104，仍需最終 4:5 合成。所有 8 張圖卡必須完成完整流程，動態門檻方可通過。"}
            </p>
          </div>
        </div>

        {/* ── 8-Slide Overview ─────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>8 張動態輪播製作區</p>
            <span style={{ color: readySlideCount === 8 ? "#4ade80" : "#FB923C", fontSize: 10, fontWeight: 700 }}>{readySlideCount}/8 已完成</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {slides.map((s, i) => {
              const st = slideMotionStates[i] ?? createEmptySlideMotionState(i);
              const effComp = getEffectiveCompositionStatus(st);
              const isReady = st.keyframeStatus === "generated" && st.motionStatus === "generated" && st.providerRatioStatus === "accepted_intermediate" && effComp === "composed" && st.finalRatioStatus === "passed_4_5";
              const pill = (label: string, pass: boolean, fail: boolean) => (
                <span key={label} style={{ fontSize: 8, fontWeight: 700, borderRadius: 4, padding: "1px 6px", flexShrink: 0, color: pass ? "#4ade80" : fail ? "#f87171" : "#FB923C", background: pass ? "rgba(34,197,94,0.08)" : fail ? "rgba(239,68,68,0.08)" : "rgba(249,115,22,0.08)", border: `1px solid ${pass ? "rgba(34,197,94,0.18)" : fail ? "rgba(239,68,68,0.15)" : "rgba(249,115,22,0.2)"}` }}>
                  {label}
                </span>
              );
              return (
                <div
                  key={i}
                  onClick={() => setSelectedMotionSlide(i)}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: i === selectedMotionSlide ? "rgba(249,115,22,0.05)" : isReady ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.015)", border: `1.5px solid ${i === selectedMotionSlide ? "rgba(249,115,22,0.30)" : isReady ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)"}`, borderRadius: 10, padding: "9px 13px", cursor: "pointer" }}
                >
                  <span style={{ color: "#9B9387", fontSize: 10, fontFamily: "monospace", fontWeight: 700, flexShrink: 0 }}>{String(s.slide_number).padStart(2, "0")}</span>
                  <RoleBadge label={s.role_label} />
                  <span style={{ color: "#CFC7BA", fontSize: 10, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.main_lines[0] ?? s.main_copy}</span>
                  <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                    {pill("KF", st.keyframeStatus === "generated", st.keyframeStatus === "failed")}
                    {pill("MOT", st.motionStatus === "generated", st.motionStatus === "failed")}
                    {pill("RATIO", st.providerRatioStatus === "accepted_intermediate", st.providerRatioStatus === "failed")}
                    {pill("COMP", effComp === "composed", effComp === "failed")}
                    {pill("4:5", st.finalRatioStatus === "passed_4_5", false)}
                  </div>
                  {isReady && (
                    <span style={{ fontSize: 7, fontWeight: 700, color: "#4ade80", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 4, padding: "1px 6px", flexShrink: 0 }}>已完成</span>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ color: "#9B9387", fontSize: 9, marginTop: 8 }}>
            點擊滑動列以預覽 · KF=首幀圖 · MOT=Runway 動態背景 · RATIO=來源比例 · COMP=最終合成 · 4:5=最終比例
          </p>
        </div>

        {/* ── Generate All Motion Slides (locked) ──────────────── */}
        <div style={{ marginBottom: 24 }}>
          <button
            disabled
            style={{ width: "100%", height: 46, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", color: "#9B9387", fontSize: 13, fontWeight: 700, cursor: "not-allowed", letterSpacing: "0.02em" }}
          >
            批次生成 8 張動態輪播｜暫時鎖定
          </button>
          <p style={{ color: "#9B9387", fontSize: 10, textAlign: "center", marginTop: 6 }}>
            所有圖卡提示詞和單張工作流程驗證完成後，批次生成功能將開放。
          </p>
        </div>

        {/* ── Motion Preview ────────────────────────────────────── */}
        <MotionPreviewPanel
          slides={slides}
          selectedSlide={selectedMotionSlide}
          onSelect={setSelectedMotionSlide}
          slideMotionStates={slideMotionStates}
        />

        {/* ── Per-Slide Motion Status ───────────────────────────── */}
        <SlideMotionStatus slides={slides} />

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 28 }} />

        {/* ── Caption ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700 }}>說明文字</p>
              <p style={{ color: "#9B9387", fontSize: 11, marginTop: 2 }}>{caption.length} 字</p>
            </div>
            <CopyButton text={caption} label="複製說明文字" />
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px" }}>
            <p style={{ color: "#CFC7BA", fontSize: 13, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{caption}</p>
          </div>
        </div>

        {/* ── Hashtags ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700 }}>主題標籤</p>
            <CopyButton text={hashtags.join(" ")} label="複製全部" />
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
          <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>動態發布清單</p>
          <p style={{ color: "#9B9387", fontSize: 11, marginBottom: 14 }}>Instagram 未串接 — 依照以下步驟準備 motion slides 後手動發布</p>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
            {launch_checklist.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 16px", borderBottom: i < launch_checklist.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: i < 3 ? "rgba(59,130,246,0.02)" : "transparent" }}>
                <span style={{ color: i < 3 ? "#60a5fa" : "#9B9387", fontSize: 10, fontWeight: 700, fontFamily: "monospace", flexShrink: 0, marginTop: 1 }}>{String(i + 1).padStart(2, "0")}</span>
                <p style={{ color: "#CFC7BA", fontSize: 12, lineHeight: 1.6 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 28 }} />

        {/* ── Canva Motion Pack ─────────────────────────────────── */}
        <CanvaMotionPackSection />

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 24 }} />

        {/* ── Debug Sections ────────────────────────────────────── */}
        <p style={{ color: "#9B9387", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>除錯功能區</p>

        <CollapsibleSection title="Runway 診斷區" subtitle="Slide 1 成功 vs Slide 2 失敗比對｜不呼叫 API｜不消耗 credits">
          <RunwayDiagnosticPanel slide1State={slideMotionStates[0]} slide2State={slideMotionStates[1]} />
        </CollapsibleSection>

        <CollapsibleSection title="靜態預覽流程" subtitle="僅首幀參考｜非最終輸出｜靜態圖 ≠ 動態就緒">
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

        <CollapsibleSection title="靜態預覽品質門檻" subtitle="僅限除錯｜still_preview ≠ 最終輸出">
          <StillGatePanel gate={quality_gate} />
        </CollapsibleSection>

        <CollapsibleSection title="動態生成提示詞" subtitle="各張圖卡影片提示詞">
          <MotionPromptLayer slides={slides} />
        </CollapsibleSection>

        <CollapsibleSection title="首幀圖提示詞" subtitle="OpenAI still_preview 提示詞">
          <StillPreviewPromptLayer slides={slides} />
        </CollapsibleSection>

        <CollapsibleSection title="Content Layer" subtitle="8 張文案 · main / support / highlight">
          <ContentLayer slides={slides} />
        </CollapsibleSection>

        <CollapsibleSection title="版面設計層" subtitle="模板 · 遮罩 · 可讀性">
          <TypographyLayer slides={slides} />
        </CollapsibleSection>

        <CollapsibleSection title="CSS 漸層預覽" subtitle="非最終輸出｜僅漸層｜無真實背景">
          <CSSPreviewLayer slides={slides} />
        </CollapsibleSection>

        <CollapsibleSection title="手動排版室" subtitle="除錯備用｜上傳靜態素材測試版面">
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
          <p style={{ color: "#9B9387", fontSize: 10, lineHeight: 1.7 }}>
            動態發布流程｜僅限內部除錯｜未加入主導覽
            <br />
            Phoenix 未發布至 Instagram · 無生產環境寫入 · 僅手動發布
          </p>
        </div>

      </div>
    </div>
  );
}
