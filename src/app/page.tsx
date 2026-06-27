"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Data ─────────────────────────────────────────────────────────────────────

const DECISIONS = [
  {
    topic: "退休不是 65 歲開始",
    score: 92,
    grade: "A+",
    reasons: [
      "退休話題最近快速升溫。",
      "你的品牌最近七天沒有談過退休。",
      "這篇能延續你上一個系列。",
      "預估分享潛力在你近期內容最高。",
    ],
    personality: "我沒有選最熱的題目。我選的是最適合你品牌長期累積的。",
  },
  {
    topic: "增員不是招募，是選人",
    score: 87,
    grade: "A",
    reasons: [
      "增員話題在你的受眾中持續升溫。",
      "你的增員目標剛好與這週市場熱點對齊。",
      "超過 30 天沒有這類內容了。",
      "故事型的增員貼文最能引發分享。",
    ],
    personality: "今天我沒有追熱門，而是選擇品牌長期價值。",
  },
];

// ─── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({
  score,
  grade,
  visible,
}: {
  score: number;
  grade: string;
  visible: boolean;
}) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = visible ? circ * (1 - score / 100) : circ;

  return (
    <div style={{ position: "relative", width: 76, height: 76, flexShrink: 0 }}>
      <svg width="76" height="76" viewBox="0 0 76 76" style={{ position: "absolute", inset: 0 }} aria-hidden>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FB923C" />
          </linearGradient>
        </defs>
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
        <circle
          cx="38" cy="38" r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 38 38)"
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1) 0.2s" }}
        />
      </svg>
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 1,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "#FAFAF9" }}>
          {score}
        </span>
        <span
          style={{
            fontSize: 10, fontWeight: 600, color: "#F97316", letterSpacing: "0.02em",
            opacity: visible ? 1 : 0, transition: "opacity 0.4s ease 0.6s",
          }}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [ready, setReady] = useState(false);
  const [scoreVisible, setScoreVisible] = useState(false);

  useEffect(() => {
    setReady(true);
    const t = setTimeout(() => setScoreVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setScoreVisible(false);
    const t = setTimeout(() => setScoreVisible(true), 250);
    return () => clearTimeout(t);
  }, [idx]);

  const decision = DECISIONS[idx];

  function handleReanalyze() {
    setAnalyzing(true);
    setTimeout(() => {
      setIdx((i) => (i + 1) % DECISIONS.length);
      setAnalyzing(false);
    }, 2200);
  }

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: "#0C0A08" }}>
      {/* Ambient warm glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 40% at 50% -8%, rgba(249,115,22,0.07) 0%, transparent 100%)",
        }}
      />

      {/* ── Nav ── */}
      <nav
        className="relative z-10 flex items-center justify-between px-6"
        style={{ height: 52, borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-[7px]"
            style={{ width: 22, height: 22, background: "linear-gradient(145deg, #F97316, #FB923C)" }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M5 0.5L6.2 3.6H9.5L6.9 5.5L7.9 8.6L5 6.7L2.1 8.6L3.1 5.5L0.5 3.6H3.8L5 0.5Z" fill="white" />
            </svg>
          </div>
          <span style={{ color: "#FAFAF9", fontSize: 13, fontWeight: 600, letterSpacing: "-0.015em" }}>
            Phoenix
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/settings")}
            style={{
              background: "none", border: "none", padding: 0,
              color: "#2E2C29", fontSize: 11, fontWeight: 400,
              letterSpacing: "-0.005em",
            }}
          >
            Creator DNA
          </button>
          <button
            onClick={() => router.push("/teach")}
            style={{
              background: "none", border: "none", padding: 0,
              color: "#2E2C29", fontSize: 11, fontWeight: 400,
              letterSpacing: "-0.005em",
            }}
          >
            Teach
          </button>
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 26, height: 26,
              background: "rgba(249,115,22,0.1)",
              color: "#F97316", fontSize: 11, fontWeight: 600,
            }}
          >
            佑
          </div>
        </div>
      </nav>

      {/* ── Content ── */}
      <main
        className="relative z-10 flex flex-col items-center px-6"
        style={{ paddingTop: 36, paddingBottom: 40 }}
      >
        <div className="w-full" style={{ maxWidth: 400 }}>

          {/* ── Hero ── */}
          {ready && (
            <div className="animate-fade-up" style={{ marginBottom: 28 }}>
              <h1
                style={{
                  color: "#FAFAF9",
                  fontSize: 30,
                  fontWeight: 580,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.15,
                  marginBottom: 8,
                }}
              >
                Good morning,{" "}
                <span style={{ fontWeight: 700 }}>小佑.</span>
              </h1>
              <p
                style={{
                  color: "#8C8784",
                  fontSize: 14,
                  lineHeight: 1.55,
                  letterSpacing: "-0.01em",
                }}
              >
                Phoenix 已於 03:00 完成今天的內容決策、輪播草稿與發布準備。
              </p>
            </div>
          )}

          {/* ── Decision block ── */}
          {ready && (
            <div className="animate-fade-up delay-200 relative">

              {/* Analyzing overlay */}
              {analyzing && (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
                  style={{ pointerEvents: "none" }}
                >
                  <div className="flex gap-[5px]">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="inline-block rounded-full"
                        style={{
                          width: 4, height: 4,
                          background: "#F97316",
                          animation: `blink 1.3s ease-in-out ${i * 0.22}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ color: "#52504E", fontSize: 11, letterSpacing: "0.05em" }}>
                    Phoenix is thinking
                  </span>
                </div>
              )}

              <div style={{ opacity: analyzing ? 0.05 : 1, transition: "opacity 0.45s ease" }}>

                {/* Section label */}
                <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  <span
                    style={{
                      color: "#52504E", fontSize: 10, fontWeight: 600,
                      letterSpacing: "0.12em", textTransform: "uppercase",
                    }}
                  >
                    Today&apos;s Decision
                  </span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                </div>

                {/* Topic */}
                <h2
                  style={{
                    color: "#FAFAF9",
                    fontSize: 26,
                    fontWeight: 680,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.2,
                    marginBottom: 6,
                  }}
                >
                  {decision.topic}
                </h2>

                {/* Confidence one-liner */}
                <p
                  style={{
                    color: "#F97316",
                    fontSize: 13,
                    fontStyle: "italic",
                    opacity: 0.75,
                    letterSpacing: "-0.01em",
                    marginBottom: 22,
                  }}
                >
                  今天這篇，我很有信心。
                </p>

                {/* Score row */}
                <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                  <div>
                    <p
                      style={{
                        color: "#6B6865", fontSize: 10, fontWeight: 600,
                        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5,
                      }}
                    >
                      Decision Score
                    </p>
                    <p style={{ color: "#8C8784", fontSize: 13, lineHeight: 1.5, maxWidth: 210 }}>
                      Phoenix 對這篇的信心指數。
                    </p>
                  </div>
                  <ScoreRing score={decision.score} grade={decision.grade} visible={scoreVisible} />
                </div>

                {/* Reasons */}
                <div style={{ marginBottom: 18 }}>
                  <p
                    style={{
                      color: "#6B6865", fontSize: 10, fontWeight: 600,
                      letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
                    }}
                  >
                    為什麼今天推薦這篇？
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {decision.reasons.map((r, i) => (
                      <p
                        key={i}
                        style={{
                          color: "#A09D9A",
                          fontSize: 14,
                          lineHeight: 1.55,
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {r}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Personality */}
                <p
                  style={{
                    color: "#F97316",
                    fontSize: 12,
                    opacity: 0.5,
                    fontStyle: "italic",
                    letterSpacing: "-0.005em",
                    marginBottom: 28,
                  }}
                >
                  — {decision.personality}
                </p>

                {/* ── Actions ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Primary: View Carousel */}
                  <button
                    onClick={() => router.push("/carousel")}
                    style={{
                      width: "100%", height: 50,
                      borderRadius: 14,
                      background: "#FAFAF9",
                      color: "#0C0A08",
                      fontSize: 14, fontWeight: 600,
                      letterSpacing: "-0.01em",
                      border: "none",
                    }}
                  >
                    View Today&apos;s Carousel
                  </button>

                  {/* Secondary: View Decision */}
                  <button
                    onClick={() => router.push("/decision")}
                    style={{
                      width: "100%", height: 46,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.04)",
                      color: "#FAFAF9",
                      fontSize: 13, fontWeight: 500,
                      letterSpacing: "-0.01em",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    View Decision
                  </button>

                  {/* Tertiary: Publish */}
                  <button
                    onClick={() => router.push("/publish")}
                    style={{
                      width: "100%", height: 46,
                      borderRadius: 12,
                      background: "rgba(249,115,22,0.06)",
                      color: "#FB923C",
                      fontSize: 13, fontWeight: 500,
                      letterSpacing: "-0.01em",
                      border: "1px solid rgba(249,115,22,0.12)",
                    }}
                  >
                    Publish
                  </button>

                  {/* Ghost: Re-analyze */}
                  <button
                    onClick={handleReanalyze}
                    disabled={analyzing}
                    style={{
                      width: "100%", height: 36,
                      borderRadius: 10,
                      background: "transparent",
                      color: "#3E3B37",
                      fontSize: 12, fontWeight: 400,
                      border: "none",
                      opacity: analyzing ? 0.3 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    Re-analyze
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Footer */}
          {ready && (
            <p
              className="animate-fade-up delay-400"
              style={{ color: "#252220", fontSize: 11, textAlign: "center", marginTop: 20 }}
            >
              Analyzes daily at 03:00 · Updates every morning
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
