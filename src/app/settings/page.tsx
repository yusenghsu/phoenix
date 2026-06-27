"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhoenixHeader } from "@/components/PhoenixHeader";

// ─── Data ─────────────────────────────────────────────────────────────────────

const BRAND_VOICE_TAGS = ["清楚", "直接", "有觀點", "不迎合", "解決問題"];

const CONTENT_FORMULA = ["痛點", "破解迷思", "觀點", "解法", "值得分享"];

const CONTENT_RATIO = [
  { label: "觀點", pct: 50, color: "#F97316" },
  { label: "爆點", pct: 30, color: "#FB923C" },
  { label: "故事", pct: 20, color: "#FBBF24" },
];

const METRIC_CARDS = [
  { label: "Save Worthiness", desc: "值得收藏，反覆翻閱" },
  { label: "Share Worthiness", desc: "有人值得看，會想轉傳" },
  { label: "Brand Memory", desc: "看完就記得是小佑說的" },
];

const AVOID_LIST = [
  "心靈雞湯", "無聊內容", "標題黨", "農場文",
  "低品質流量", "沒有觀點", "為了流量而流量",
];

const DECISION_RULES = [
  "如果題目有流量，但不符合品牌，Phoenix 可以否決。",
  "如果題目短期有效，但長期削弱品牌，Phoenix 不推薦。",
  "如果內容沒有觀點，即使好寫也不做。",
  "每天只推薦一個最佳主題。",
  "發布前一定需要小佑確認。",
];

// ─── Small shared components ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: "#52504E",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: 14,
      }}
    >
      {children}
    </p>
  );
}

function Divider() {
  return (
    <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "44px 0" }} />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: "#0C0A08" }}>
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 35% at 50% -8%, rgba(249,115,22,0.05) 0%, transparent 100%)",
        }}
      />

      {/* ── Nav ── */}
      <PhoenixHeader />

      {/* ── Main ── */}
      <main
        className="relative z-10 flex flex-col items-center px-6"
        style={{ paddingTop: 56, paddingBottom: 80 }}
      >
        <div className="w-full" style={{ maxWidth: 520 }}>

          {/* Page header */}
          {ready && (
            <div className="animate-fade-up" style={{ marginBottom: 52 }}>
              <h1
                style={{
                  color: "#FAFAF9",
                  fontSize: 34,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.1,
                  marginBottom: 10,
                }}
              >
                Creator DNA
              </h1>
              <p style={{ color: "#6B6865", fontSize: 14, lineHeight: 1.65, letterSpacing: "-0.01em" }}>
                Phoenix 目前理解的小佑品牌、內容偏好與決策原則。
              </p>
            </div>
          )}

          {/* ── Section 1: Brand Voice ── */}
          {ready && (
            <section className="animate-fade-up delay-100">
              <SectionLabel>Brand Voice</SectionLabel>
              <p
                style={{
                  color: "#FAFAF9",
                  fontSize: 22,
                  fontWeight: 630,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.35,
                  marginBottom: 12,
                }}
              >
                一針見血，直接解開疑問。
              </p>
              <p style={{ color: "#8C8784", fontSize: 14, lineHeight: 1.72, letterSpacing: "-0.01em", marginBottom: 20 }}>
                Phoenix 會優先選擇有清楚觀點、能讓讀者立刻理解問題本質的內容。
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {BRAND_VOICE_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="tag-orange"
                    style={{
                      display: "inline-flex",
                      padding: "6px 13px",
                      borderRadius: 20,
                      background: "rgba(249,115,22,0.07)",
                      border: "1px solid rgba(249,115,22,0.14)",
                      color: "#FB923C",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {ready && <Divider />}

          {/* ── Section 2: Content Goal ── */}
          {ready && (
            <section className="animate-fade-up delay-200">
              <SectionLabel>Content Goal</SectionLabel>
              <p
                style={{
                  color: "#FAFAF9",
                  fontSize: 20,
                  fontWeight: 620,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.4,
                  marginBottom: 12,
                }}
              >
                讓人想收藏，也想分享給某個人。
              </p>
              <p style={{ color: "#8C8784", fontSize: 14, lineHeight: 1.72, letterSpacing: "-0.01em", marginBottom: 20 }}>
                Phoenix 不只看觀看數，而是判斷這篇內容是否值得被轉傳、收藏、在對的時機被再次使用。
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {METRIC_CARDS.map((m) => (
                  <div
                    key={m.label}
                    className="card-hover"
                    style={{
                      flex: 1,
                      padding: "14px 13px",
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p
                      style={{
                        color: "#52504E",
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.09em",
                        textTransform: "uppercase",
                        marginBottom: 8,
                        lineHeight: 1.3,
                      }}
                    >
                      {m.label}
                    </p>
                    <p style={{ color: "#A09D9A", fontSize: 12, lineHeight: 1.6 }}>{m.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {ready && <Divider />}

          {/* ── Section 3: Content Formula ── */}
          {ready && (
            <section className="animate-fade-up delay-200">
              <SectionLabel>Content Formula</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                {CONTENT_FORMULA.map((step, i) => (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "9px 14px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <span style={{ color: "#F97316", fontSize: 10, fontWeight: 700, opacity: 0.65, letterSpacing: "0.02em" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ color: "#FAFAF9", fontSize: 13, fontWeight: 500 }}>{step}</span>
                    </div>
                    {i < CONTENT_FORMULA.length - 1 && (
                      <span style={{ color: "#2E2C29", fontSize: 12 }}>→</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {ready && <Divider />}

          {/* ── Section 4: Content Ratio ── */}
          {ready && (
            <section className="animate-fade-up delay-300">
              <SectionLabel>Content Ratio</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {CONTENT_RATIO.map(({ label, pct, color }) => (
                  <div key={label}>
                    <div
                      className="flex items-center justify-between"
                      style={{ marginBottom: 8 }}
                    >
                      <span style={{ color: "#A09D9A", fontSize: 13, fontWeight: 500 }}>{label}</span>
                      <span style={{ color, fontSize: 14, fontWeight: 650, opacity: 0.9 }}>{pct}%</span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${color}, ${color}BB)`,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {ready && <Divider />}

          {/* ── Section 5: Avoid ── */}
          {ready && (
            <section className="animate-fade-up delay-300">
              <SectionLabel>Phoenix will avoid</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {AVOID_LIST.map((item) => (
                  <div
                    key={item}
                    className="tag-muted"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 13px",
                      borderRadius: 20,
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.065)",
                      color: "#6B6865",
                      fontSize: 12,
                      fontWeight: 400,
                    }}
                  >
                    <span style={{ color: "#3E3B37", fontSize: 10, lineHeight: 1 }}>✕</span>
                    {item}
                  </div>
                ))}
              </div>
            </section>
          )}

          {ready && <Divider />}

          {/* ── Section 6: Design DNA ── */}
          {ready && (
            <section className="animate-fade-up delay-400">
              <SectionLabel>Design DNA</SectionLabel>
              <p
                style={{
                  color: "#FAFAF9",
                  fontSize: 28,
                  fontWeight: 680,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.2,
                  marginBottom: 12,
                }}
              >
                TED × Apple
                <br />
                Louis Vuitton
              </p>
              <p style={{ color: "#8C8784", fontSize: 14, lineHeight: 1.72, letterSpacing: "-0.01em", marginBottom: 16 }}>
                高級、未來感、溫暖、極簡、留白、質感。
              </p>
              <div
                style={{
                  padding: "15px 18px",
                  borderRadius: 12,
                  background: "rgba(249,115,22,0.04)",
                  border: "1px solid rgba(249,115,22,0.09)",
                }}
              >
                <p style={{ color: "#A09D9A", fontSize: 13, lineHeight: 1.7, letterSpacing: "-0.005em" }}>
                  固定品牌風格，不是固定每篇背景。每篇可以不同，但一眼看得出是同一個品牌。
                </p>
              </div>
            </section>
          )}

          {ready && <Divider />}

          {/* ── Section 7: Decision Rules ── */}
          {ready && (
            <section className="animate-fade-up delay-400">
              <SectionLabel>Decision Rules</SectionLabel>
              <div>
                {DECISION_RULES.map((rule, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 18,
                      paddingTop: 18,
                      paddingBottom: 18,
                      borderBottom:
                        i < DECISION_RULES.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",
                    }}
                  >
                    <span
                      style={{
                        color: "#F97316",
                        fontSize: 11,
                        fontWeight: 700,
                        opacity: 0.55,
                        letterSpacing: "0.04em",
                        lineHeight: 1.85,
                        flexShrink: 0,
                        minWidth: 22,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p
                      style={{
                        color: "#A09D9A",
                        fontSize: 14,
                        lineHeight: 1.75,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {rule}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Bottom actions ── */}
          {ready && (
            <div
              className="animate-fade-up delay-500"
              style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 10 }}
            >
              <button
                onClick={() => router.push("/")}
                style={{
                  width: "100%",
                  height: 50,
                  borderRadius: 14,
                  background: "#FAFAF9",
                  color: "#0C0A08",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  border: "none",
                }}
              >
                Back Home
              </button>
              <button
                onClick={() => router.push("/teach")}
                style={{
                  width: "100%",
                  height: 46,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  color: "#FAFAF9",
                  fontSize: 13,
                  fontWeight: 500,
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                Teach Phoenix Again
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
