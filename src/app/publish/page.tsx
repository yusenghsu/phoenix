"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PhoenixHeader } from "@/components/PhoenixHeader";

export default function PublishPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [dbPublish, setDbPublish] = useState<{ scheduledLabel: string; status?: string } | null>(null);

  useEffect(() => {
    setReady(true);
    fetch("/api/data?type=publish")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setDbPublish(d); })
      .catch(() => {});
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: "#0C0A08" }}>
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: dbPublish?.status === "pending"
            ? "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(249,115,22,0.04) 0%, transparent 100%)"
            : "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(34,197,94,0.04) 0%, transparent 100%)",
        }}
      />

      {/* ── Nav ── */}
      <PhoenixHeader />

      {/* ── Main ── */}
      <main
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-6"
        style={{ paddingBottom: 64 }}
      >
        <div className="w-full flex flex-col items-center" style={{ maxWidth: 380 }}>

          {dbPublish?.status === "pending" ? (
            <>
              {/* Pending icon */}
              {ready && (
                <div
                  className="animate-scale-in flex items-center justify-center"
                  style={{
                    width: 64, height: 64,
                    borderRadius: "50%",
                    background: "rgba(249,115,22,0.08)",
                    border: "1px solid rgba(249,115,22,0.15)",
                    marginBottom: 28,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="#F97316" strokeWidth="1.8" />
                    <path d="M12 7v5l3 3" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              {/* Heading */}
              {ready && (
                <h1
                  className="animate-fade-up delay-100"
                  style={{
                    color: "#FAFAF9",
                    fontSize: 32,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.1,
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  Draft not approved yet.
                </h1>
              )}

              {/* Description */}
              {ready && (
                <div className="animate-fade-up delay-200" style={{ textAlign: "center", marginBottom: 48 }}>
                  <p style={{ color: "#8C8784", fontSize: 15, lineHeight: 1.65, letterSpacing: "-0.01em", marginBottom: 20 }}>
                    這份草稿還沒有獲得審核，尚未排程發布。
                  </p>
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2"
                    style={{
                      background: "rgba(20,12,6,0.8)",
                      border: "1px solid rgba(249,115,22,0.12)",
                    }}
                  >
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#F97316", opacity: 0.7 }} />
                    <span style={{ color: "#FB923C", fontSize: 12, fontWeight: 500 }}>
                      Draft · Pending approval
                    </span>
                  </div>
                </div>
              )}

              {/* Back to Decision */}
              {ready && (
                <div className="animate-fade-up delay-300 w-full" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                  <button
                    onClick={() => router.push("/decision")}
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
                    Back to Decision
                  </button>
                  <button
                    onClick={() => router.push("/")}
                    style={{
                      width: "100%", height: 44,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.04)",
                      color: "#FAFAF9",
                      fontSize: 13, fontWeight: 500,
                      border: "1px solid rgba(255,255,255,0.09)",
                    }}
                  >
                    Back Home
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Check mark */}
              {ready && (
                <div
                  className="animate-scale-in flex items-center justify-center"
                  style={{
                    width: 64, height: 64,
                    borderRadius: "50%",
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.15)",
                    marginBottom: 28,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M5 12.5L9.5 17L19 7"
                      stroke="#22c55e"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}

              {/* Heading */}
              {ready && (
                <h1
                  className="animate-fade-up delay-100"
                  style={{
                    color: "#FAFAF9",
                    fontSize: 42,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  Published.
                </h1>
              )}

              {/* Description */}
              {ready && (
                <div className="animate-fade-up delay-200" style={{ textAlign: "center", marginBottom: 48 }}>
                  <p style={{ color: "#8C8784", fontSize: 15, lineHeight: 1.65, letterSpacing: "-0.01em", marginBottom: 20 }}>
                    Phoenix 已將這篇排入今天的發布計劃。
                  </p>

                  {/* Status pill */}
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2"
                    style={{
                      background: "rgba(10,20,13,0.8)",
                      border: "1px solid rgba(74,222,128,0.12)",
                    }}
                  >
                    <div
                      className="dot-pulse"
                      style={{
                        width: 5, height: 5,
                        borderRadius: "50%",
                        background: "#22c55e",
                      }}
                    />
                    <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 500 }}>
                      Instagram · Scheduled · {dbPublish?.scheduledLabel ?? "Today 20:00"}
                    </span>
                  </div>
                </div>
              )}

              {/* Back home */}
              {ready && (
                <div className="animate-fade-up delay-300 w-full" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                  <button
                    onClick={() => router.push("/")}
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
                    Back Home
                  </button>

                  <p style={{ color: "#3E3B37", fontSize: 12, textAlign: "center", lineHeight: 1.6 }}>
                    Phoenix 會學習這篇的互動數據，
                    <br />
                    明天繼續替你優化。
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
