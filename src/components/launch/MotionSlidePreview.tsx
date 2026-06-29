"use client";

import type { LaunchSlide, TypographyTemplate, OverlayMask } from "@/lib/launch/final-launch-pack";

// ── Size tokens ────────────────────────────────────────────────────────────────

const SIZE = {
  featured: { mainPx: 30, supportPx: 14, numPx: 10, rolePx: 7, footerPx: 9, dividerW: 22, gap: 9 },
  thumbnail: { mainPx: 8, supportPx: 4, numPx: 4, rolePx: 3.5, footerPx: 3.5, dividerW: 7, gap: 3 },
} as const;

// ── Overlay mask ───────────────────────────────────────────────────────────────

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

interface TextPos { left: string; top?: string; bottom?: string; width: string; center: boolean; }

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

// ── Orange highlight ───────────────────────────────────────────────────────────

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
        p.hl ? <span key={i} style={{ color: "#F97316" }}>{p.t}</span>
             : <span key={i} style={{ color: "#FAFAF9" }}>{p.t}</span>
      )}
    </>
  );
}

// ── Missing state ──────────────────────────────────────────────────────────────

function MotionMissingState({ size }: { size: "featured" | "thumbnail" }) {
  const is = size === "featured";
  return (
    <div style={{
      width: "100%",
      aspectRatio: "4 / 5",
      background: "#0C0A08",
      borderRadius: is ? 18 : 10,
      border: "1px solid rgba(255,255,255,0.04)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: is ? 12 : 5,
      padding: is ? 24 : 0,
    }}>
      {is ? (
        <>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#1A1816", fontSize: 16 }}>▷</span>
          </div>
          <p style={{ color: "#1A1816", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textAlign: "center", lineHeight: 1.6 }}>
            MOTION ASSET MISSING
            <br />
            <span style={{ fontWeight: 400, fontSize: 9 }}>Connect a motion provider to generate background video</span>
          </p>
        </>
      ) : (
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(255,255,255,0.025)" }} />
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  slide: LaunchSlide;
  videoUrl?: string;
  size?: "featured" | "thumbnail";
  exportMode?: boolean;
  isFinalComposed?: boolean;
}

export default function MotionSlidePreview({ slide, videoUrl, size = "featured", exportMode = false, isFinalComposed = false }: Props) {
  const isFeatured = size === "featured";
  const s = SIZE[size];

  if (!videoUrl) return <MotionMissingState size={size} />;

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

      {/* Layer 1: Background video */}
      <video
        src={videoUrl}
        autoPlay
        muted
        loop
        playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
      />

      {/* Layers 2-6: suppressed when playing final composed MP4 (text already burned in) */}
      {!isFinalComposed && (
        <>
          {/* Layer 2: Overlay mask */}
          <div style={{ position: "absolute", inset: 0, background: overlayBg }} />

          {/* Layer 3: Vignette */}
          <div style={{ position: "absolute", inset: 0, background: VIGNETTE }} />

          {/* Layer 4: Split-tension divider */}
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
            {/* Slide number + role label */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: s.gap }}>
              <span style={{ color: "rgba(249,115,22,0.28)", fontSize: s.numPx, fontFamily: "monospace", fontWeight: 600 }}>
                {String(slide.slide_number).padStart(2, "0")}
              </span>
              <span style={{ color: "rgba(255,255,255,0.14)", fontSize: s.rolePx, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {slide.role_label}
              </span>
            </div>

            {/* Main copy — line by line, fixed Chinese line breaks */}
            <div style={{ marginBottom: s.gap }}>
              {mainLines.map((line, i) => (
                <p key={i} style={{ margin: "0 0 2px 0", fontSize: s.mainPx, fontWeight: 800, lineHeight: 1.22, letterSpacing: "-0.025em", textAlign }}>
                  <HighlightedLine text={line} words={slide.highlight_words} />
                </p>
              ))}
            </div>

            {/* Accent divider */}
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
        </>
      )}

      {/* Badge */}
      {isFeatured && !exportMode && (
        isFinalComposed ? (
          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ background: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.30)", borderRadius: 6, padding: "3px 8px" }}>
              <span style={{ color: "#4ade80", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em" }}>FINAL COMPOSED MP4</span>
            </div>
            <div style={{ background: "rgba(0,0,0,0.45)", borderRadius: 4, padding: "2px 6px" }}>
              <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 7, fontWeight: 500, letterSpacing: "0.05em" }}>Text burned in · no HTML overlay</span>
            </div>
          </div>
        ) : (
          <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 6, padding: "3px 8px" }}>
            <span style={{ color: "#60a5fa", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em" }}>MOTION PREVIEW</span>
          </div>
        )
      )}
    </div>
  );
}
