"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhoenixHeader } from "@/components/PhoenixHeader";

// ─── Data ─────────────────────────────────────────────────────────────────────

const DECISIONS = [
  {
    topic: "退休不是 65 歲開始",
    score: 92,
    grade: "A+",
    personality: "我沒有選最熱門的題目。\n我選的是最適合你品牌長期累積的題目。",
  },
  {
    topic: "增員不是招募，是選人",
    score: 87,
    grade: "A",
    personality: "今天我沒有追熱門，而是選擇品牌長期價值。",
  },
];

const BRIEF = [
  {
    label: "Decision",
    status: "03:00",
    desc: "Phoenix 從 4 個候選題目中，選出今天唯一推薦主題。",
  },
  {
    label: "Carousel",
    status: "8 ready",
    desc: "輪播草稿、Caption 與發布檢查已完成。",
  },
  {
    label: "Timing",
    status: "20:00",
    desc: "今天適合在晚間發布，延續退休系列的品牌記憶。",
  },
];

const WHY_TODAY =
  "退休話題正在升溫，但還沒有過度擁擠。你的品牌最近七天沒有延續這條線，今天適合接上。";

const READINESS = [
  "Decision approved by Phoenix",
  "Carousel draft ready",
  "Caption ready",
  "Brand DNA matched",
];

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({
  score,
  grade,
  visible,
}: {
  score: number;
  grade: string;
  visible: boolean;
}) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = visible ? circ * (1 - score / 100) : circ;

  return (
    <div className={visible ? "score-glow" : ""} style={{ position: "relative", width: 70, height: 70, flexShrink: 0 }}>
      <svg width="70" height="70" viewBox="0 0 70 70" style={{ position: "absolute", inset: 0 }} aria-hidden>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FB923C" />
          </linearGradient>
        </defs>
        <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
        <circle
          cx="35" cy="35" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="1.5"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 35 35)"
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1) 0.2s" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "#FAFAF9" }}>
          {score}
        </span>
        <span style={{ fontSize: 9, fontWeight: 600, color: "#F97316", letterSpacing: "0.02em", opacity: visible ? 1 : 0, transition: "opacity 0.4s ease 0.6s" }}>
          {grade}
        </span>
      </div>
    </div>
  );
}

// ─── Check icon ───────────────────────────────────────────────────────────────

function Check() {
  return (
    <div style={{
      width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
      background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.14)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="6" height="6" viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="rgba(74,222,128,0.8)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
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
        style={{ background: "radial-gradient(ellipse 65% 40% at 50% -8%, rgba(249,115,22,0.07) 0%, transparent 100%)" }}
      />

      {/* Nav */}
      <PhoenixHeader
        right={
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 26, height: 26, background: "rgba(249,115,22,0.1)", color: "#F97316", fontSize: 11, fontWeight: 600 }}
          >
            佑
          </div>
        }
      />

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center px-6" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="w-full" style={{ maxWidth: 400 }}>

          {/* ── Hero ── */}
          {ready && (
            <div className="animate-fade-up" style={{ marginBottom: 12 }}>
              <h1 style={{ color: "#FAFAF9", fontSize: 28, fontWeight: 580, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 3 }}>
                Good morning, <span style={{ fontWeight: 700 }}>小佑.</span>
              </h1>
              <p style={{ color: "#8C8784", fontSize: 13, lineHeight: 1.45, letterSpacing: "-0.01em", marginBottom: 2 }}>
                Phoenix 已於 03:00 完成今日作戰簡報。
              </p>
              <p style={{ color: "#6B6865", fontSize: 12, lineHeight: 1.45, letterSpacing: "-0.01em" }}>
                今天不用想要發什麼。Phoenix 已經替你完成決策、輪播草稿與發布準備。
              </p>
            </div>
          )}

          {/* ── Decision block ── */}
          {ready && (
            <div className="animate-fade-up delay-200 relative">

              {/* Analyzing overlay */}
              {analyzing && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3" style={{ pointerEvents: "none" }}>
                  <div className="flex gap-[5px]">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="inline-block rounded-full"
                        style={{ width: 4, height: 4, background: "#F97316", animation: `blink 1.3s ease-in-out ${i * 0.22}s infinite` }}
                      />
                    ))}
                  </div>
                  <span style={{ color: "#52504E", fontSize: 11, letterSpacing: "0.05em" }}>Phoenix is thinking</span>
                </div>
              )}

              <div style={{ opacity: analyzing ? 0.05 : 1, transition: "opacity 0.45s ease" }}>

                {/* Section separator */}
                <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  <span style={{ color: "#52504E", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    Today&apos;s Decision
                  </span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                </div>

                {/* Topic */}
                <h2 style={{ color: "#FAFAF9", fontSize: 25, fontWeight: 680, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 5 }}>
                  {decision.topic}
                </h2>

                {/* Confidence one-liner */}
                <p style={{ color: "#F97316", fontSize: 12, fontStyle: "italic", opacity: 0.75, letterSpacing: "-0.01em", marginBottom: 8 }}>
                  今天這篇，我很有信心。
                </p>

                {/* Score row */}
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <div>
                    <p style={{ color: "#6B6865", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                      Brand Decision Confidence
                    </p>
                    <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.4, maxWidth: 195 }}>
                      Phoenix 對今天這篇的信心指數。
                    </p>
                  </div>
                  <ScoreRing score={decision.score} grade={decision.grade} visible={scoreVisible} />
                </div>

                {/* ── Today's Operating Brief — 3 cards ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 10 }}>
                  {BRIEF.map((item) => (
                    <div
                      key={item.label}
                      style={{
                        padding: "9px 10px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: "#F97316", fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.7 }}>
                          {item.label}
                        </span>
                        <span style={{ color: "#52504E", fontSize: 9 }}>
                          {item.status}
                        </span>
                      </div>
                      <p style={{ color: "#6B6865", fontSize: 10, lineHeight: 1.5, letterSpacing: "-0.005em" }}>
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>

                {/* ── Why today? ── */}
                <div style={{ marginBottom: 10 }}>
                  <p style={{ color: "#3E3B37", fontSize: 8, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                    Why today?
                  </p>
                  <p style={{ color: "#8C8784", fontSize: 12, lineHeight: 1.5, letterSpacing: "-0.01em", marginBottom: 5 }}>
                    {WHY_TODAY}
                  </p>
                  <button
                    onClick={() => router.push("/decision")}
                    style={{ background: "none", border: "none", padding: 0, color: "#52504E", fontSize: 11, letterSpacing: "-0.005em", cursor: "pointer" }}
                  >
                    View full decision →
                  </button>
                </div>

                {/* ── Ready to publish ── */}
                <div style={{ marginBottom: 10 }}>
                  <p style={{ color: "#3E3B37", fontSize: 8, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                    Ready to publish
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 4 }}>
                    {READINESS.map((item, i) => (
                      <div
                        key={item}
                        className="animate-fade-up"
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          animationDelay: `${300 + i * 80}ms`,
                        }}
                      >
                        <Check />
                        <span style={{ color: "#6B6865", fontSize: 11, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Main actions ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    onClick={() => router.push("/carousel")}
                    style={{ width: "100%", height: 50, borderRadius: 14, background: "#FAFAF9", color: "#0C0A08", fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", border: "none" }}
                  >
                    View Today&apos;s Carousel
                  </button>
                  <button
                    onClick={() => router.push("/decision")}
                    style={{ width: "100%", height: 46, borderRadius: 12, background: "rgba(255,255,255,0.04)", color: "#FAFAF9", fontSize: 13, fontWeight: 500, letterSpacing: "-0.01em", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    View Decision
                  </button>
                  <button
                    onClick={() => router.push("/publish")}
                    style={{ width: "100%", height: 46, borderRadius: 12, background: "rgba(249,115,22,0.06)", color: "#FB923C", fontSize: 13, fontWeight: 500, letterSpacing: "-0.01em", border: "1px solid rgba(249,115,22,0.12)" }}
                  >
                    Publish
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ── Below fold ── */}

          {ready && (
            <p
              className="animate-fade-up delay-400"
              style={{ color: "#F97316", fontSize: 12, opacity: 0.4, fontStyle: "italic", letterSpacing: "-0.005em", marginTop: 18, whiteSpace: "pre-line" }}
            >
              — {decision.personality}
            </p>
          )}

          {ready && (
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "20px 0" }} />
          )}

          {ready && (
            <button
              onClick={handleReanalyze}
              disabled={analyzing}
              style={{ width: "100%", height: 36, borderRadius: 10, background: "transparent", color: "#3E3B37", fontSize: 12, fontWeight: 400, border: "none", opacity: analyzing ? 0.3 : 1, transition: "opacity 0.2s" }}
            >
              Re-analyze
            </button>
          )}

          {ready && (
            <p
              className="animate-fade-up delay-500"
              style={{ color: "#252220", fontSize: 11, textAlign: "center", marginTop: 14 }}
            >
              Analyzes daily at 03:00 · Updates every morning
            </p>
          )}

        </div>
      </main>
    </div>
  );
}
