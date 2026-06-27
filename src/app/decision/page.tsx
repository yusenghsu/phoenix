"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Data ─────────────────────────────────────────────────────────────────────

const DATA = {
  topic: "退休不是65歲開始",
  confidence: 92,
  grade: "A+",

  whyToday: [
    "昨天開始，退休相關的討論明顯升溫。",
    "你的品牌已經九天沒有談過退休了。",
    "今天發布，能強化你在這個議題上的定位。",
    "我建議今天就發。",
  ],

  rejected: [
    {
      topic: "AI 會取代保險業務嗎？",
      category: "AI",
      reason:
        "這個主題雖然有流量，但與你的品牌定位不符。你的受眾更需要的是信任感，而不是焦慮感。",
    },
    {
      topic: "品牌故事：我為什麼選擇這個行業",
      category: "Brand",
      reason:
        "這是一篇值得發布的內容，但上週你剛發過個人故事系列。太接近容易讓受眾感到重複。建議兩週後再發。",
    },
    {
      topic: "定期定額 vs 一次投入",
      category: "Investment",
      reason:
        "投資話題本週競爭激烈，多個帳號同時在討論相似主題。在這個時間點發，你的聲音會被稀釋。",
    },
  ],

  expected: {
    share: { value: "高", detail: "預估分享率高於你過去 30 天平均的 2.4 倍" },
    save: { value: "極高", detail: "退休類內容的收藏率是你帳號平均的 3.1 倍" },
    reach: { value: "1,200–2,800", detail: "根據你近期的平均觸及與本週趨勢估算" },
  },

  risk:
    "如果今天不發布，這個話題的熱度在未來 48–72 小時內會逐漸下降。等到下週再發，這篇的觸及可能減少 30–40%。此外，你的品牌在退休議題上的空白期越長，受眾會越難把你與這個領域連結在一起。今天是一個相對理想的時間點。",
};

// ─── Small components ─────────────────────────────────────────────────────────

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
    <div
      style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "36px 0" }}
    />
  );
}

function RejectedCard({
  item,
}: {
  item: (typeof DATA.rejected)[0];
}) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        marginBottom: 10,
      }}
    >
      <div
        className="flex items-start justify-between gap-3"
        style={{ marginBottom: 10 }}
      >
        <p
          style={{
            color: "#FAFAF9",
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            lineHeight: 1.35,
            flex: 1,
          }}
        >
          {item.topic}
        </p>
        <span
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 6,
            padding: "3px 8px",
            fontSize: 10,
            color: "#52504E",
            fontWeight: 500,
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          {item.category}
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
  );
}

function ExpectedCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "18px 16px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <p style={{ color: "#3E3B37", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </p>
      <p
        style={{
          color: "#FAFAF9",
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          marginBottom: 6,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.5 }}>{detail}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DecisionPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [approved, setApproved] = useState<"approve" | "reject" | "force" | null>(null);

  useEffect(() => {
    setReady(true);
  }, []);

  function handleAction(action: "approve" | "reject" | "force") {
    setApproved(action);
    if (action === "approve") {
      setTimeout(() => router.push("/carousel"), 900);
    } else if (action === "force") {
      setTimeout(() => router.push("/publish"), 900);
    }
  }

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ background: "#0C0A08" }}
    >
      {/* Ambient */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 35% at 50% -8%, rgba(249,115,22,0.05) 0%, transparent 100%)",
        }}
      />

      {/* ── Nav ── */}
      <nav
        className="relative z-10 flex items-center justify-between px-6"
        style={{ height: 52, borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      >
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2"
          style={{
            color: "#52504E",
            fontSize: 13,
            background: "none",
            border: "none",
            padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 2.5L4.5 7L9 11.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-[7px]"
            style={{
              width: 22,
              height: 22,
              background: "linear-gradient(145deg, #F97316, #FB923C)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path
                d="M5 0.5L6.2 3.6H9.5L6.9 5.5L7.9 8.6L5 6.7L2.1 8.6L3.1 5.5L0.5 3.6H3.8L5 0.5Z"
                fill="white"
              />
            </svg>
          </div>
          <span style={{ color: "#FAFAF9", fontSize: 13, fontWeight: 600, letterSpacing: "-0.015em" }}>
            Phoenix
          </span>
        </div>

        <div style={{ width: 60 }} />
      </nav>

      {/* ── Main ── */}
      <main
        className="relative z-10 flex flex-1 flex-col items-center px-6"
        style={{ paddingTop: 48, paddingBottom: 64 }}
      >
        <div className="w-full" style={{ maxWidth: 480 }}>

          {/* ── Page title ── */}
          {ready && (
            <div className="animate-fade-up" style={{ marginBottom: 48 }}>
              <p style={{ color: "#3E3B37", fontSize: 11, marginBottom: 8 }}>
                Phoenix 的推薦理由
              </p>
              <h1
                style={{
                  color: "#FAFAF9",
                  fontSize: 30,
                  fontWeight: 680,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.2,
                }}
              >
                Why I chose this.
              </h1>
            </div>
          )}

          {/* ── Section 1: Topic + Confidence ── */}
          {ready && (
            <div className="animate-fade-up delay-100" style={{ marginBottom: 0 }}>
              <SectionLabel>Today&apos;s Recommendation</SectionLabel>

              <h2
                style={{
                  color: "#FAFAF9",
                  fontSize: 24,
                  fontWeight: 650,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.25,
                  marginBottom: 20,
                }}
              >
                {DATA.topic}
              </h2>

              {/* Confidence */}
              <div
                className="flex items-center justify-between"
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  background: "rgba(249,115,22,0.05)",
                  border: "1px solid rgba(249,115,22,0.1)",
                }}
              >
                <div>
                  <p style={{ color: "#52504E", fontSize: 11, marginBottom: 4, letterSpacing: "0.04em" }}>
                    Confidence
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span
                      style={{
                        fontSize: 32,
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
                      {DATA.confidence}%
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#F97316",
                        opacity: 0.7,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {DATA.grade}
                    </span>
                  </div>
                </div>
                <p
                  style={{
                    color: "#52504E",
                    fontSize: 12,
                    lineHeight: 1.5,
                    maxWidth: 180,
                    textAlign: "right",
                  }}
                >
                  Phoenix 對今天這個決定
                  <br />
                  非常有把握。
                </p>
              </div>
            </div>
          )}

          {ready && <Divider />}

          {/* ── Section 2: Why Today ── */}
          {ready && (
            <div className="animate-fade-up delay-200">
              <SectionLabel>Why today?</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {DATA.whyToday.map((line, i) => {
                  const isLast = i === DATA.whyToday.length - 1;
                  return (
                    <p
                      key={i}
                      style={{
                        color: isLast ? "#FAFAF9" : "#8C8784",
                        fontSize: isLast ? 15 : 15,
                        fontWeight: isLast ? 500 : 400,
                        lineHeight: 1.6,
                        letterSpacing: "-0.01em",
                        fontStyle: isLast ? "normal" : "normal",
                      }}
                    >
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {ready && <Divider />}

          {/* ── Section 3: Why not others ── */}
          {ready && (
            <div className="animate-fade-up delay-200">
              <SectionLabel>Why not the others?</SectionLabel>
              <p
                style={{
                  color: "#52504E",
                  fontSize: 13,
                  lineHeight: 1.55,
                  marginBottom: 20,
                }}
              >
                Phoenix 今天分析了三個其他選項，最終選擇放棄它們。
              </p>
              {DATA.rejected.map((item) => (
                <RejectedCard key={item.category} item={item} />
              ))}
            </div>
          )}

          {ready && <Divider />}

          {/* ── Section 4: Expected Result ── */}
          {ready && (
            <div className="animate-fade-up delay-300">
              <SectionLabel>Expected Result</SectionLabel>
              <p
                style={{
                  color: "#52504E",
                  fontSize: 13,
                  lineHeight: 1.55,
                  marginBottom: 20,
                }}
              >
                根據你的歷史數據與當前趨勢，Phoenix 預估這篇的表現。
              </p>

              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <ExpectedCard
                  label="Share"
                  value={DATA.expected.share.value}
                  detail={DATA.expected.share.detail}
                />
                <ExpectedCard
                  label="Save"
                  value={DATA.expected.save.value}
                  detail={DATA.expected.save.detail}
                />
              </div>
              <div
                style={{
                  padding: "18px 16px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <p style={{ color: "#3E3B37", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  Reach
                </p>
                <p style={{ color: "#FAFAF9", fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6, lineHeight: 1 }}>
                  {DATA.expected.reach.value}
                </p>
                <p style={{ color: "#52504E", fontSize: 11, lineHeight: 1.5 }}>
                  {DATA.expected.reach.detail}
                </p>
              </div>
            </div>
          )}

          {ready && <Divider />}

          {/* ── Section 5: Risk ── */}
          {ready && (
            <div className="animate-fade-up delay-300">
              <SectionLabel>If we don&apos;t publish today</SectionLabel>
              <p
                style={{
                  color: "#8C8784",
                  fontSize: 15,
                  lineHeight: 1.7,
                  letterSpacing: "-0.01em",
                }}
              >
                {DATA.risk}
              </p>
            </div>
          )}

          {ready && <Divider />}

          {/* ── Bottom Actions ── */}
          {ready && (
            <div className="animate-fade-up delay-400">
              {approved ? (
                <div
                  className="flex items-center justify-center gap-2"
                  style={{ height: 80 }}
                >
                  {approved === "reject" ? (
                    <p style={{ color: "#52504E", fontSize: 14 }}>已記錄。Phoenix 會繼續分析。</p>
                  ) : (
                    <>
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ background: "#22c55e", boxShadow: "0 0 4px #22c55e" }}
                      />
                      <p style={{ color: "#4ade80", fontSize: 14 }}>
                        {approved === "force" ? "強制發布中..." : "已核准，跳轉到輪播..."}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p
                    style={{
                      color: "#3E3B37",
                      fontSize: 11,
                      textAlign: "center",
                      marginBottom: 4,
                    }}
                  >
                    你的決定
                  </p>

                  {/* Approve */}
                  <button
                    onClick={() => handleAction("approve")}
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
                    Approve — View Carousel
                  </button>

                  {/* Reject + Force row */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleAction("reject")}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 12,
                        background: "transparent",
                        color: "#52504E",
                        fontSize: 13,
                        fontWeight: 400,
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction("force")}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 12,
                        background: "rgba(74,222,128,0.05)",
                        color: "#4ade80",
                        fontSize: 13,
                        fontWeight: 500,
                        border: "1px solid rgba(74,222,128,0.1)",
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
