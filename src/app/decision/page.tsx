"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhoenixHeader } from "@/components/PhoenixHeader";

// ─── Data ─────────────────────────────────────────────────────────────────────

const TOPIC = "退休不是 65 歲開始";
const CONFIDENCE = 92;

const FACTORS = [
  {
    label: "Market Signal",
    score: 84,
    text: "退休相關討論正在升溫，但尚未過度擁擠。",
  },
  {
    label: "Creator DNA Fit",
    score: 96,
    text: "符合小佑「一針見血、解開疑問」的內容風格。",
  },
  {
    label: "Brand Memory",
    score: 91,
    text: "強化小佑在「人生選擇」與「提前規劃」的品牌記憶。",
  },
  {
    label: "Share Worthiness",
    score: 89,
    text: "容易被分享給正在思考未來、財務與人生選擇的人。",
  },
];

const WHY_TODAY_BODY = `退休不是一個突然爆紅的題目。\n\n它正在慢慢升溫，而且你的品牌最近七天沒有延續這條線。\n\n如果今天接上，Phoenix 判斷這篇不只是單篇內容，而是可以重新啟動一個系列。`;
const WHY_TODAY_HIGHLIGHT = "今天不是追流量，而是延續品牌記憶。";

const REJECTED = [
  {
    topic: "AI 會淘汰保險業務嗎？",
    signal: "Market Signal: High",
    reason:
      "流量可能高，但今天容易變成跟風。除非能接回小佑的保險觀點，否則不推薦。",
  },
  {
    topic: "努力沒有結果怎麼辦？",
    signal: "Emotional Signal: Medium",
    reason: "情緒共鳴夠，但容易落入雞湯。Phoenix 不建議今天做。",
  },
  {
    topic: "快速成交的三個技巧",
    signal: "Conversion Signal: Medium",
    reason: "短期有用，但會削弱小佑的長期品牌深度。",
  },
];

type RiskLevel = "Low" | "Medium" | "High";

const MATRIX: {
  topic: string;
  market: number;
  brand: number;
  share: number;
  risk: RiskLevel;
  selected: boolean;
}[] = [
  { topic: "退休不是 65 歲開始", market: 84, brand: 96, share: 89, risk: "Low", selected: true },
  { topic: "AI 會淘汰保險業務嗎？", market: 93, brand: 64, share: 76, risk: "High", selected: false },
  { topic: "努力沒有結果怎麼辦？", market: 68, brand: 58, share: 61, risk: "Medium", selected: false },
  { topic: "快速成交的三個技巧", market: 59, brand: 42, share: 49, risk: "High", selected: false },
];

const RECOMMENDATION_REASONS = [
  "延續小佑的品牌記憶",
  "打中讀者正在思考的痛點",
  "讓內容有被收藏與分享的理由",
];

const RISK_TEXT = `如果今天不發，退休系列的品牌記憶會中斷。\n\n這個題目不是短期爆點，而是長期信任累積的入口。\n\nPhoenix 判斷今天是適合接上的時間點。`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: "#3E3B37",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: 16,
      }}
    >
      {children}
    </p>
  );
}

function Divider() {
  return (
    <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "36px 0" }} />
  );
}

function ScoreBar({ value, active }: { value: number; active: boolean }) {
  return (
    <div
      style={{
        height: 2,
        background: "rgba(255,255,255,0.06)",
        borderRadius: 1,
        overflow: "hidden",
        marginTop: 5,
      }}
    >
      <div
        className="bar-fill"
        style={{
          height: "100%",
          width: `${value}%`,
          background: active ? "#F97316" : "rgba(255,255,255,0.15)",
          borderRadius: 1,
        }}
      />
    </div>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const map = {
    Low: { color: "rgba(74,222,128,0.8)", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.13)" },
    Medium: { color: "#FB923C", bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.14)" },
    High: { color: "#6B6865", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.07)" },
  };
  const s = map[risk];
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "2px 8px",
        borderRadius: 20,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.01em",
      }}
    >
      {risk}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DecisionPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(false);
  const [actionTaken, setActionTaken] = useState<"carousel" | "publish" | null>(null);
  const [dbDecision, setDbDecision] = useState<{
    topic: string;
    confidence: number;
    factors: typeof FACTORS;
    rejected: typeof REJECTED;
    matrix: typeof MATRIX;
    risk: string;
  } | null>(null);

  useEffect(() => {
    setReady(true);
    fetch("/api/data?type=decision")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setDbDecision(d); })
      .catch(() => {});
  }, []);

  async function handleReject() {
    await fetch("/api/actions/reject", { method: "POST" }).catch(() => {});
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  function handleViewCarousel() {
    setActionTaken("carousel");
    setTimeout(() => router.push("/carousel"), 800);
  }

  async function handleForcePublish() {
    setActionTaken("publish");
    await Promise.all([
      fetch("/api/actions/force-publish", { method: "POST" }).catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]);
    router.push("/publish");
  }

  const displayTopic = dbDecision?.topic ?? TOPIC;
  const displayConfidence = dbDecision?.confidence ?? CONFIDENCE;
  const displayFactors = dbDecision?.factors ?? FACTORS;
  const displayRejected = dbDecision?.rejected ?? REJECTED;
  const displayMatrix = (dbDecision?.matrix ?? MATRIX) as typeof MATRIX;
  const displayRisk = dbDecision?.risk ?? RISK_TEXT;

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: "#0C0A08" }}>
      {/* Ambient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 35% at 50% -8%, rgba(249,115,22,0.05) 0%, transparent 100%)",
        }}
      />

      {/* Toast */}
      <div
        className="pointer-events-none fixed z-50"
        style={{
          top: 20,
          left: "50%",
          transform: `translateX(-50%) translateY(${toast ? 0 : -8}px)`,
          opacity: toast ? 1 : 0,
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
      >
        <div
          style={{
            background: "rgba(14,10,6,0.97)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: "8px 16px",
            backdropFilter: "blur(20px)",
          }}
        >
          <span style={{ color: "#8C8784", fontSize: 13 }}>
            Phoenix will re-analyze tonight.
          </span>
        </div>
      </div>

      {/* ── Nav ── */}
      <PhoenixHeader />

      {/* ── Main ── */}
      <main
        className="relative z-10 flex flex-1 flex-col items-center px-6"
        style={{ paddingTop: 40, paddingBottom: 64 }}
      >
        <div className="w-full" style={{ maxWidth: 480 }}>

          {/* ── Hero ── */}
          {ready && (
            <div className="animate-fade-up" style={{ marginBottom: 32 }}>
              <h1
                style={{
                  color: "#FAFAF9",
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.15,
                  marginBottom: 10,
                }}
              >
                Why I chose this.
              </h1>
              <p
                style={{
                  color: "#6B6865",
                  fontSize: 13,
                  lineHeight: 1.6,
                  letterSpacing: "-0.01em",
                }}
              >
                Phoenix 今天在 03:00 分析了市場、品牌與小佑的 Creator DNA，最後只留下這一個主題。
              </p>
            </div>
          )}

          {/* ── Today's Recommendation ── */}
          {ready && (
            <div className="animate-fade-up delay-100" style={{ marginBottom: 32 }}>
              <SectionLabel>Today&apos;s Recommendation</SectionLabel>

              <h2
                style={{
                  color: "#FAFAF9",
                  fontSize: 22,
                  fontWeight: 650,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.25,
                  marginBottom: 16,
                }}
              >
                {displayTopic}
              </h2>

              {/* Confidence + main judgment */}
              <div
                className="card-hover"
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  background: "rgba(249,115,22,0.04)",
                  border: "1px solid rgba(249,115,22,0.09)",
                }}
              >
                <div className="flex items-end justify-between" style={{ marginBottom: 14 }}>
                  <div>
                    <p
                      style={{
                        color: "#52504E",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Confidence
                    </p>
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 700,
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                        background: "linear-gradient(125deg, #F97316, #FB923C)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        display: "inline-block",
                      }}
                    >
                      {displayConfidence}%
                    </span>
                  </div>
                  <p
                    style={{
                      color: "#3E3B37",
                      fontSize: 11,
                      lineHeight: 1.5,
                      textAlign: "right",
                      paddingBottom: 2,
                    }}
                  >
                    A+ · Phoenix 非常有把握
                  </p>
                </div>
                <div
                  style={{
                    height: 1,
                    background: "rgba(249,115,22,0.1)",
                    marginBottom: 14,
                  }}
                />
                <p
                  style={{
                    color: "#8C8784",
                    fontSize: 13,
                    lineHeight: 1.65,
                    letterSpacing: "-0.01em",
                    fontStyle: "italic",
                  }}
                >
                  我今天沒有選最熱的題目。
                  <br />
                  我選的是最適合你品牌長期累積的題目。
                </p>
              </div>
            </div>
          )}

          {/* ── Section 1: Decision Factors ── */}
          {ready && (
            <div className="animate-fade-up delay-200">
              <SectionLabel>Decision Factors</SectionLabel>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                {displayFactors.map((f) => (
                  <div
                    key={f.label}
                    className="card-hover"
                    style={{
                      padding: "14px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p
                      style={{
                        color: "#52504E",
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      {f.label}
                    </p>
                    <p
                      style={{
                        color: "#F97316",
                        fontSize: 24,
                        fontWeight: 700,
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                        marginBottom: 6,
                      }}
                    >
                      {f.score}
                    </p>
                    <p
                      style={{
                        color: "#6B6865",
                        fontSize: 11,
                        lineHeight: 1.5,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {f.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ready && <Divider />}

          {/* ── Section 2: Why Today ── */}
          {ready && (
            <div className="animate-fade-up delay-200">
              <SectionLabel>Why today?</SectionLabel>
              <p
                style={{
                  color: "#8C8784",
                  fontSize: 15,
                  lineHeight: 1.72,
                  letterSpacing: "-0.01em",
                  marginBottom: 22,
                  whiteSpace: "pre-line",
                }}
              >
                {WHY_TODAY_BODY}
              </p>
              <p
                style={{
                  color: "#F97316",
                  fontSize: 14,
                  fontStyle: "italic",
                  opacity: 0.75,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.55,
                  borderLeft: "2px solid rgba(249,115,22,0.28)",
                  paddingLeft: 14,
                }}
              >
                {WHY_TODAY_HIGHLIGHT}
              </p>
            </div>
          )}

          {ready && <Divider />}

          {/* ── Section 3: Rejected Candidates ── */}
          {ready && (
            <div className="animate-fade-up delay-300">
              <SectionLabel>Rejected candidates</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {displayRejected.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "16px 18px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      className="flex items-start justify-between gap-3"
                      style={{ marginBottom: 8 }}
                    >
                      <p
                        style={{
                          color: "#FAFAF9",
                          fontSize: 14,
                          fontWeight: 500,
                          letterSpacing: "-0.01em",
                          lineHeight: 1.3,
                          flex: 1,
                        }}
                      >
                        {item.topic}
                      </p>
                      <span
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 6,
                          padding: "2px 7px",
                          fontSize: 9,
                          color: "#52504E",
                          fontWeight: 500,
                          letterSpacing: "0.03em",
                          flexShrink: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.signal}
                      </span>
                    </div>
                    <p
                      style={{
                        color: "#6B6865",
                        fontSize: 13,
                        lineHeight: 1.6,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ready && <Divider />}

          {/* ── Section 4: Decision Matrix ── */}
          {ready && (
            <div className="animate-fade-up delay-300">
              <SectionLabel>Decision Matrix</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {displayMatrix.map((row) => (
                  <div
                    key={row.topic}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: row.selected
                        ? "rgba(249,115,22,0.04)"
                        : "rgba(255,255,255,0.02)",
                      border: `1px solid ${
                        row.selected
                          ? "rgba(249,115,22,0.1)"
                          : "rgba(255,255,255,0.05)"
                      }`,
                    }}
                  >
                    <div
                      className="flex items-center justify-between"
                      style={{ marginBottom: 12 }}
                    >
                      <p
                        style={{
                          color: row.selected ? "#FAFAF9" : "#6B6865",
                          fontSize: 13,
                          fontWeight: row.selected ? 500 : 400,
                          letterSpacing: "-0.01em",
                          lineHeight: 1.3,
                          flex: 1,
                          paddingRight: 12,
                        }}
                      >
                        {row.topic}
                      </p>
                      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                        {row.selected && (
                          <span
                            style={{
                              color: "#F97316",
                              fontSize: 8,
                              fontWeight: 700,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                            }}
                          >
                            CHOSEN
                          </span>
                        )}
                        <RiskBadge risk={row.risk} />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 12,
                      }}
                    >
                      {(
                        [
                          { label: "Market", value: row.market },
                          { label: "Brand Fit", value: row.brand },
                          { label: "Share", value: row.share },
                        ] as const
                      ).map(({ label, value }) => (
                        <div key={label}>
                          <div className="flex items-center justify-between">
                            <span
                              style={{
                                color: "#3E3B37",
                                fontSize: 9,
                                fontWeight: 600,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                              }}
                            >
                              {label}
                            </span>
                            <span
                              style={{
                                color: row.selected ? "#F97316" : "#52504E",
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {value}
                            </span>
                          </div>
                          <ScoreBar value={value} active={row.selected} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ready && <Divider />}

          {/* ── Section 5: Phoenix Recommendation ── */}
          {ready && (
            <div className="animate-fade-up delay-400">
              <SectionLabel>Phoenix recommendation</SectionLabel>
              <p
                style={{
                  color: "#FAFAF9",
                  fontSize: 15,
                  fontWeight: 500,
                  lineHeight: 1.6,
                  letterSpacing: "-0.01em",
                  marginBottom: 14,
                }}
              >
                我建議今天發布這篇。
              </p>
              <p
                style={{
                  color: "#8C8784",
                  fontSize: 14,
                  lineHeight: 1.72,
                  letterSpacing: "-0.01em",
                  marginBottom: 14,
                }}
              >
                不是因為它最容易寫。
                <br />
                不是因為它看起來最熱門。
              </p>
              <p
                style={{
                  color: "#8C8784",
                  fontSize: 14,
                  lineHeight: 1.72,
                  letterSpacing: "-0.01em",
                  marginBottom: 18,
                }}
              >
                而是因為它最能同時滿足三件事：
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {RECOMMENDATION_REASONS.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span
                      style={{
                        color: "#F97316",
                        fontSize: 10,
                        fontWeight: 700,
                        opacity: 0.55,
                        letterSpacing: "0.04em",
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p
                      style={{
                        color: "#A09D9A",
                        fontSize: 14,
                        lineHeight: 1.6,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ready && <Divider />}

          {/* ── Section 6: Risk ── */}
          {ready && (
            <div className="animate-fade-up delay-400">
              <SectionLabel>Risk if we skip today</SectionLabel>
              <p
                style={{
                  color: "#8C8784",
                  fontSize: 15,
                  lineHeight: 1.72,
                  letterSpacing: "-0.01em",
                  whiteSpace: "pre-line",
                }}
              >
                {displayRisk}
              </p>
            </div>
          )}

          {ready && <Divider />}

          {/* ── Bottom Actions ── */}
          {ready && (
            <div className="animate-fade-up delay-500">
              {actionTaken ? (
                <div
                  className="flex items-center justify-center gap-2"
                  style={{ height: 80 }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#22c55e",
                      boxShadow: "0 0 4px #22c55e",
                    }}
                  />
                  <p style={{ color: "#4ade80", fontSize: 14 }}>
                    {actionTaken === "carousel" ? "跳轉到輪播..." : "強制發布中..."}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* View Carousel — primary */}
                  <button
                    onClick={handleViewCarousel}
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
                    View Carousel
                  </button>

                  {/* Reject + Force Publish */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleReject}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 12,
                        background: "transparent",
                        color: "#52504E",
                        fontSize: 13,
                        fontWeight: 400,
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleForcePublish}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 12,
                        background: "rgba(249,115,22,0.07)",
                        color: "#FB923C",
                        fontSize: 13,
                        fontWeight: 500,
                        border: "1px solid rgba(249,115,22,0.12)",
                      }}
                    >
                      Force Publish
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
