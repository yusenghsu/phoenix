"use client";

import type { LaunchSlide, TypographyTemplate, OverlayMask } from "@/lib/launch/final-launch-pack";

// ── Exported types ─────────────────────────────────────────────────────────────

export interface SlideArtworkState {
  background_status: "missing" | "generating" | "generated" | "failed";
  composition_status: "missing" | "composing" | "composed" | "failed";
  final_artwork_status: "missing" | "ready" | "rejected";
  background_url?: string;
  generated_at?: string;
  error?: string;
}

// ── Size tokens ────────────────────────────────────────────────────────────────

const SIZE = {
  featured: {
    mainPx: 32,
    supportPx: 15,
    numPx: 10,
    rolePx: 7.5,
    footerPx: 9,
    padPct: "8%",
    dividerW: 22,
    gap: 9,
  },
  thumbnail: {
    mainPx: 8.5,
    supportPx: 4.5,
    numPx: 4,
    rolePx: 3.5,
    footerPx: 3.5,
    padPct: "8%",
    dividerW: 7,
    gap: 3,
  },
} as const;

// ── Overlay masks ──────────────────────────────────────────────────────────────

function getOverlayBg(mask: OverlayMask): string {
  switch (mask) {
    case "left-gradient":   return "linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 52%, transparent 100%)";
    case "right-gradient":  return "linear-gradient(270deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 52%, transparent 100%)";
    case "top-gradient":    return "linear-gradient(180deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 45%, transparent 100%)";
    case "bottom-glass":    return "linear-gradient(0deg, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.58) 36%, transparent 100%)";
    case "center-vignette": return "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 18%, rgba(0,0,0,0.62) 100%)";
  }
}

const VIGNETTE = "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 38%, rgba(0,0,0,0.55) 100%)";

// ── Text block positioning ─────────────────────────────────────────────────────

interface TextPos {
  left: string;
  top?: string;
  bottom?: string;
  width: string;
  center: boolean;
}

function getTextPos(template: TypographyTemplate): TextPos {
  switch (template) {
    case "left-heavy":       return { left: "8%", top: "12%", width: "55%", center: false };
    case "right-heavy":      return { left: "37%", top: "12%", width: "55%", center: false };
    case "bottom-anchor":    return { left: "8%", bottom: "12%", width: "84%", center: false };
    case "top-anchor":       return { left: "8%", top: "8%", width: "84%", center: false };
    case "center-statement": return { left: "10%", top: "28%", width: "80%", center: true };
    case "split-tension":    return { left: "8%", top: "28%", width: "84%", center: false };
  }
}

// ── Highlight rendering ────────────────────────────────────────────────────────

function HighlightedLine({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <span style={{ color: "#FAFAF9" }}>{text}</span>;
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
        p.hl
          ? <span key={i} style={{ color: "#F97316" }}>{p.t}</span>
          : <span key={i} style={{ color: "#FAFAF9" }}>{p.t}</span>
      )}
    </>
  );
}

// ── Status placeholder states ──────────────────────────────────────────────────

function GeneratingState({ size }: { size: "featured" | "thumbnail" }) {
  const is = size === "featured";
  return (
    <div style={{
      width: "100%", aspectRatio: "4 / 5",
      background: "linear-gradient(145deg, #100E0B 0%, #0C0A08 100%)",
      borderRadius: is ? 18 : 10,
      border: "1px solid rgba(249,115,22,0.08)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: is ? 12 : 5,
    }}>
      <>
        <style>{`@keyframes ac-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: is ? 28 : 14, height: is ? 28 : 14,
          borderRadius: "50%",
          border: `${is ? 2 : 1.5}px solid rgba(249,115,22,0.18)`,
          borderTopColor: "#F97316",
          animation: "ac-spin 1s linear infinite",
        }} />
      </>
      {is && <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}>Generating background...</p>}
    </div>
  );
}

function FailedState({ error, size }: { error?: string; size: "featured" | "thumbnail" }) {
  const is = size === "featured";
  return (
    <div style={{
      width: "100%", aspectRatio: "4 / 5",
      background: "#0C0A08",
      borderRadius: is ? 18 : 10,
      border: "1px solid rgba(239,68,68,0.12)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: is ? 8 : 4, padding: is ? "20px" : "8px",
    }}>
      <span style={{ color: "#f87171", fontSize: is ? 18 : 10 }}>✗</span>
      {is && (
        <>
          <p style={{ color: "#f87171", fontSize: 11, fontWeight: 600, textAlign: "center" }}>Generation failed</p>
          {error && <p style={{ color: "#52504E", fontSize: 10, lineHeight: 1.5, textAlign: "center" }}>{error.slice(0, 160)}</p>}
        </>
      )}
    </div>
  );
}

function EmptyState({ size }: { size: "featured" | "thumbnail" }) {
  const is = size === "featured";
  return (
    <div style={{
      width: "100%", aspectRatio: "4 / 5",
      background: "#0E0C0A",
      borderRadius: is ? 18 : 10,
      border: "1px solid rgba(255,255,255,0.04)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: is ? 10 : 4,
    }}>
      {is ? (
        <>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#1A1816", fontSize: 14 }}>○</span>
          </div>
          <p style={{ color: "#1A1816", fontSize: 10, textAlign: "center" }}>No artwork generated yet</p>
        </>
      ) : (
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
      )}
    </div>
  );
}

// ── Main artboard ──────────────────────────────────────────────────────────────

interface Props {
  slide: LaunchSlide;
  artwork: SlideArtworkState;
  size?: "featured" | "thumbnail";
  exportMode?: boolean;
}

export default function FinalArtworkComposer({ slide, artwork, size = "featured", exportMode = false }: Props) {
  const isFeatured = size === "featured";
  const s = SIZE[size];

  if (artwork.background_status === "generating") return <GeneratingState size={size} />;
  if (artwork.background_status === "failed") return <FailedState error={artwork.error} size={size} />;
  if (!artwork.background_url || artwork.final_artwork_status === "missing") return <EmptyState size={size} />;

  const t = slide.typography;
  const pos = getTextPos(t.template);
  const overlayBg = getOverlayBg(t.overlay_mask);
  const mainLines = slide.main_lines.length > 0 ? slide.main_lines : [slide.main_copy];
  const supportLines = slide.support_lines.length > 0 ? slide.support_lines : [slide.support_copy];
  const textAlign = pos.center ? "center" : ("left" as const);
  const selfAlign = pos.center ? "center" : ("flex-start" as const);

  return (
    <div style={{
      position: "relative",
      width: "100%",
      aspectRatio: "4 / 5",
      overflow: "hidden",
      borderRadius: exportMode ? 0 : (isFeatured ? 18 : 10),
      border: exportMode ? "none" : "1px solid rgba(249,115,22,0.07)",
      background: "#0C0A08",
    }}>

      {/* Layer 1: Generated background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={artwork.background_url}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
      />

      {/* Layer 2: Overlay mask */}
      <div style={{ position: "absolute", inset: 0, background: overlayBg }} />

      {/* Layer 3: Vignette */}
      <div style={{ position: "absolute", inset: 0, background: VIGNETTE }} />

      {/* Layer 4: Split divider */}
      {t.template === "split-tension" && (
        <div style={{ position: "absolute", top: "10%", bottom: "12%", left: "50%", width: 1, background: "rgba(255,255,255,0.06)" }} />
      )}

      {/* Layer 5: Text block */}
      <div style={{
        position: "absolute",
        left: pos.left,
        top: pos.top,
        bottom: pos.bottom,
        width: pos.width,
        display: "flex",
        flexDirection: "column",
        alignItems: selfAlign,
      }}>
        {/* Slide number + role */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: s.gap }}>
          <span style={{ color: "rgba(249,115,22,0.28)", fontSize: s.numPx, fontFamily: "monospace", fontWeight: 600 }}>
            {String(slide.slide_number).padStart(2, "0")}
          </span>
          <span style={{ color: "rgba(255,255,255,0.14)", fontSize: s.rolePx, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {slide.role_label}
          </span>
        </div>

        {/* Main copy — line by line, no CSS auto-break */}
        <div style={{ marginBottom: s.gap }}>
          {mainLines.map((line, i) => (
            <p key={i} style={{ margin: "0 0 2px 0", fontSize: s.mainPx, fontWeight: 800, lineHeight: 1.22, letterSpacing: "-0.025em", textAlign }}>
              <HighlightedLine text={line} words={slide.highlight_words} />
            </p>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: s.dividerW, height: 1.5, background: "rgba(249,115,22,0.28)", borderRadius: 2, marginBottom: s.gap, alignSelf: selfAlign }} />

        {/* Support copy — line by line */}
        <div>
          {supportLines.map((line, i) => (
            <p key={i} style={{ margin: "0 0 1px 0", color: "rgba(250,250,249,0.56)", fontSize: s.supportPx, fontWeight: 400, lineHeight: 1.65, textAlign }}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Layer 6: Footer */}
      <div style={{ position: "absolute", bottom: "5%", left: "8%", right: "8%", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <p style={{ color: "rgba(249,115,22,0.16)", fontSize: s.footerPx, fontWeight: 600, letterSpacing: "0.07em", textAlign: pos.center ? "center" : "left" }}>
          小佑老師｜保險新人真話
        </p>
      </div>

      {/* Ready badge — featured, non-export */}
      {artwork.final_artwork_status === "ready" && isFeatured && !exportMode && (
        <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 6, padding: "3px 8px" }}>
          <span style={{ color: "#4ade80", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em" }}>ARTWORK READY</span>
        </div>
      )}
    </div>
  );
}
