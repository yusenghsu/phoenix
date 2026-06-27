"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhoenixHeader } from "@/components/PhoenixHeader";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Decision = "Published" | "Rejected" | "Scheduled";

interface DecisionRecord {
  date: string;
  isToday?: boolean;
  topic: string;
  decision: Decision;
  score: number;
  result: string;
  learned: string;
  tags: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const SUMMARY = [
  {
    title: "Best Signal",
    value: "Share",
    desc: "過去 7 天，分享意願比觀看數更能代表內容價值。",
  },
  {
    title: "Strongest Topic",
    value: "退休",
    desc: "退休主題目前最符合小佑的品牌記憶。",
  },
  {
    title: "Phoenix Learned",
    value: "3 rules",
    desc: "Phoenix 已更新三個決策規則。",
  },
];

const RECORDS: DecisionRecord[] = [
  {
    date: "Today · 03:00",
    isToday: true,
    topic: "退休不是 65 歲開始",
    decision: "Published",
    score: 92,
    result: "Scheduled · Today 20:00",
    learned:
      "退休主題可以延續，但要避免變成商品介紹。觀點必須先於工具。",
    tags: ["Retirement", "Brand Fit", "High Share"],
  },
  {
    date: "Yesterday",
    topic: "做保險會沒朋友嗎？",
    decision: "Published",
    score: 88,
    result: "Share potential high",
    learned: "直接打痛點的題目更容易被轉傳給同業或新人。",
    tags: ["Recruiting", "Pain Point", "Share"],
  },
  {
    date: "2 days ago",
    topic: "AI 會淘汰保險業務嗎？",
    decision: "Rejected",
    score: 61,
    result: "Not published",
    learned:
      "AI 題目有流量，但如果沒有跟小佑的保險品牌觀點結合，容易變成跟風。",
    tags: ["AI", "Rejected", "Trend Risk"],
  },
  {
    date: "3 days ago",
    topic: "努力沒有結果怎麼辦？",
    decision: "Rejected",
    score: 54,
    result: "Not published",
    learned:
      "情緒型題目容易變成雞湯，除非能給出明確方法，否則不推薦。",
    tags: ["Avoid", "No Chicken Soup"],
  },
  {
    date: "4 days ago",
    topic: "新人做保險最怕什麼？",
    decision: "Published",
    score: 86,
    result: "High save potential",
    learned: "新人痛點適合小佑，但內容必須有解法，不能只是共鳴。",
    tags: ["Recruiting", "Save", "Pain Point"],
  },
  {
    date: "5 days ago",
    topic: "為什麼你一直不敢開始規劃？",
    decision: "Published",
    score: 84,
    result: "Brand memory improved",
    learned: "「人生選擇」比「商品功能」更符合小佑長期品牌。",
    tags: ["Brand", "Life Choice", "Insurance"],
  },
  {
    date: "6 days ago",
    topic: "快速成交的三個技巧",
    decision: "Rejected",
    score: 49,
    result: "Not published",
    learned:
      "太短期的成交技巧會削弱品牌深度，Phoenix 應避免把小佑推向銷售型內容。",
    tags: ["Rejected", "Short-term", "Low Brand Fit"],
  },
];

const LEARNINGS = [
  "小佑的內容更適合「人生選擇」切入，而不是商品功能切入。",
  "分享價值比觀看數更重要。",
  "Phoenix 應避免短期流量題與空泛雞湯。",
];

// ─── Decision badge ────────────────────────────────────────────────────────────

function DecisionBadge({ status }: { status: Decision }) {
  const styles: { [k in Decision]: { bg: string; border: string; color: string } } = {
    Published: {
      bg: "rgba(34,197,94,0.06)",
      border: "rgba(34,197,94,0.13)",
      color: "#4ade80",
    },
    Scheduled: {
      bg: "rgba(249,115,22,0.07)",
      border: "rgba(249,115,22,0.15)",
      color: "#FB923C",
    },
    Rejected: {
      bg: "rgba(255,255,255,0.03)",
      border: "rgba(255,255,255,0.07)",
      color: "#52504E",
    },
  };
  const s = styles[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 20,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.01em",
        flexShrink: 0,
      }}
    >
      {status}
    </span>
  );
}

// ─── Score pill ────────────────────────────────────────────────────────────────

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 80 ? "#F97316" : score >= 60 ? "#8C8784" : "#52504E";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        color,
        fontSize: 11,
        fontWeight: 650,
        letterSpacing: "0.01em",
        flexShrink: 0,
      }}
    >
      {score}
    </span>
  );
}

// ─── Timeline card ─────────────────────────────────────────────────────────────

function TimelineCard({ record, index }: { record: DecisionRecord; index: number }) {
  const isRejected = record.decision === "Rejected";

  return (
    <div
      className={`animate-fade-up`}
      style={{
        animationDelay: `${150 + index * 60}ms`,
        opacity: 0,
        borderRadius: 16,
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${isRejected ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.07)"}`,
        overflow: "hidden",
      }}
    >
      {/* Card top */}
      <div style={{ padding: "18px 20px 16px" }}>
        {/* Date + badges row */}
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 12 }}
        >
          <div className="flex items-center gap-1.5">
            {record.isToday && (
              <div
                className="dot-orange-pulse"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#F97316",
                  flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                color: record.isToday ? "#A09D9A" : "#52504E",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.02em",
              }}
            >
              {record.date}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ScorePill score={record.score} />
            <DecisionBadge status={record.decision} />
          </div>
        </div>

        {/* Topic */}
        <p
          style={{
            color: isRejected ? "#6B6865" : "#FAFAF9",
            fontSize: 17,
            fontWeight: isRejected ? 450 : 580,
            letterSpacing: "-0.02em",
            lineHeight: 1.35,
            marginBottom: 10,
          }}
        >
          {record.topic}
        </p>

        {/* Result */}
        <p style={{ color: "#52504E", fontSize: 12, lineHeight: 1.5 }}>
          {record.result}
        </p>
      </div>

      {/* Learned section */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "14px 20px 16px",
          background: "rgba(255,255,255,0.01)",
        }}
      >
        <p
          style={{
            color: "#F97316",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            opacity: 0.6,
            marginBottom: 7,
          }}
        >
          Phoenix learned
        </p>
        <p
          style={{
            color: "#8C8784",
            fontSize: 13,
            lineHeight: 1.7,
            letterSpacing: "-0.005em",
            fontStyle: "italic",
            marginBottom: 14,
          }}
        >
          {record.learned}
        </p>

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {record.tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: "inline-flex",
                padding: "3px 9px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#3E3B37",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.02em",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ background: "#0C0A08" }}
    >
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
      <PhoenixHeader
        right={
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8,
              padding: "3px 10px",
              color: "#52504E",
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            7 decisions logged
          </div>
        }
      />

      {/* ── Main ── */}
      <main
        className="relative z-10 flex flex-col items-center px-6"
        style={{ paddingTop: 52, paddingBottom: 80 }}
      >
        <div className="w-full" style={{ maxWidth: 520 }}>

          {/* Page header */}
          {ready && (
            <div className="animate-fade-up" style={{ marginBottom: 36 }}>
              <h1
                style={{
                  color: "#FAFAF9",
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.1,
                  marginBottom: 10,
                }}
              >
                Decision History
              </h1>
              <p style={{ color: "#6B6865", fontSize: 14, lineHeight: 1.65, letterSpacing: "-0.01em" }}>
                Phoenix 過去的內容決策、結果與學習紀錄。
              </p>
            </div>
          )}

          {/* Summary cards */}
          {ready && (
            <div
              className="animate-fade-up delay-100"
              style={{ display: "flex", gap: 10, marginBottom: 44 }}
            >
              {SUMMARY.map((s) => (
                <div
                  key={s.title}
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
                      marginBottom: 7,
                    }}
                  >
                    {s.title}
                  </p>
                  <p
                    style={{
                      color: "#FAFAF9",
                      fontSize: 18,
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                      marginBottom: 8,
                    }}
                  >
                    {s.value}
                  </p>
                  <p style={{ color: "#6B6865", fontSize: 11, lineHeight: 1.55 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Section label */}
          {ready && (
            <p
              className="animate-fade-up delay-100"
              style={{
                color: "#3E3B37",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Timeline
            </p>
          )}

          {/* Timeline */}
          {ready && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {RECORDS.map((record, i) => (
                <TimelineCard key={record.topic} record={record} index={i} />
              ))}
            </div>
          )}

          {/* What Phoenix is learning */}
          {ready && (
            <div
              className="animate-fade-up delay-500"
              style={{ marginTop: 52 }}
            >
              <div
                style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 44 }}
              />

              <p
                style={{
                  color: "#52504E",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 20,
                }}
              >
                What Phoenix is learning
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {LEARNINGS.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 16,
                      paddingTop: 16,
                      paddingBottom: 16,
                      borderBottom:
                        i < LEARNINGS.length - 1
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
                        minWidth: 20,
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
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom actions */}
          {ready && (
            <div
              className="animate-fade-up delay-600"
              style={{ marginTop: 52, display: "flex", flexDirection: "column", gap: 10 }}
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
                onClick={() => router.push("/settings")}
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
                Creator DNA
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
