"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Fake Data ────────────────────────────────────────────────────────────────

type SlideType = "cover" | "content" | "cta";

interface Slide {
  id: number;
  type: SlideType;
  tag?: string;
  title: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  cta?: string;
}

const SLIDES: Slide[] = [
  {
    id: 0,
    type: "cover",
    tag: "Phoenix × 退休規劃",
    title: "退休規劃的\n三個真相",
    subtitle: "90% 的人都不知道的事",
  },
  {
    id: 1,
    type: "content",
    tag: "真相 #1",
    title: "你以為有勞保\n就夠了？",
    body: "繳了幾十年的勞保，退休後卻發現根本不夠用。讓數字說話。",
    bullets: [
      "勞保月領平均僅 17,000 元",
      "扣掉通膨後，實質購買力更低",
      "遠不及一般家庭每月 30,000 支出",
    ],
  },
  {
    id: 2,
    type: "content",
    tag: "真相 #2",
    title: "你需要的退休金\n比你想的多 3 倍",
    body: "大多數人嚴重低估了退休後的總開銷。",
    bullets: [
      "退休後平均生活 20 年以上",
      "醫療費用是最大的不確定風險",
      "實際缺口可能超過 1,000 萬",
    ],
  },
  {
    id: 3,
    type: "content",
    tag: "真相 #3",
    title: "開始的時間\n決定了一切",
    body: "複利是世界第八大奇蹟。越早開始，代價越小。",
    bullets: [
      "25 歲開始：每月只需 5,000",
      "35 歲開始：每月需要 12,000",
      "45 歲開始：每月需要 28,000",
    ],
  },
  {
    id: 4,
    type: "content",
    tag: "你的缺口",
    title: "算出你的\n退休金缺口",
    body: "這不是要嚇你，而是讓你有機會現在開始填補。",
    bullets: [
      "目標月領：30,000 元",
      "勞保 + 勞退：約 22,000 元",
      "每月缺口：8,000 → 20 年共 192 萬",
    ],
  },
  {
    id: 5,
    type: "content",
    tag: "解法",
    title: "三個立刻可以\n採取的行動",
    body: "不需要一次到位，從第一步開始就是最好的選擇。",
    bullets: [
      "盤點現有的保障缺口",
      "計算你的退休目標金額",
      "建立屬於你的儲蓄節奏",
    ],
  },
  {
    id: 6,
    type: "content",
    tag: "常見迷思",
    title: "「等有錢再說」\n是最貴的選擇",
    body: "每拖延一年，需要準備的金額就更多。這不是選擇題，而是時間題。",
    bullets: [
      "時間是你最寶貴的資產",
      "小額開始遠比完美計劃重要",
      "今天的決定決定 20 年後的生活",
    ],
  },
  {
    id: 7,
    type: "content",
    tag: "真實案例",
    title: "40 歲開始，\n他是怎麼做到的",
    body: "一位業務主管，40 歲才認真規劃，5 年後已建立穩健的退休防線。",
    bullets: [
      "從每月存 10,000 開始",
      "搭配適合的保險工具",
      "現在已有清晰的退休藍圖",
    ],
  },
  {
    id: 8,
    type: "cta",
    tag: "開始行動",
    title: "你的退休計劃，\n我幫你算清楚",
    subtitle: "免費 15 分鐘退休規劃諮詢\n找出你的專屬解法，現在就開始。",
    cta: "私訊「退休」立即預約",
  },
];

const CAPTION = `你有想過，退休後每個月需要多少錢嗎？

很多人以為有勞保就夠了。但數字告訴我們：勞保平均月領只有 17,000 元，離舒適的退休生活還差得很遠。

更現實的是，退休後你可能還要活 20 年以上。醫療費、生活費、通膨，每一項都在侵蝕你的退休準備。

但好消息是：現在開始永遠不嫌晚。

一位 40 歲才開始規劃的業務主管，透過正確的工具和節奏，5 年內已經建立了穩健的退休防線。

你的退休計劃，我幫你算清楚。
私訊「退休」，預約免費 15 分鐘諮詢。`;

const HASHTAGS = [
  "#退休規劃", "#財務自由", "#保險規劃", "#勞保年金",
  "#退休準備", "#理財規劃", "#複利效應", "#保險業務",
  "#個人理財", "#退休金", "#財富管理", "#人生規劃",
  "#RetirementPlanning", "#FinancialFreedom", "#Insurance",
  "#PersonalFinance", "#WealthManagement", "#台灣保險",
  "#保險觀念", "#理財知識",
];

// ─── Slide Card ───────────────────────────────────────────────────────────────

function SlideCard({ slide, total }: { slide: Slide; total: number }) {
  const isCover = slide.type === "cover";
  const isCTA = slide.type === "cta";

  const bgStyle: React.CSSProperties = isCover
    ? {
        background:
          "linear-gradient(150deg, #1a1208 0%, #141010 50%, #0c0c0e 100%)",
      }
    : isCTA
    ? {
        background:
          "linear-gradient(150deg, #160f06 0%, #111010 50%, #0c0c0e 100%)",
      }
    : {
        background:
          "linear-gradient(150deg, #0f1018 0%, #0c0c0e 100%)",
      };

  return (
    <div
      className="relative flex w-full flex-col overflow-hidden rounded-3xl"
      style={{ ...bgStyle, aspectRatio: "1 / 1" }}
    >
      {/* Ambient glow */}
      {isCover && (
        <div
          className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)",
          }}
        />
      )}
      {isCTA && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(249,115,22,0.12) 0%, transparent 100%)",
          }}
        />
      )}
      {!isCover && !isCTA && (
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 pt-5"
        style={{ paddingBottom: 0 }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#F97316" }}
          />
          <span
            style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}
          >
            PHOENIX
          </span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>
          {slide.id + 1} / {total}
        </span>
      </div>

      {/* Content */}
      {isCover && (
        <div className="flex flex-1 flex-col justify-center px-6 pb-8">
          {slide.tag && (
            <p
              className="mb-3"
              style={{
                color: "#F97316",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              {slide.tag}
            </p>
          )}
          <h1
            className="mb-4 whitespace-pre-line"
            style={{
              color: "#fafafa",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, lineHeight: 1.5 }}>
              {slide.subtitle}
            </p>
          )}
          {/* Decorative line */}
          <div
            className="mt-8"
            style={{
              height: 2,
              width: 40,
              background: "linear-gradient(90deg, #F97316, transparent)",
              borderRadius: 9999,
            }}
          />
        </div>
      )}

      {slide.type === "content" && (
        <div className="flex flex-1 flex-col justify-center px-6 pb-6">
          {slide.tag && (
            <div
              className="mb-3 inline-flex w-fit rounded-full px-2.5 py-1"
              style={{
                background: "rgba(249,115,22,0.1)",
                color: "#F97316",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              {slide.tag}
            </div>
          )}
          <h2
            className="mb-3 whitespace-pre-line"
            style={{
              color: "#fafafa",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
            }}
          >
            {slide.title}
          </h2>
          {slide.body && (
            <p
              className="mb-4"
              style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.5 }}
            >
              {slide.body}
            </p>
          )}
          {slide.bullets && (
            <ul className="space-y-2">
              {slide.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "#F97316" }}
                  />
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 1.4 }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isCTA && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 text-center">
          {slide.tag && (
            <p
              className="mb-3"
              style={{
                color: "#F97316",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {slide.tag}
            </p>
          )}
          <h2
            className="mb-4 whitespace-pre-line"
            style={{
              color: "#fafafa",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
            }}
          >
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p
              className="mb-6 whitespace-pre-line"
              style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.6 }}
            >
              {slide.subtitle}
            </p>
          )}
          {slide.cta && (
            <div
              className="rounded-xl px-5 py-2.5"
              style={{
                background: "linear-gradient(135deg, #F97316, #FBBF24)",
                color: "#09090B",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {slide.cta}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
      style={{
        background: copied ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.05)",
        color: copied ? "#4ade80" : "#71717a",
        border: `1px solid ${copied ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      {copied ? "✓ 已複製" : "複製"}
    </button>
  );
}

// ─── Preview Page ─────────────────────────────────────────────────────────────

type Tab = "content" | "caption" | "hashtag";

export default function PreviewPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("content");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const slide = SLIDES[current];
  const total = SLIDES.length;

  const prev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);
  const next = useCallback(() => setCurrent((c) => Math.min(c + 1, total - 1)), [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "content", label: "投影片內容" },
    { key: "caption", label: "Caption" },
    { key: "hashtag", label: "Hashtag" },
  ];

  const captionForCopy = CAPTION;
  const hashtagsForCopy = HASHTAGS.join(" ");

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ background: "#09090B" }}
    >
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 30% at 50% 0%, rgba(249,115,22,0.05) 0%, transparent 100%)",
        }}
      />

      {/* Top nav */}
      <nav
        className="relative z-10 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all"
          style={{
            color: "#71717a",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            fontSize: 13,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8.5 2.5L4 7L8.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回
        </button>

        <div className="flex items-center gap-2">
          <div
            className="flex h-5 w-5 items-center justify-center rounded-md"
            style={{ background: "linear-gradient(135deg, #F97316, #FBBF24)" }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L7.5 4.5H11L8.5 6.5L9.5 10L6 7.5L2.5 10L3.5 6.5L1 4.5H4.5L6 1Z" fill="white"/>
            </svg>
          </div>
          <span style={{ color: "#52525b", fontSize: 13, fontWeight: 500 }}>
            退休規劃的三個真相
          </span>
        </div>

        <div
          className="rounded-xl px-3 py-2 text-xs font-medium"
          style={{
            background: "rgba(249,115,22,0.08)",
            color: "#F97316",
            border: "1px solid rgba(249,115,22,0.15)",
          }}
        >
          {total} 頁輪播
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 flex flex-1 flex-col items-center px-4 py-6">
        <div className="w-full max-w-sm">
          {/* Slide viewer */}
          {mounted && (
            <div className="animate-fade-in">
              <SlideCard slide={slide} total={total} />
            </div>
          )}

          {/* Navigation */}
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={prev}
              disabled={current === 0}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-20"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#a1a1aa",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M8.5 2.5L4 7L8.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: i === current ? 16 : 5,
                    height: 5,
                    background:
                      i === current
                        ? "#F97316"
                        : i < current
                        ? "rgba(249,115,22,0.3)"
                        : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>

            <button
              onClick={next}
              disabled={current === total - 1}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-20"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#a1a1aa",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5.5 2.5L10 7L5.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Info panel */}
          {mounted && (
            <div
              className="animate-fade-up delay-200 mt-5 overflow-hidden rounded-2xl"
              style={{
                background: "#111113",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Tabs */}
              <div
                className="flex"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="flex-1 py-3 text-xs font-medium transition-all"
                    style={{
                      color: activeTab === tab.key ? "#fafafa" : "#52525b",
                      borderBottom:
                        activeTab === tab.key
                          ? "1px solid #F97316"
                          : "1px solid transparent",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-5">
                {activeTab === "content" && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {slide.tag && (
                          <span
                            className="mb-2 inline-block rounded-full px-2 py-0.5"
                            style={{
                              background: "rgba(249,115,22,0.1)",
                              color: "#F97316",
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            {slide.tag}
                          </span>
                        )}
                        <p
                          className="whitespace-pre-line font-semibold"
                          style={{ color: "#fafafa", fontSize: 15, letterSpacing: "-0.02em" }}
                        >
                          {slide.title}
                        </p>
                        {slide.subtitle && (
                          <p
                            className="mt-1 whitespace-pre-line"
                            style={{ color: "#71717a", fontSize: 13 }}
                          >
                            {slide.subtitle}
                          </p>
                        )}
                        {slide.body && (
                          <p
                            className="mt-2"
                            style={{ color: "#71717a", fontSize: 13, lineHeight: 1.5 }}
                          >
                            {slide.body}
                          </p>
                        )}
                        {slide.bullets && (
                          <ul className="mt-3 space-y-1.5">
                            {slide.bullets.map((b, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span
                                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                                  style={{ background: "#F97316" }}
                                />
                                <span style={{ color: "#a1a1aa", fontSize: 13 }}>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {slide.cta && (
                          <div
                            className="mt-3 rounded-lg px-3 py-1.5 text-sm font-semibold"
                            style={{
                              background: "linear-gradient(135deg, #F97316, #FBBF24)",
                              color: "#09090B",
                              display: "inline-block",
                            }}
                          >
                            {slide.cta}
                          </div>
                        )}
                      </div>
                      <CopyButton
                        text={[slide.tag, slide.title, slide.body, ...(slide.bullets ?? []), slide.cta]
                          .filter(Boolean)
                          .join("\n")}
                      />
                    </div>
                    <p style={{ color: "#3f3f46", fontSize: 11, textAlign: "center" }}>
                      第 {slide.id + 1} 頁，共 {total} 頁
                    </p>
                  </div>
                )}

                {activeTab === "caption" && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span style={{ color: "#52525b", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}>
                        INSTAGRAM CAPTION
                      </span>
                      <CopyButton text={captionForCopy} />
                    </div>
                    <p
                      className="whitespace-pre-line"
                      style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.7 }}
                    >
                      {CAPTION}
                    </p>
                  </div>
                )}

                {activeTab === "hashtag" && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span style={{ color: "#52525b", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}>
                        {HASHTAGS.length} 個 HASHTAG
                      </span>
                      <CopyButton text={hashtagsForCopy} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {HASHTAGS.map((tag, i) => (
                        <span
                          key={i}
                          className="rounded-full px-2.5 py-1 text-xs"
                          style={{
                            background: "rgba(249,115,22,0.06)",
                            color: "#F97316",
                            border: "1px solid rgba(249,115,22,0.12)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Keyboard hint */}
          <p
            className="mt-4 text-center"
            style={{ color: "#27272a", fontSize: 11 }}
          >
            ← → 鍵盤切換投影片
          </p>
        </div>
      </main>
    </div>
  );
}
