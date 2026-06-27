"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhoenixHeader } from "@/components/PhoenixHeader";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Slide {
  id: number;
  bg: string;
  variant: "cover" | "two-thought" | "statement" | "dramatic" | "minimal" | "quote" | "closing";
  lines: string[];
  highlight?: string;
  copy: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    bg: "linear-gradient(150deg, #1C1208 0%, #0E0B07 55%, #0C0A08 100%)",
    variant: "cover",
    lines: ["退休不是", "65 歲開始"],
    copy: "退休不是 65 歲開始",
  },
  {
    id: 2,
    bg: "linear-gradient(150deg, #0A0B10 0%, #0C0A08 100%)",
    variant: "two-thought",
    lines: ["很多人以為退休是年紀問題。", "其實退休是選擇問題。"],
    copy: "很多人以為退休是年紀問題。\n其實退休是選擇問題。",
  },
  {
    id: 3,
    bg: "linear-gradient(135deg, #0C0A08 0%, #130E04 100%)",
    variant: "statement",
    lines: ["你今天怎麼花錢，", "其實已經在決定", "20 年後的自由。"],
    highlight: "20 年後的自由。",
    copy: "你今天怎麼花錢，\n其實已經在決定 20 年後的自由。",
  },
  {
    id: 4,
    bg: "linear-gradient(180deg, #150A0A 0%, #0C0A08 100%)",
    variant: "dramatic",
    lines: ["真正可怕的不是沒退休金。", "是你一直以為還很早。"],
    copy: "真正可怕的不是沒退休金。\n是你一直以為還很早。",
  },
  {
    id: 5,
    bg: "linear-gradient(145deg, #090C12 0%, #0C0A08 100%)",
    variant: "minimal",
    lines: ["保險不是答案。", "規劃才是。"],
    copy: "保險不是答案。\n規劃才是。",
  },
  {
    id: 6,
    bg: "linear-gradient(135deg, #0C0A08 0%, #0B0C12 100%)",
    variant: "quote",
    lines: ["如果你不知道自己想過什麼生活，", "再多工具都只是工具。"],
    copy: "如果你不知道自己想過什麼生活，\n再多工具都只是工具。",
  },
  {
    id: 7,
    bg: "linear-gradient(150deg, #140D0A 0%, #0C0A08 100%)",
    variant: "two-thought",
    lines: ["退休不是離開工作。", "是擁有選擇。"],
    copy: "退休不是離開工作。\n是擁有選擇。",
  },
  {
    id: 8,
    bg: "linear-gradient(150deg, #0C0A08 0%, #1C1208 100%)",
    variant: "closing",
    lines: ["你不是在準備退休。", "你是在準備", "未來的自由。"],
    highlight: "未來的自由。",
    copy: "你不是在準備退休。\n你是在準備未來的自由。",
  },
];

const CAPTION_BRIEF = "同一個觀念，越早想清楚，越不容易被生活推著走。";

const CAPTION_FULL = `同一個觀念，越早想清楚，越不容易被生活推著走。

很多人都以為退休是 65 歲以後才要想的事。但其實，你現在做的每一個選擇，都在決定未來的自由。

如果你覺得退休還很遠，這篇貼文就是為你寫的。`;

const HASHTAGS = ["#退休規劃", "#人生選擇", "#保險觀念", "#財務自由", "#小佑"];

const CHECKLIST = [
  "8 slides ready",
  "Caption ready",
  "Brand voice matched",
  "Design DNA matched",
  "Decision approved",
];

// ─── Slide renderer ───────────────────────────────────────────────────────────

function SlideContent({ slide, total }: { slide: Slide; total: number }) {
  const pageLabel = (
    <div className="flex items-center justify-between" style={{ padding: "14px 16px 0" }}>
      <div className="flex items-center gap-1.5">
        <div style={{ width: 13, height: 13, borderRadius: 3, background: "linear-gradient(145deg, #F97316, #FB923C)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="6" height="6" viewBox="0 0 10 10" fill="none">
            <path d="M5 0.5L6.2 3.6H9.5L6.9 5.5L7.9 8.6L5 6.7L2.1 8.6L3.1 5.5L0.5 3.6H3.8L5 0.5Z" fill="white" />
          </svg>
        </div>
        <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 9, fontWeight: 500 }}>小佑</span>
      </div>
      <span style={{ color: "rgba(255,255,255,0.18)", fontSize: 9, fontWeight: 500, letterSpacing: "0.04em" }}>
        {slide.id} / {total}
      </span>
    </div>
  );

  if (slide.variant === "cover") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: slide.bg, position: "relative", overflow: "hidden" }}>
        {pageLabel}
        <div style={{ position: "absolute", left: 16, top: "22%", bottom: "22%", width: 2.5, background: "linear-gradient(180deg, #F97316, rgba(249,115,22,0.25))", borderRadius: 2 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 16px 0 28px" }}>
          {slide.lines.map((line, i) => (
            <span key={i} style={{ display: "block", color: i === 0 ? "rgba(255,255,255,0.5)" : "#FAFAF9", fontSize: i === 0 ? 24 : 36, fontWeight: i === 0 ? 500 : 760, letterSpacing: "-0.04em", lineHeight: 1.1 }}>{line}</span>
          ))}
        </div>
        <div style={{ padding: "0 16px 14px", textAlign: "right" }}>
          <span style={{ color: "rgba(255,255,255,0.12)", fontSize: 9, letterSpacing: "0.08em" }}>PHOENIX × 小佑</span>
        </div>
      </div>
    );
  }

  if (slide.variant === "two-thought") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: slide.bg }}>
        {pageLabel}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 20px" }}>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 15, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.45, marginBottom: 14 }}>{slide.lines[0]}</p>
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 14 }} />
          <p style={{ color: "#FAFAF9", fontSize: 20, fontWeight: 650, letterSpacing: "-0.03em", lineHeight: 1.3 }}>{slide.lines[1]}</p>
        </div>
      </div>
    );
  }

  if (slide.variant === "statement") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: slide.bg }}>
        {pageLabel}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 20px" }}>
          {slide.lines.map((line, i) => (
            <span key={i} style={{ display: "block", color: line === slide.highlight ? "#FBBF24" : "#FAFAF9", fontSize: i === slide.lines.length - 1 ? 20 : 16, fontWeight: i === slide.lines.length - 1 ? 680 : 400, letterSpacing: "-0.025em", lineHeight: 1.4, opacity: line === slide.highlight ? 1 : (i === 0 ? 0.5 : 0.8) }}>
              {line}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (slide.variant === "dramatic") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: slide.bg }}>
        {pageLabel}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 20px", gap: 18 }}>
          <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 15, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.5 }}>{slide.lines[0]}</p>
          <p style={{ color: "#FAFAF9", fontSize: 23, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.25 }}>{slide.lines[1]}</p>
        </div>
      </div>
    );
  }

  if (slide.variant === "minimal") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: slide.bg }}>
        {pageLabel}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 22px", gap: 4 }}>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 16, fontWeight: 400, letterSpacing: "-0.02em" }}>{slide.lines[0]}</p>
          <p style={{ color: "#F97316", fontSize: 32, fontWeight: 760, letterSpacing: "-0.05em", lineHeight: 1 }}>{slide.lines[1]}</p>
        </div>
      </div>
    );
  }

  if (slide.variant === "quote") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: slide.bg }}>
        {pageLabel}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 20px" }}>
          <div style={{ color: "rgba(255,255,255,0.07)", fontSize: 56, fontWeight: 700, lineHeight: 0.8, marginBottom: 14 }}>&ldquo;</div>
          {slide.lines.map((line, i) => (
            <p key={i} style={{ color: i === slide.lines.length - 1 ? "#FAFAF9" : "rgba(255,255,255,0.5)", fontSize: 15, fontWeight: i === slide.lines.length - 1 ? 550 : 400, letterSpacing: "-0.02em", lineHeight: 1.5 }}>{line}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: slide.bg }}>
      {pageLabel}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 20px" }}>
        {slide.lines.map((line, i) => (
          <span key={i} style={{ display: "block", color: line === slide.highlight ? "#F97316" : (i === 0 ? "rgba(255,255,255,0.42)" : "#FAFAF9"), fontSize: line === slide.highlight ? 24 : 16, fontWeight: line === slide.highlight ? 700 : 400, letterSpacing: "-0.03em", lineHeight: 1.4 }}>
            {line}
          </span>
        ))}
        <div style={{ height: 1, background: "rgba(249,115,22,0.18)", marginTop: 20, marginBottom: 10, width: 40 }} />
        <span style={{ color: "rgba(255,255,255,0.12)", fontSize: 9, letterSpacing: "0.08em" }}>PHOENIX × 小佑</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CarouselPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const total = SLIDES.length;

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setCurrent((i) => Math.min(i + 1, total - 1));
      if (e.key === "ArrowLeft") setCurrent((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleCopyCaption() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(CAPTION_FULL).catch(() => {});
    }
    showToast("Caption copied.");
  }

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: "#0C0A08" }}>
      {/* Ambient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse 55% 35% at 50% -5%, rgba(249,115,22,0.05) 0%, transparent 100%)" }}
      />

      {/* Toast */}
      <div
        className="pointer-events-none fixed z-50"
        style={{
          top: 20, left: "50%",
          transform: `translateX(-50%) translateY(${toast ? 0 : -8}px)`,
          opacity: toast ? 1 : 0,
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
      >
        <div style={{ background: "rgba(14,10,6,0.97)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "8px 16px", backdropFilter: "blur(20px)" }}>
          <span style={{ color: "#8C8784", fontSize: 13 }}>{toast}</span>
        </div>
      </div>

      {/* ── Nav ── */}
      <PhoenixHeader
        right={
          <div style={{
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.12)",
            borderRadius: 7, padding: "3px 9px",
            color: "#F97316", fontSize: 11, fontWeight: 600,
          }}>
            {current + 1} / {total}
          </div>
        }
      />

      {/* ── Main ── */}
      <main
        className="relative z-10 flex flex-1 flex-col items-center px-4"
        style={{ paddingTop: 14, paddingBottom: 48 }}
      >
        <div className="w-full flex flex-col" style={{ maxWidth: 400 }}>

          {/* ── Slide card ── */}
          {ready && (
            <div style={{
              width: "min(calc(100vw - 32px), 300px)",
              aspectRatio: "1 / 1",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.06)",
              marginBottom: 10,
              position: "relative",
              flexShrink: 0,
              alignSelf: "center",
            }}>
              <div key={current} className="animate-slide-in" style={{ position: "absolute", inset: 0 }}>
                <SlideContent slide={SLIDES[current]} total={total} />
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          {ready && (
            <div className="flex items-center justify-center gap-3" style={{ marginBottom: 10 }}>
              <button
                onClick={() => setCurrent((i) => Math.max(i - 1, 0))}
                disabled={current === 0}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: current === 0 ? "#2E2C29" : "#8C8784",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M9 2.5L4.5 7L9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="flex items-center gap-1.5">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    style={{
                      width: i === current ? 14 : 5, height: 5, borderRadius: 3,
                      background: i === current ? "#F97316" : "rgba(255,255,255,0.1)",
                      border: "none", padding: 0,
                      transition: "width 0.3s ease, background 0.3s ease",
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => setCurrent((i) => Math.min(i + 1, total - 1))}
                disabled={current === total - 1}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: current === total - 1 ? "#2E2C29" : "#8C8784",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M5 2.5L9.5 7L5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}

          {/* ── Current slide copy ── */}
          {ready && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
              marginBottom: 8,
            }}>
              <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 5 }}>
                Slide {current + 1}
              </p>
              <p style={{ color: "#8C8784", fontSize: 13, lineHeight: 1.55, letterSpacing: "-0.01em", whiteSpace: "pre-line" }}>
                {SLIDES[current].copy}
              </p>
            </div>
          )}

          {/* ── Caption ── */}
          {ready && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
              marginBottom: 10,
            }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Caption
                </p>
                <button
                  onClick={() => setCaptionExpanded((v) => !v)}
                  style={{ background: "none", border: "none", padding: 0, color: "#52504E", fontSize: 10, letterSpacing: "-0.005em", cursor: "pointer" }}
                >
                  {captionExpanded ? "Collapse ↑" : "View full caption ↓"}
                </button>
              </div>
              {captionExpanded ? (
                <p style={{ color: "#A09D9A", fontSize: 13, lineHeight: 1.7, letterSpacing: "-0.01em", whiteSpace: "pre-line" }}>
                  {CAPTION_FULL}
                </p>
              ) : (
                <p style={{ color: "#A09D9A", fontSize: 13, lineHeight: 1.6, letterSpacing: "-0.01em" }}>
                  {CAPTION_BRIEF}
                </p>
              )}
            </div>
          )}

          {/* ── Primary actions ── */}
          {ready && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => router.push("/publish")}
                style={{
                  width: "100%", height: 48,
                  borderRadius: 14,
                  background: "#FAFAF9",
                  color: "#0C0A08",
                  fontSize: 14, fontWeight: 600,
                  letterSpacing: "-0.01em",
                  border: "none",
                }}
              >
                Approve &amp; Publish
              </button>

              <button
                onClick={() => router.push("/decision")}
                style={{
                  width: "100%", height: 42,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  color: "#FAFAF9",
                  fontSize: 13, fontWeight: 500,
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                Back to Decision
              </button>
            </div>
          )}

          {/* ── Divider ── */}
          {ready && (
            <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "22px 0 18px" }} />
          )}

          {/* ── Hashtags + Copy Caption ── */}
          {ready && (
            <div style={{ marginBottom: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Hashtags
                </p>
                <button
                  onClick={handleCopyCaption}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 7, padding: "3px 10px",
                    color: "#6B6865", fontSize: 11, fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Copy Caption
                </button>
              </div>
              <p style={{ color: "#3E3B37", fontSize: 11, lineHeight: 1.9, letterSpacing: "0.02em" }}>
                {HASHTAGS.join("  ")}
              </p>
            </div>
          )}

          {/* ── Ready to publish checklist ── */}
          {ready && (
            <div style={{
              padding: "16px 18px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              marginBottom: 14,
            }}>
              <p style={{ color: "#3E3B37", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
                Ready to publish
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {CHECKLIST.map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 15, height: 15, borderRadius: "50%",
                      background: "rgba(34,197,94,0.06)",
                      border: "1px solid rgba(34,197,94,0.14)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5.5L4 7.5L8 3" stroke="rgba(74,222,128,0.75)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span style={{ color: "#6B6865", fontSize: 13, letterSpacing: "-0.005em" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Export status ── */}
          {ready && (
            <div style={{
              padding: "11px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.015)",
              border: "1px solid rgba(255,255,255,0.04)",
              marginBottom: 20,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ color: "#52504E", fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Export ready</p>
                <p style={{ color: "#3E3B37", fontSize: 11 }}>Instagram format · 1:1 · 8 slides</p>
              </div>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "rgba(34,197,94,0.55)",
                boxShadow: "0 0 5px rgba(34,197,94,0.3)",
              }} />
            </div>
          )}

          {/* ── Re-analyze ghost ── */}
          {ready && (
            <button
              onClick={() => showToast("Phoenix will re-analyze tonight.")}
              style={{
                width: "100%", height: 32,
                borderRadius: 10, background: "transparent",
                color: "#3E3B37", fontSize: 12, fontWeight: 400,
                border: "none", cursor: "pointer",
              }}
            >
              Re-analyze
            </button>
          )}

        </div>
      </main>
    </div>
  );
}
