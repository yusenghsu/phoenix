"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  DailyRun,
  TopicCandidate,
  CarouselSlide,
  PublishJob,
  JobEvent,
} from "@/lib/daily-workflow/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RunDetails {
  run: DailyRun;
  candidates: TopicCandidate[];
  slides: CarouselSlide[];
  publishJobs: PublishJob[];
  events: JobEvent[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "published" ? "#4ade80"
    : status === "failed" ? "#f87171"
    : status === "idle" ? "#9B9387"
    : status === "ideas_ready" || status === "selected" || status === "ready_to_publish" ? "#FB923C"
    : status === "generating" || status === "publishing" ? "#60a5fa"
    : "#CFC7BA";
  return (
    <span style={{ background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 6, padding: "2px 8px", color, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em" }}>
      {status}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
      <p style={{ color: "#9B9387", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>{title}</p>
      {children}
    </div>
  );
}

function SlideRow({ s }: { s: CarouselSlide }) {
  const isReady =
    s.keyframe_status === "generated" &&
    s.motion_status === "generated" &&
    s.provider_ratio_status === "accepted_intermediate" &&
    s.final_composition_status === "composed" &&
    s.final_ratio_status === "passed_4_5";
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ color: isReady ? "#4ade80" : "#6F675E", fontFamily: "monospace", fontSize: 10, width: 20, flexShrink: 0 }}>{String(s.slide_no).padStart(2, "0")}</span>
      <span style={{ color: "#CFC7BA", fontSize: 10, width: 80, flexShrink: 0 }}>{s.slide_role ?? "—"}</span>
      <StatusBadge status={s.keyframe_status} />
      <StatusBadge status={s.motion_status} />
      <StatusBadge status={s.final_composition_status} />
      {isReady && <span style={{ color: "#4ade80", fontSize: 9, fontWeight: 700 }}>READY</span>}
      {s.error_code && <span style={{ color: "#f87171", fontSize: 9 }}>{s.error_code}</span>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DailyRunsDebugPage() {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<string>("");
  const [run, setRun] = useState<DailyRun | null>(null);
  const [details, setDetails] = useState<Omit<RunDetails, "run"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/debug/daily-runs");
      const data = (await res.json()) as { status: string; run?: DailyRun; today?: string; error?: string };
      if (data.status === "ok") {
        setToday(data.today ?? "");
        setRun(data.run ?? null);
        if (data.run) {
          await fetchDetails(data.run.id);
        }
      } else {
        setError(data.error ?? "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetails = async (runId: string) => {
    try {
      const res = await fetch(`/api/debug/daily-runs?run_id=${runId}`);
      const data = (await res.json()) as { status: string; candidates?: TopicCandidate[]; slides?: CarouselSlide[]; publishJobs?: PublishJob[]; events?: JobEvent[]; error?: string };
      if (data.status === "ok") {
        setDetails({
          candidates: data.candidates ?? [],
          slides: data.slides ?? [],
          publishJobs: data.publishJobs ?? [],
          events: data.events ?? [],
        });
      }
    } catch { /* non-critical */ }
  };

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleCreateRun = async () => {
    setActionPending(true);
    try {
      const res = await fetch("/api/debug/daily-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_today" }),
      });
      const data = (await res.json()) as { status: string; run?: DailyRun; error?: string };
      if (data.status === "ok" && data.run) {
        setRun(data.run);
        setDetails({ candidates: [], slides: [], publishJobs: [], events: [] });
      } else {
        setError(data.error ?? "Failed to create run");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionPending(false);
    }
  };

  const handleReset = async () => {
    if (!run || !confirmReset) return;
    setActionPending(true);
    setConfirmReset(false);
    try {
      const res = await fetch("/api/debug/daily-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", run_id: run.id }),
      });
      const data = (await res.json()) as { status: string; run?: DailyRun; error?: string };
      if (data.status === "ok" && data.run) {
        setRun(data.run);
      } else {
        setError(data.error ?? "Reset failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0C0A08", padding: "40px 24px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: "#9B9387", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Phoenix · Debug</p>
          <h1 style={{ color: "#FAFAF9", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Daily Run Dashboard</h1>
          <p style={{ color: "#9B9387", fontSize: 12 }}>台灣時間今日日期：{loading ? "讀取中…" : today}</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <p style={{ color: "#f87171", fontSize: 11 }}>{error}</p>
          </div>
        )}

        {/* No run today */}
        {!loading && !run && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "24px 20px", marginBottom: 20, textAlign: "center" }}>
            <p style={{ color: "#9B9387", fontSize: 13, marginBottom: 16 }}>今日尚無 Daily Run 記錄</p>
            <button
              onClick={handleCreateRun}
              disabled={actionPending}
              style={{ height: 42, paddingLeft: 24, paddingRight: 24, borderRadius: 10, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.22)", color: "#FB923C", fontSize: 13, fontWeight: 700, cursor: actionPending ? "not-allowed" : "pointer" }}
            >
              建立今天 Daily Run
            </button>
          </div>
        )}

        {/* Run record */}
        {run && (
          <>
            <SectionCard title="今日 Run">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700 }}>{run.run_date}</p>
                    <p style={{ color: "#9B9387", fontSize: 10, marginTop: 2 }}>profile: {run.profile_key} · id: {run.id.slice(0, 8)}…</p>
                  </div>
                  <StatusBadge status={run.status} />
                </div>
                {run.error_code && (
                  <p style={{ color: "#f87171", fontSize: 10 }}>
                    錯誤：{run.error_code} — {run.error_message}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <p style={{ color: "#6F675E", fontSize: 9 }}>建立：{run.created_at?.slice(0, 16) ?? "—"}</p>
                  {run.started_at && <p style={{ color: "#6F675E", fontSize: 9 }}>開始：{run.started_at.slice(0, 16)}</p>}
                  {run.finished_at && <p style={{ color: "#6F675E", fontSize: 9 }}>結束：{run.finished_at.slice(0, 16)}</p>}
                </div>

                {/* Debug actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button
                    onClick={() => run && fetchDetails(run.id)}
                    disabled={actionPending}
                    style={{ height: 32, paddingLeft: 14, paddingRight: 14, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#CFC7BA", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                  >
                    重新整理
                  </button>
                  {!confirmReset ? (
                    <button
                      onClick={() => setConfirmReset(true)}
                      disabled={actionPending}
                      style={{ height: 32, paddingLeft: 14, paddingRight: 14, borderRadius: 8, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.16)", color: "#f87171", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      Reset Run（Debug）
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleReset}
                        disabled={actionPending}
                        style={{ height: 32, paddingLeft: 14, paddingRight: 14, borderRadius: 8, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                      >
                        確認 Reset
                      </button>
                      <button
                        onClick={() => setConfirmReset(false)}
                        style={{ height: 32, paddingLeft: 14, paddingRight: 14, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#9B9387", fontSize: 11, cursor: "pointer" }}
                      >
                        取消
                      </button>
                    </>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Topic Candidates */}
            <SectionCard title={`主題候選（${details?.candidates.length ?? 0} / 5）`}>
              {!details || details.candidates.length === 0 ? (
                <p style={{ color: "#6F675E", fontSize: 11 }}>尚無候選主題 — 等待 03:00 AI 生成</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {details.candidates.map((c) => (
                    <div key={c.id} style={{ padding: "10px 12px", background: c.status === "selected" ? "rgba(249,115,22,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${c.status === "selected" ? "rgba(249,115,22,0.20)" : "rgba(255,255,255,0.06)"}`, borderRadius: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <p style={{ color: "#FAFAF9", fontSize: 12, fontWeight: 700 }}>#{c.rank} {c.title}</p>
                        <StatusBadge status={c.status} />
                      </div>
                      {c.angle && <p style={{ color: "#9B9387", fontSize: 10, marginTop: 4 }}>{c.angle}</p>}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Selected Topic */}
            <SectionCard title="已選主題">
              {run.selected_topic_id ? (
                <p style={{ color: "#4ade80", fontSize: 11 }}>✓ 已選 ID: {run.selected_topic_id.slice(0, 8)}…</p>
              ) : (
                <p style={{ color: "#6F675E", fontSize: 11 }}>尚未選擇 — 等待 LINE 或 Dashboard 選擇</p>
              )}
            </SectionCard>

            {/* Carousel Slides */}
            <SectionCard title={`動態輪播進度（${details?.slides.filter(s => s.final_composition_status === "composed").length ?? 0} / 8 READY）`}>
              {!details || details.slides.length === 0 ? (
                <p style={{ color: "#6F675E", fontSize: 11 }}>尚無 slide 記錄 — 等待 17:00 生成啟動</p>
              ) : (
                <div>
                  <div style={{ display: "flex", gap: 10, padding: "4px 0", marginBottom: 4 }}>
                    <span style={{ color: "#6F675E", fontSize: 9, width: 20 }}>#</span>
                    <span style={{ color: "#6F675E", fontSize: 9, width: 80 }}>Role</span>
                    <span style={{ color: "#6F675E", fontSize: 9 }}>KF</span>
                    <span style={{ color: "#6F675E", fontSize: 9 }}>MOT</span>
                    <span style={{ color: "#6F675E", fontSize: 9 }}>COMP</span>
                  </div>
                  {details.slides.map((s) => <SlideRow key={s.id} s={s} />)}
                </div>
              )}
            </SectionCard>

            {/* Publish Jobs */}
            <SectionCard title="發布任務">
              {!details || details.publishJobs.length === 0 ? (
                <p style={{ color: "#6F675E", fontSize: 11 }}>尚無發布任務 — 等待 8/8 READY 後 20:00 觸發</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {details.publishJobs.map((j) => (
                    <div key={j.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <p style={{ color: "#CFC7BA", fontSize: 11 }}>{j.platform} · {j.scheduled_at?.slice(0, 16) ?? "—"}</p>
                      <StatusBadge status={j.status} />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Job Events */}
            <SectionCard title="事件紀錄">
              {!details || details.events.length === 0 ? (
                <p style={{ color: "#6F675E", fontSize: 11 }}>尚無事件紀錄</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {details.events.map((e) => (
                    <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ color: "#6F675E", fontSize: 9, fontFamily: "monospace", flexShrink: 0, marginTop: 1 }}>{e.created_at?.slice(11, 16)}</span>
                      <span style={{ color: "#9B9387", fontSize: 10, flexShrink: 0, width: 100 }}>{e.job_type}</span>
                      <StatusBadge status={e.status} />
                      {e.message && <span style={{ color: "#CFC7BA", fontSize: 10 }}>{e.message}</span>}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        )}

        <p style={{ color: "#6F675E", fontSize: 9, textAlign: "center", marginTop: 24 }}>
          Debug only · Not available in production · No IG · No LINE · No auto-publish
        </p>
      </div>
    </div>
  );
}
