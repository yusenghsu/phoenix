"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PublishPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: "#0C0A08" }}>
      {/* Green ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(34,197,94,0.04) 0%, transparent 100%)",
        }}
      />

      {/* ── Nav ── */}
      <nav
        className="relative z-10 flex items-center justify-center"
        style={{ height: 52, borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}
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
      </nav>

      {/* ── Main ── */}
      <main
        className="relative z-10 flex flex-1 flex-col items-center justify-center px-6"
        style={{ paddingBottom: 64 }}
      >
        <div className="w-full flex flex-col items-center" style={{ maxWidth: 380 }}>

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
                  style={{
                    width: 5, height: 5,
                    borderRadius: "50%",
                    background: "#22c55e",
                    boxShadow: "0 0 5px rgba(34,197,94,0.8)",
                  }}
                />
                <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 500 }}>
                  Instagram · Scheduled · Today 20:00
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
        </div>
      </main>
    </div>
  );
}
