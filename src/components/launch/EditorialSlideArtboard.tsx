"use client";

import type { LaunchSlide, TypographyTemplate, OverlayMask } from "@/lib/launch/final-launch-pack";

// ── Exported types (used by page.tsx) ─────────────────────────────────────────

export type ExtendedOverlayMask = OverlayMask | "none" | "full-darken";

export interface LocalSlideState {
  local_asset_url?: string;
  local_asset_type?: "image" | "video";
  local_asset_status: "missing" | "preview_uploaded" | "local_approved" | "rejected";
  local_review_note?: string;
}

export interface SlideTypographyControls {
  template: TypographyTemplate;
  x_offset: number;        // -20 to 20 (percent from base position)
  y_offset: number;        // -20 to 20 (percent from base position)
  text_width: number;      // 30-85 (% of artboard width)
  main_scale: number;      // 0.6-1.8 multiplier
  support_scale: number;   // 0.6-1.8 multiplier
  overlay_mask: ExtendedOverlayMask;
  mask_strength: number;   // 0-100
  text_color_mode: "white" | "warm-white";
  emphasis_style: "orange" | "underline" | "boxed" | "none";
  footer_visible: boolean;
}

interface Props {
  slide: LaunchSlide;
  total: number;
  localState: LocalSlideState;
  controls: SlideTypographyControls;
  exportMode?: boolean;
}

// ── Design constants ──────────────────────────────────────────────────────────

const BASE_MAIN_PX = 28;
const BASE_SUPPORT_PX = 14;

const VIGNETTE = "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 38%, rgba(0,0,0,0.55) 100%)";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMainColor(mode: SlideTypographyControls["text_color_mode"]): string {
  return mode === "warm-white" ? "#F5EFE8" : "#FAFAF9";
}

function getOverlayBg(mask: ExtendedOverlayMask, strength: number): string {
  const s = (strength / 100).toFixed(2);
  const s38 = (strength * 0.38 / 100).toFixed(2);
  const s45 = (strength * 0.45 / 100).toFixed(2);
  const s60 = (strength * 0.60 / 100).toFixed(2);
  const s75 = (strength * 0.75 / 100).toFixed(2);
  const s85 = (strength * 0.85 / 100).toFixed(2);
  const s92 = (strength * 0.92 / 100).toFixed(2);
  switch (mask) {
    case "left-gradient":   return `linear-gradient(90deg, rgba(0,0,0,${s75}) 0%, rgba(0,0,0,${s38}) 52%, transparent 100%)`;
    case "right-gradient":  return `linear-gradient(270deg, rgba(0,0,0,${s75}) 0%, rgba(0,0,0,${s38}) 52%, transparent 100%)`;
    case "top-gradient":    return `linear-gradient(180deg, rgba(0,0,0,${s85}) 0%, rgba(0,0,0,${s45}) 45%, transparent 100%)`;
    case "bottom-glass":    return `linear-gradient(0deg, rgba(0,0,0,${s92}) 0%, rgba(0,0,0,${s60}) 36%, transparent 100%)`;
    case "center-vignette": return `radial-gradient(ellipse 90% 90% at 50% 50%, transparent 18%, rgba(0,0,0,${s60}) 100%)`;
    case "full-darken":     return `rgba(0,0,0,${s75})`;
    case "none":            return "transparent";
  }
}

// ── Text block positioning ────────────────────────────────────────────────────

interface TextPos {
  left: string;
  right?: string;
  top?: string;
  bottom?: string;
  width: string;
  centerText: boolean;
}

function getTextPos(
  template: TypographyTemplate,
  xOffset: number,
  yOffset: number,
  textWidth: number
): TextPos {
  const w = `${textWidth}%`;
  switch (template) {
    case "left-heavy":
      return { left: `${8 + xOffset}%`, top: `${12 + yOffset}%`, width: w, centerText: false };
    case "right-heavy": {
      const baseLeft = 100 - textWidth - 8;
      return { left: `${Math.max(0, baseLeft + xOffset)}%`, top: `${12 + yOffset}%`, width: w, centerText: false };
    }
    case "bottom-anchor":
      return { left: `${8 + xOffset}%`, bottom: `${10 - yOffset}%`, width: w, centerText: false };
    case "top-anchor":
      return { left: `${8 + xOffset}%`, top: `${8 + yOffset}%`, width: w, centerText: false };
    case "center-statement": {
      const baseLeft = 50 - textWidth / 2;
      return { left: `${baseLeft + xOffset}%`, top: `${30 + yOffset}%`, width: w, centerText: true };
    }
    case "split-tension":
      return { left: `${8 + xOffset}%`, top: `${28 + yOffset}%`, width: `${84}%`, centerText: false };
  }
}

// ── Emphasized text rendering ─────────────────────────────────────────────────

function EmphasizedLine({
  text,
  words,
  emphasisStyle,
  mainColor,
}: {
  text: string;
  words: string[];
  emphasisStyle: SlideTypographyControls["emphasis_style"];
  mainColor: string;
}) {
  if (!words.length || emphasisStyle === "none") {
    return <span style={{ color: mainColor }}>{text}</span>;
  }

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
      {parts.map((p, i) => {
        if (!p.hl) return <span key={i} style={{ color: mainColor }}>{p.t}</span>;
        switch (emphasisStyle) {
          case "orange":
            return <span key={i} style={{ color: "#F97316" }}>{p.t}</span>;
          case "underline":
            return <span key={i} style={{ color: mainColor, textDecoration: "underline", textUnderlineOffset: "3px" }}>{p.t}</span>;
          case "boxed":
            return (
              <span key={i} style={{ color: "#F97316", background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.28)", borderRadius: 3, padding: "0 4px" }}>
                {p.t}
              </span>
            );
          default:
            return <span key={i} style={{ color: mainColor }}>{p.t}</span>;
        }
      })}
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ status, note }: { status: LocalSlideState["local_asset_status"]; note?: string }) {
  const rejected = status === "rejected";
  return (
    <div style={{
      width: "100%",
      aspectRatio: "4 / 5",
      background: "#0E0C0A",
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.05)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px",
      gap: 14,
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: rejected ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${rejected ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ color: rejected ? "#f87171" : "#252220", fontSize: 18 }}>
          {rejected ? "✗" : "↑"}
        </span>
      </div>

      <div style={{ textAlign: "center" }}>
        {rejected ? (
          <>
            <p style={{ color: "#f87171", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Asset rejected</p>
            {note && <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.6, marginBottom: 6 }}>{note}</p>}
            <p style={{ color: "#252220", fontSize: 10 }}>Upload a new asset to replace.</p>
          </>
        ) : (
          <>
            <p style={{ color: "#3E3B37", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>No visual asset</p>
            <p style={{ color: "#252220", fontSize: 11, lineHeight: 1.6 }}>
              Upload or generate a real visual asset<br />before judging this slide.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main artboard component ───────────────────────────────────────────────────

export default function EditorialSlideArtboard({
  slide,
  total: _total,
  localState,
  controls,
  exportMode = false,
}: Props) {
  const hasAsset =
    localState.local_asset_status === "preview_uploaded" ||
    localState.local_asset_status === "local_approved";

  if (!hasAsset) {
    return (
      <EmptyState status={localState.local_asset_status} note={localState.local_review_note} />
    );
  }

  const mainColor = getMainColor(controls.text_color_mode);
  const supportColor =
    controls.text_color_mode === "warm-white"
      ? "rgba(245,239,232,0.55)"
      : "rgba(250,250,249,0.55)";
  const overlayBg = getOverlayBg(controls.overlay_mask, controls.mask_strength);
  const pos = getTextPos(controls.template, controls.x_offset, controls.y_offset, controls.text_width);

  const mainPx = BASE_MAIN_PX * controls.main_scale;
  const supportPx = BASE_SUPPORT_PX * controls.support_scale;

  const mainLines = slide.main_lines.length > 0 ? slide.main_lines : [slide.main_copy];
  const supportLines = slide.support_lines.length > 0 ? slide.support_lines : [slide.support_copy];

  const textAlign = pos.centerText ? "center" : "left";
  const alignSelf = pos.centerText ? "center" : "flex-start";

  return (
    <div style={{
      position: "relative",
      width: "100%",
      aspectRatio: "4 / 5",
      overflow: "hidden",
      borderRadius: exportMode ? 0 : 18,
      border: exportMode ? "none" : "1px solid rgba(249,115,22,0.07)",
      background: "#0C0A08",
    }}>

      {/* Layer 1: Real background asset */}
      {localState.local_asset_type === "image" && localState.local_asset_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={localState.local_asset_url}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {localState.local_asset_type === "video" && localState.local_asset_url && (
        <video
          src={localState.local_asset_url}
          autoPlay
          muted
          loop
          playsInline
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      {/* Layer 2: Overlay mask */}
      {controls.overlay_mask !== "none" && (
        <div style={{ position: "absolute", inset: 0, background: overlayBg }} />
      )}

      {/* Layer 3: Universal vignette */}
      <div style={{ position: "absolute", inset: 0, background: VIGNETTE }} />

      {/* Layer 4: Split-tension vertical divider */}
      {controls.template === "split-tension" && (
        <div style={{
          position: "absolute",
          top: "10%",
          bottom: "12%",
          left: "50%",
          width: 1,
          background: "rgba(255,255,255,0.06)",
        }} />
      )}

      {/* Layer 5: Text block */}
      <div style={{
        position: "absolute",
        left: pos.left,
        right: pos.right,
        top: pos.top,
        bottom: pos.bottom,
        width: pos.width,
        display: "flex",
        flexDirection: "column",
        alignItems: alignSelf,
      }}>
        {/* Slide number + role */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ color: "rgba(249,115,22,0.30)", fontSize: `${mainPx * 0.34}px`, fontFamily: "monospace", fontWeight: 600 }}>
            {String(slide.slide_number).padStart(2, "0")}
          </span>
          <span style={{ color: "rgba(255,255,255,0.16)", fontSize: `${mainPx * 0.28}px`, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {slide.role_label}
          </span>
        </div>

        {/* Main copy — line by line */}
        <div style={{ marginBottom: `${mainPx * 0.28}px` }}>
          {mainLines.map((line, i) => (
            <p key={i} style={{
              margin: "0 0 2px 0",
              fontSize: `${mainPx}px`,
              fontWeight: 800,
              lineHeight: 1.22,
              letterSpacing: "-0.025em",
              textAlign,
            }}>
              <EmphasizedLine
                text={line}
                words={slide.highlight_words}
                emphasisStyle={controls.emphasis_style}
                mainColor={mainColor}
              />
            </p>
          ))}
        </div>

        {/* Divider */}
        <div style={{
          width: 22,
          height: 1.5,
          background: "rgba(249,115,22,0.30)",
          borderRadius: 2,
          marginBottom: `${mainPx * 0.28}px`,
          alignSelf,
        }} />

        {/* Support copy — line by line */}
        <div>
          {supportLines.map((line, i) => (
            <p key={i} style={{
              margin: "0 0 1px 0",
              color: supportColor,
              fontSize: `${supportPx}px`,
              fontWeight: 400,
              lineHeight: 1.68,
              textAlign,
            }}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Layer 6: Footer */}
      {controls.footer_visible && (
        <div style={{
          position: "absolute",
          bottom: "5%",
          left: "8%",
          right: "8%",
          paddingTop: 10,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          <p style={{
            color: "rgba(249,115,22,0.18)",
            fontSize: `${mainPx * 0.28}px`,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textAlign: pos.centerText ? "center" : "left",
          }}>
            小佑老師｜保險新人真話
          </p>
        </div>
      )}

      {/* "Local Approved" badge (not in export mode) */}
      {localState.local_asset_status === "local_approved" && !exportMode && (
        <div style={{
          position: "absolute",
          top: 14,
          right: 14,
          background: "rgba(34,197,94,0.12)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 6,
          padding: "3px 9px",
        }}>
          <span style={{ color: "#4ade80", fontSize: 8, fontWeight: 700, letterSpacing: "0.08em" }}>
            LOCAL APPROVED
          </span>
        </div>
      )}
    </div>
  );
}
