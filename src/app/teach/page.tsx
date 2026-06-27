"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL = 7;
const DNA_ITEMS = ["Brand DNA", "Taste DNA", "Topic DNA", "Design DNA", "Decision Brain"];
const ASSET_TYPES = ["Logo", "Font", "Website", "Canva", "PDF"];

// ─── Shared sub-components ────────────────────────────────────────────────────

function StepTitle({ tag, title, subtitle }: { tag?: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {tag && (
        <p style={{ color: "#F97316", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10, opacity: 0.8 }}>
          {tag}
        </p>
      )}
      <h2 style={{ color: "#FAFAF9", fontSize: 28, fontWeight: 680, letterSpacing: "-0.035em", lineHeight: 1.2, marginBottom: subtitle ? 10 : 0 }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: "#8C8784", fontSize: 14, lineHeight: 1.65, letterSpacing: "-0.01em" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function DisplayChip({ label }: { label: string }) {
  return (
    <div
      className="tag-orange"
      style={{
        display: "inline-flex", alignItems: "center",
        padding: "7px 14px", borderRadius: 20,
        background: "rgba(249,115,22,0.06)",
        border: "1px solid rgba(249,115,22,0.14)",
        color: "#FB923C", fontSize: 13, fontWeight: 500,
      }}
    >
      {label}
    </div>
  );
}

function AvoidChip({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center",
        padding: "7px 14px", borderRadius: 20,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        color: "#8C8784", fontSize: 13, fontWeight: 400,
      }}
    >
      {label}
    </div>
  );
}

// ─── Step content components ──────────────────────────────────────────────────

function Step1() {
  return (
    <div>
      <StepTitle tag="First-Time Setup" title="Teach Phoenix" />
      <p style={{ color: "#8C8784", fontSize: 15, lineHeight: 1.7, letterSpacing: "-0.01em", marginBottom: 32 }}>
        在我每天凌晨 03:00 開始工作前，先讓我認識你的品牌、品味與內容方向。
      </p>
      <div
        className="card-hover"
        style={{
          padding: "20px 22px", borderRadius: 16,
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p style={{ color: "#A09D9A", fontSize: 14, lineHeight: 1.85, letterSpacing: "-0.005em" }}>
          Phoenix 不是等你下指令的工具。
          <br />
          Phoenix 會主動替你做內容決策。
        </p>
      </div>
    </div>
  );
}

function Step2({ igConnected, onConnect }: { igConnected: boolean; onConnect: () => void }) {
  return (
    <div>
      <StepTitle
        title="連接 Instagram"
        subtitle="讓 Phoenix 讀懂你過去的內容節奏。"
      />
      {!igConnected ? (
        <button
          onClick={onConnect}
          style={{
            width: "100%", height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, rgba(131,58,180,0.1) 0%, rgba(253,29,29,0.07) 50%, rgba(252,176,69,0.09) 100%)",
            border: "1px solid rgba(255,255,255,0.09)",
            color: "#FAFAF9", fontSize: 14, fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="6" stroke="url(#ig1)" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="4.5" stroke="url(#ig2)" strokeWidth="1.5" />
            <circle cx="17.5" cy="6.5" r="1.2" fill="#FCB045" />
            <defs>
              <linearGradient id="ig1" x1="2" y1="2" x2="22" y2="22">
                <stop offset="0%" stopColor="#833AB4" />
                <stop offset="50%" stopColor="#FD1D1D" />
                <stop offset="100%" stopColor="#FCB045" />
              </linearGradient>
              <linearGradient id="ig2" x1="7" y1="7" x2="17" y2="17">
                <stop offset="0%" stopColor="#833AB4" />
                <stop offset="100%" stopColor="#FCB045" />
              </linearGradient>
            </defs>
          </svg>
          Connect Instagram
        </button>
      ) : (
        <div className="animate-fade-up">
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "15px 18px", borderRadius: 14,
              background: "rgba(34,197,94,0.05)",
              border: "1px solid rgba(34,197,94,0.12)",
              marginBottom: 18,
            }}
          >
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 6px rgba(34,197,94,0.7)",
              flexShrink: 0,
            }} />
            <span style={{ color: "#4ade80", fontSize: 14, fontWeight: 500 }}>
              Instagram connected
            </span>
          </div>
          <p style={{ color: "#8C8784", fontSize: 14, lineHeight: 1.7 }}>
            我會分析你的歷史貼文、互動表現與品牌方向。
          </p>
        </div>
      )}
    </div>
  );
}

function Step3({
  creators, input, onInput, onKey,
}: {
  creators: string[];
  input: string;
  onInput: (v: string) => void;
  onKey: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <StepTitle
        title="你喜歡哪些創作者？"
        subtitle="Phoenix 會學你欣賞的呈現方式，但不會模仿他們。"
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {creators.map((c) => <DisplayChip key={c} label={c} />)}
      </div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 22,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <span style={{ color: "#52504E", fontSize: 14 }}>@</span>
        <input
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="新增 username"
          style={{ flex: 1, background: "none", border: "none", color: "#FAFAF9", fontSize: 13 }}
        />
        <span style={{ color: "#2E2C29", fontSize: 11 }}>↵ Enter</span>
      </div>
    </div>
  );
}

function Step4({
  topics, input, onInput, onKey,
}: {
  topics: string[];
  input: string;
  onInput: (v: string) => void;
  onKey: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <StepTitle
        title="你想經營哪些主題？"
        subtitle="這些會成為 Phoenix 做每日決策時的內容地圖。"
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {topics.map((t) => <DisplayChip key={t} label={t} />)}
      </div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 22,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <input
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="新增主題"
          style={{ flex: 1, background: "none", border: "none", color: "#FAFAF9", fontSize: 13 }}
        />
        <span style={{ color: "#2E2C29", fontSize: 11 }}>↵ Enter</span>
      </div>
    </div>
  );
}

function Step5() {
  return (
    <div>
      <StepTitle
        title="你不想變成什麼樣的內容？"
        subtitle="Phoenix 需要知道哪些內容即使有流量，也不值得做。"
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {["心靈雞湯", "無聊內容", "標題黨", "農場文", "低品質流量", "沒有觀點"].map((item) => (
          <AvoidChip key={item} label={item} />
        ))}
      </div>
    </div>
  );
}

function Step6({
  uploaded, isDragOver, onDragEnter, onDragLeave, onToggle,
}: {
  uploaded: string[];
  isDragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onToggle: (a: string) => void;
}) {
  return (
    <div>
      <StepTitle
        title="上傳品牌素材"
        subtitle="讓 Phoenix 更準確地維持你的品牌一致性。"
      />
      <div
        onDragOver={(e) => { e.preventDefault(); onDragEnter(); }}
        onDragLeave={onDragLeave}
        onDrop={(e) => { e.preventDefault(); onDragLeave(); }}
        style={{
          borderRadius: 16,
          border: `1.5px dashed ${isDragOver ? "rgba(249,115,22,0.45)" : "rgba(255,255,255,0.08)"}`,
          background: isDragOver ? "rgba(249,115,22,0.04)" : "rgba(255,255,255,0.018)",
          padding: "28px 20px",
          textAlign: "center",
          marginBottom: 14,
          transition: "all 0.25s ease",
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 16V5M12 5L8 9M12 5L16 9" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 19H20" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <p style={{ color: "#6B6865", fontSize: 13, lineHeight: 1.55 }}>
          拖曳檔案至此
        </p>
        <p style={{ color: "#3E3B37", fontSize: 11, marginTop: 3 }}>或點擊下方選取類型</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {ASSET_TYPES.map((asset) => {
          const done = uploaded.includes(asset);
          return (
            <button
              key={asset}
              onClick={() => onToggle(asset)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 20,
                background: done ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${done ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.07)"}`,
                color: done ? "#4ade80" : "#8C8784",
                fontSize: 13, fontWeight: done ? 500 : 400,
                transition: "all 0.22s ease",
              }}
            >
              {done && (
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {asset}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step7({ dnaProgress, complete, onEnter }: { dnaProgress: number; complete: boolean; onEnter: () => void }) {
  return (
    <div>
      <StepTitle title="Phoenix 正在建立你的 Creator DNA" />

      <div
        style={{
          borderRadius: 16,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        {DNA_ITEMS.map((item, i) => {
          const lit = i < dnaProgress;
          const active = i === dnaProgress - 1;
          return (
            <div
              key={item}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "15px 20px",
                borderBottom: i < DNA_ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                opacity: lit ? 1 : 0.2,
                transition: "opacity 0.55s ease",
              }}
            >
              <div
                style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: active ? "#F97316" : lit ? "rgba(249,115,22,0.45)" : "rgba(255,255,255,0.12)",
                  boxShadow: active ? "0 0 8px rgba(249,115,22,0.75)" : "none",
                  transition: "all 0.5s ease",
                }}
              />
              <span
                style={{
                  flex: 1, fontSize: 14, fontWeight: lit ? 500 : 400,
                  color: lit ? "#FAFAF9" : "#52504E",
                  transition: "color 0.5s ease",
                }}
              >
                {item}
              </span>
              <div style={{ opacity: lit ? 1 : 0, transition: "opacity 0.4s ease 0.15s" }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {complete ? (
        <div className="animate-fade-up">
          <p
            style={{
              color: "#A09D9A", fontSize: 15, lineHeight: 1.7,
              textAlign: "center", letterSpacing: "-0.01em", marginBottom: 24,
            }}
          >
            Phoenix 已準備好每天替你做內容決策。
          </p>
          <button
            onClick={onEnter}
            style={{
              width: "100%", height: 50, borderRadius: 14,
              background: "#FAFAF9", color: "#0C0A08",
              fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em",
              border: "none",
            }}
          >
            進入 Decision Center
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2" style={{ height: 36 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: "inline-block", width: 4, height: 4,
                borderRadius: "50%", background: "#F97316",
                animation: `blink 1.3s ease-in-out ${i * 0.22}s infinite`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeachPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [igConnected, setIgConnected] = useState(false);
  const [creators, setCreators] = useState(["@ted", "@apple", "@louisvuitton", "@linear", "@arcinternet"]);
  const [topics, setTopics] = useState(["退休", "AI", "品牌", "心理學", "保險觀念", "內容經營"]);
  const [creatorInput, setCreatorInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dnaProgress, setDnaProgress] = useState(0);
  const [dnaComplete, setDnaComplete] = useState(false);

  // Trigger DNA animation when reaching step 7
  useEffect(() => {
    if (step !== TOTAL) return;
    setDnaProgress(0);
    setDnaComplete(false);
    const timers = [
      setTimeout(() => setDnaProgress(1), 500),
      setTimeout(() => setDnaProgress(2), 1100),
      setTimeout(() => setDnaProgress(3), 1700),
      setTimeout(() => setDnaProgress(4), 2300),
      setTimeout(() => setDnaProgress(5), 2900),
      setTimeout(() => setDnaComplete(true), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [step]);

  function next() { setStep((s) => Math.min(s + 1, TOTAL)); }
  function back() { setStep((s) => Math.max(s - 1, 1)); }

  function handleCreatorKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !creatorInput.trim()) return;
    const val = creatorInput.trim().startsWith("@") ? creatorInput.trim() : `@${creatorInput.trim()}`;
    if (!creators.includes(val)) setCreators((prev) => [...prev, val]);
    setCreatorInput("");
  }

  function handleTopicKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !topicInput.trim()) return;
    if (!topics.includes(topicInput.trim())) setTopics((prev) => [...prev, topicInput.trim()]);
    setTopicInput("");
  }

  function toggleAsset(asset: string) {
    setUploadedAssets((prev) =>
      prev.includes(asset) ? prev.filter((a) => a !== asset) : [...prev, asset]
    );
  }

  const progress = (step / TOTAL) * 100;
  const showContinue = step < TOTAL;
  const continueLabel = step === 1 ? "開始教 Phoenix" : "繼續";

  return (
    <div
      style={{
        background: "#0C0A08",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 40% at 50% -10%, rgba(249,115,22,0.07) 0%, transparent 100%)",
        }}
      />

      {/* ── Nav ── */}
      <nav
        style={{
          position: "relative", zIndex: 10, height: 52, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {/* Left: back or spacer */}
        <div style={{ width: 70 }}>
          {step > 1 && step < TOTAL && (
            <button
              onClick={back}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                color: "#52504E", fontSize: 13,
                background: "none", border: "none", padding: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2.5L4.5 7L9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
          )}
        </div>

        {/* Center: Phoenix logo */}
        <button
          onClick={() => router.push("/")}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", padding: 0 }}
        >
          <div
            style={{
              width: 22, height: 22, borderRadius: 7,
              background: "linear-gradient(145deg, #F97316, #FB923C)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M5 0.5L6.2 3.6H9.5L6.9 5.5L7.9 8.6L5 6.7L2.1 8.6L3.1 5.5L0.5 3.6H3.8L5 0.5Z" fill="white" />
            </svg>
          </div>
          <span style={{ color: "#FAFAF9", fontSize: 13, fontWeight: 600, letterSpacing: "-0.015em" }}>Phoenix</span>
        </button>

        {/* Right: step counter */}
        <span style={{ color: "#3E3B37", fontSize: 11, fontWeight: 500, width: 70, textAlign: "right" }}>
          {step} / {TOTAL}
        </span>
      </nav>

      {/* ── Content ── */}
      <main
        style={{
          position: "relative", zIndex: 10, flex: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "40px 24px 0",
          overflowY: "auto",
        }}
      >
        <div style={{ maxWidth: 440, width: "100%", paddingBottom: 32 }}>
          <div key={step} className="animate-fade-up">

            {step === 1 && <Step1 />}

            {step === 2 && (
              <Step2
                igConnected={igConnected}
                onConnect={() => setIgConnected(true)}
              />
            )}

            {step === 3 && (
              <Step3
                creators={creators}
                input={creatorInput}
                onInput={setCreatorInput}
                onKey={handleCreatorKey}
              />
            )}

            {step === 4 && (
              <Step4
                topics={topics}
                input={topicInput}
                onInput={setTopicInput}
                onKey={handleTopicKey}
              />
            )}

            {step === 5 && <Step5 />}

            {step === 6 && (
              <Step6
                uploaded={uploadedAssets}
                isDragOver={isDragOver}
                onDragEnter={() => setIsDragOver(true)}
                onDragLeave={() => setIsDragOver(false)}
                onToggle={toggleAsset}
              />
            )}

            {step === TOTAL && (
              <Step7
                dnaProgress={dnaProgress}
                complete={dnaComplete}
                onEnter={() => router.push("/")}
              />
            )}

          </div>
        </div>
      </main>

      {/* ── Bottom: Progress + Continue ── */}
      <div
        style={{
          position: "relative", zIndex: 10,
          padding: "16px 24px 40px", flexShrink: 0,
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            height: 2, background: "rgba(255,255,255,0.05)",
            borderRadius: 2, marginBottom: 16, overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%", width: `${progress}%`,
              background: "linear-gradient(90deg, #F97316, #FB923C)",
              borderRadius: 2,
              transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>

        {/* Continue button (steps 1–6) */}
        {showContinue && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={next}
              style={{
                width: "100%", height: 50, borderRadius: 14,
                background: "#FAFAF9", color: "#0C0A08",
                fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em",
                border: "none",
              }}
            >
              {continueLabel}
            </button>

            {/* Skip Instagram */}
            {step === 2 && !igConnected && (
              <button
                onClick={next}
                style={{
                  width: "100%", height: 36,
                  background: "none", border: "none",
                  color: "#3E3B37", fontSize: 13,
                }}
              >
                先略過
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
