"use client";

import type { LaunchSlide, TypographyTemplate, OverlayMask } from "@/lib/launch/final-launch-pack";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ComposerSize = "featured" | "thumbnail";

interface Props {
  slide: LaunchSlide;
  total: number;
  size?: ComposerSize;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const SIZE_TOKENS = {
  featured: {
    pad: "36px",
    mainSize: "30px",
    mainWeight: 800,
    mainLH: "1.22",
    mainLS: "-0.025em",
    supSize: "15px",
    supWeight: 400,
    supLH: "1.68",
    numSize: "11px",
    roleSize: "8px",
    footerSize: "8.5px",
    dividerW: "22px",
    gapSm: "10px",
    gapMd: "14px",
    footerPadTop: "12px",
  },
  thumbnail: {
    pad: "10px",
    mainSize: "9px",
    mainWeight: 800,
    mainLH: "1.22",
    mainLS: "-0.02em",
    supSize: "5.5px",
    supWeight: 400,
    supLH: "1.6",
    numSize: "5.5px",
    roleSize: "4px",
    footerSize: "4.5px",
    dividerW: "8px",
    gapSm: "3px",
    gapMd: "5px",
    footerPadTop: "5px",
  },
} as const;

// Cinematic dark gradients — NOT fake CSS scenes, just clean dark backgrounds
const BASE_BG: Record<TypographyTemplate, string> = {
  "left-heavy":       "linear-gradient(125deg, #181410 0%, #0E0C0A 45%, #110F0D 100%)",
  "right-heavy":      "linear-gradient(235deg, #181410 0%, #0E0C0A 45%, #110F0D 100%)",
  "bottom-anchor":    "linear-gradient(185deg, #0E0C0A 0%, #0C0A08 50%, #161210 100%)",
  "top-anchor":       "linear-gradient(355deg, #0E0C0A 0%, #0C0A08 50%, #161210 100%)",
  "center-statement": "radial-gradient(ellipse 80% 80% at 50% 48%, #181410 0%, #0C0A08 60%, #090706 100%)",
  "split-tension":    "linear-gradient(90deg, #180E06 0%, #0C0A08 50%, #060A18 100%)",
};

// Overlay masks — darken text-safe zones for readability
const OVERLAY_MASK_BG: Record<OverlayMask, string> = {
  "left-gradient":   "linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 52%, rgba(0,0,0,0.05) 80%, transparent 100%)",
  "right-gradient":  "linear-gradient(270deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 52%, rgba(0,0,0,0.05) 80%, transparent 100%)",
  "top-gradient":    "linear-gradient(180deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.10) 75%, transparent 100%)",
  "bottom-glass":    "linear-gradient(0deg, rgba(6,4,3,0.92) 0%, rgba(8,6,5,0.62) 36%, rgba(0,0,0,0.18) 72%, transparent 100%)",
  "center-vignette": "radial-gradient(ellipse 90% 90% at 50% 50%, rgba(0,0,0,0.05) 18%, rgba(0,0,0,0.55) 100%)",
};

// Vignette applied on every card
const VIGNETTE_BG = "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 38%, rgba(0,0,0,0.58) 100%)";

// ── Orange highlight in text ──────────────────────────────────────────────────

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
        p.hl
          ? <span key={i} style={{ color: "#F97316" }}>{p.t}</span>
          : <span key={i}>{p.t}</span>
      )}
    </>
  );
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

interface TokenSet {
  pad: string;
  mainSize: string;
  mainWeight: number;
  mainLH: string;
  mainLS: string;
  supSize: string;
  supWeight: number;
  supLH: string;
  numSize: string;
  roleSize: string;
  footerSize: string;
  dividerW: string;
  gapSm: string;
  gapMd: string;
  footerPadTop: string;
}

interface BlockProps {
  slide: LaunchSlide;
  tk: TokenSet;
}

function TopBarRow({ slide, tk }: BlockProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "rgba(249,115,22,0.32)", fontSize: tk.numSize, fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.04em" }}>
        {String(slide.slide_number).padStart(2, "0")}
      </span>
      <span style={{ color: "rgba(255,255,255,0.18)", fontSize: tk.roleSize, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {slide.role_label}
      </span>
    </div>
  );
}

function MainCopyBlock({ slide, tk, align = "left" }: BlockProps & { align?: "left" | "center" }) {
  const t = slide.typography;
  const mainLines = slide.main_lines?.length ? slide.main_lines : [slide.main_copy];
  const supportLines = slide.support_lines?.length ? slide.support_lines : [slide.support_copy];
  return (
    <>
      <div style={{ marginBottom: tk.gapSm }}>
        {mainLines.map((line, i) => (
          <p key={i} style={{
            color: "#FAFAF9",
            fontSize: tk.mainSize,
            fontWeight: tk.mainWeight,
            lineHeight: t.line_height,
            letterSpacing: tk.mainLS,
            margin: "0 0 1px 0",
            textAlign: align,
          }}>
            <HighlightedText text={line} words={slide.highlight_words} />
          </p>
        ))}
      </div>
      <div style={{ width: tk.dividerW, height: "1.5px", background: "rgba(249,115,22,0.32)", borderRadius: 2, marginBottom: tk.gapSm, marginLeft: align === "center" ? "auto" : 0, marginRight: align === "center" ? "auto" : 0 }} />
      <div>
        {supportLines.map((line, i) => (
          <p key={i} style={{
            color: "rgba(250,250,249,0.58)",
            fontSize: tk.supSize,
            fontWeight: tk.supWeight,
            lineHeight: tk.supLH,
            margin: "0 0 1px 0",
            textAlign: align,
          }}>
            {line}
          </p>
        ))}
      </div>
    </>
  );
}

function FooterRow({ tk }: { tk: TokenSet }) {
  return (
    <div style={{ paddingTop: tk.footerPadTop, borderTop: "1px solid rgba(255,255,255,0.055)" }}>
      <p style={{ color: "rgba(249,115,22,0.20)", fontSize: tk.footerSize, fontWeight: 600, letterSpacing: "0.07em" }}>
        小佑老師｜保險新人真話
      </p>
    </div>
  );
}

// ── Template layout renderers ─────────────────────────────────────────────────

function LeftHeavyLayout({ slide, tk }: BlockProps) {
  const pad = tk.pad;
  return (
    <>
      {/* Subject area hint — right side */}
      <div style={{ position: "absolute", top: "14%", right: "7%", width: "35%", height: "52%", border: "1px dashed rgba(255,255,255,0.035)", borderRadius: 4 }} />
      {/* Text block — left */}
      <div style={{ position: "absolute", top: pad, bottom: pad, left: pad, right: "44%", display: "flex", flexDirection: "column" }}>
        <TopBarRow slide={slide} tk={tk} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginTop: tk.gapSm }}>
          <MainCopyBlock slide={slide} tk={tk} />
        </div>
        <FooterRow tk={tk} />
      </div>
    </>
  );
}

function RightHeavyLayout({ slide, tk }: BlockProps) {
  const pad = tk.pad;
  return (
    <>
      {/* Subject area hint — left side */}
      <div style={{ position: "absolute", top: "14%", left: "7%", width: "35%", height: "52%", border: "1px dashed rgba(255,255,255,0.035)", borderRadius: 4 }} />
      {/* Text block — right */}
      <div style={{ position: "absolute", top: pad, bottom: pad, left: "44%", right: pad, display: "flex", flexDirection: "column" }}>
        <TopBarRow slide={slide} tk={tk} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginTop: tk.gapSm }}>
          <MainCopyBlock slide={slide} tk={tk} />
        </div>
        <FooterRow tk={tk} />
      </div>
    </>
  );
}

function BottomAnchorLayout({ slide, tk }: BlockProps) {
  const pad = tk.pad;
  return (
    <>
      {/* Top bar */}
      <div style={{ position: "absolute", top: pad, left: pad, right: pad }}>
        <TopBarRow slide={slide} tk={tk} />
      </div>
      {/* Subject area hint — upper */}
      <div style={{ position: "absolute", top: "12%", left: "10%", right: "10%", height: "38%", border: "1px dashed rgba(255,255,255,0.035)", borderRadius: 4 }} />
      {/* Text block — bottom */}
      <div style={{ position: "absolute", bottom: pad, left: pad, right: pad }}>
        <MainCopyBlock slide={slide} tk={tk} />
        <div style={{ marginTop: tk.gapMd }}>
          <FooterRow tk={tk} />
        </div>
      </div>
    </>
  );
}

function TopAnchorLayout({ slide, tk }: BlockProps) {
  const pad = tk.pad;
  return (
    <>
      {/* Text block — top */}
      <div style={{ position: "absolute", top: pad, left: pad, right: pad }}>
        <TopBarRow slide={slide} tk={tk} />
        <div style={{ marginTop: tk.gapSm }}>
          <MainCopyBlock slide={slide} tk={tk} />
        </div>
      </div>
      {/* Subject area hint — lower */}
      <div style={{ position: "absolute", top: "52%", left: "10%", right: "10%", height: "35%", border: "1px dashed rgba(255,255,255,0.035)", borderRadius: 4 }} />
      {/* Footer */}
      <div style={{ position: "absolute", bottom: pad, left: pad, right: pad }}>
        <FooterRow tk={tk} />
      </div>
    </>
  );
}

function CenterStatementLayout({ slide, tk }: BlockProps) {
  const pad = tk.pad;
  return (
    <>
      {/* Top bar */}
      <div style={{ position: "absolute", top: pad, left: pad, right: pad, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <TopBarRow slide={slide} tk={tk} />
      </div>
      {/* Center main content */}
      <div style={{ position: "absolute", top: "22%", bottom: "20%", left: "10%", right: "10%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <MainCopyBlock slide={slide} tk={tk} align="center" />
      </div>
      {/* Footer */}
      <div style={{ position: "absolute", bottom: pad, left: pad, right: pad }}>
        <FooterRow tk={tk} />
      </div>
    </>
  );
}

function SplitTensionLayout({ slide, tk }: BlockProps) {
  const pad = tk.pad;
  return (
    <>
      {/* Visual split: left warm / right cool */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(251,146,60,0.04) 0%, transparent 50%, rgba(60,80,180,0.04) 100%)" }} />
      {/* Vertical divider */}
      <div style={{ position: "absolute", top: "10%", bottom: "12%", left: "50%", width: 1, background: "rgba(255,255,255,0.06)" }} />
      {/* Top bar */}
      <div style={{ position: "absolute", top: pad, left: pad, right: pad }}>
        <TopBarRow slide={slide} tk={tk} />
      </div>
      {/* Centered text spanning both halves */}
      <div style={{ position: "absolute", top: "22%", bottom: "20%", left: "8%", right: "8%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <MainCopyBlock slide={slide} tk={tk} />
      </div>
      {/* Footer */}
      <div style={{ position: "absolute", bottom: pad, left: pad, right: pad }}>
        <FooterRow tk={tk} />
      </div>
    </>
  );
}

// ── Main Composer Component ────────────────────────────────────────────────────

export default function LaunchSlideComposer({ slide, total: _total, size = "featured" }: Props) {
  const t = slide.typography;
  const isApproved = slide.still_preview.status === "approved";
  const isFeatured = size === "featured";
  const tk = SIZE_TOKENS[size];

  // Render template layout
  function TemplateLayout() {
    const props = { slide, tk };
    switch (t.template) {
      case "right-heavy":      return <RightHeavyLayout {...props} />;
      case "bottom-anchor":    return <BottomAnchorLayout {...props} />;
      case "top-anchor":       return <TopAnchorLayout {...props} />;
      case "center-statement": return <CenterStatementLayout {...props} />;
      case "split-tension":    return <SplitTensionLayout {...props} />;
      default:                 return <LeftHeavyLayout {...props} />;
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 5", overflow: "hidden", borderRadius: isFeatured ? 18 : 10, border: "1px solid rgba(249,115,22,0.07)" }}>
      {/* Layer 1: Base dark gradient */}
      <div style={{ position: "absolute", inset: 0, background: BASE_BG[t.template] }} />

      {/* Layer 2: Real image/video (approved asset only) */}
      {isApproved && slide.still_preview.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.still_preview.image_url}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      {/* Layer 3: Overlay mask — positions safe zone for text */}
      <div style={{ position: "absolute", inset: 0, background: OVERLAY_MASK_BG[t.overlay_mask] }} />

      {/* Layer 4: Vignette — always */}
      <div style={{ position: "absolute", inset: 0, background: VIGNETTE_BG }} />

      {/* Layer 5: Template layout with text */}
      <TemplateLayout />

      {/* Layer 6: VISUAL ASSET MISSING notice — bottom strip when featured, watermark when thumbnail */}
      {!isApproved && isFeatured && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "rgba(8,5,4,0.90)",
          borderTop: "1px solid rgba(239,68,68,0.18)",
          padding: "9px 16px",
        }}>
          <p style={{ color: "#f87171", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 2 }}>
            VISUAL ASSET MISSING — preview is not final
          </p>
          <p style={{ color: "#2A2826", fontSize: 8, lineHeight: 1.4 }}>
            CSS placeholder only. Generate &amp; approve a real image/video asset before publishing.
          </p>
        </div>
      )}
      {!isApproved && !isFeatured && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <span style={{ color: "rgba(239,68,68,0.08)", fontSize: "8px", fontWeight: 900, letterSpacing: "0.08em", transform: "rotate(-30deg)", whiteSpace: "nowrap" }}>
            NO ASSET
          </span>
        </div>
      )}
    </div>
  );
}
