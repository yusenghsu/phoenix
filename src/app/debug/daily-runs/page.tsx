"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  DailyRun,
  TopicCandidate,
  CarouselSlide,
  PublishJob,
  JobEvent,
} from "@/lib/daily-workflow/types";

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

interface Details {
  candidates: TopicCandidate[];
  slides: CarouselSlide[];
  publishJobs: PublishJob[];
  events: JobEvent[];
}

export default function DailyRunsDebugPage() {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState("");
  const [storageMode, setStorageMode] = useState<"supabase" | "local" | null>(null);
  const [run, setRun] = useState<DailyRun | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [selectingTopicId, setSelectingTopicId] = useState<string | null>(null);
  const [cronPending, setCronPending] = useState<"ideas" | "generate" | "publish" | "force_ideas" | null>(null);
  const [confirmForceRegen, setConfirmForceRegen] = useState(false);
  const [cronResult, setCronResult] = useState<{
    ok?: boolean;
    job_type: string;
    status: string;
    message: string;
    stage?: string;
    errorCode?: string;
    errorMessage?: string;
    devHint?: string;
  } | null>(null);

  const fetchDetails = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/debug/daily-runs?run_id=${runId}`);
      const data = (await res.json()) as {
        status: string;
        storage_mode?: "supabase" | "local";
        candidates?: TopicCandidate[];
        slides?: CarouselSlide[];
        publishJobs?: PublishJob[];
        events?: JobEvent[];
      };
      if (data.status === "ok") {
        if (data.storage_mode) setStorageMode(data.storage_mode);
        setDetails({
          candidates: data.candidates ?? [],
          slides: data.slides ?? [],
          publishJobs: data.publishJobs ?? [],
          events: data.events ?? [],
        });
      }
    } catch { /* non-critical */ }
  }, []);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/debug/daily-runs");
      const data = (await res.json()) as {
        status: string;
        storage_mode?: "supabase" | "local";
        run?: DailyRun;
        today?: string;
        error?: string;
      };
      if (data.status === "ok") {
        setToday(data.today ?? "");
        setStorageMode(data.storage_mode ?? null);
        setRun(data.run ?? null);
        if (data.run) await fetchDetails(data.run.id);
      } else {
        setError(data.error ?? "Unknown error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [fetchDetails]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleCreateRun = async () => {
    setActionPending(true);
    setError(null);
    try {
      const res = await fetch("/api/debug/daily-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_today" }),
      });
      const data = (await res.json()) as { status: string; storage_mode?: "supabase" | "local"; run?: DailyRun; error?: string };
      if (data.status === "ok" && data.run) {
        if (data.storage_mode) setStorageMode(data.storage_mode);
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

  const handleSelectTopic = async (candidateId: string) => {
    if (!run || selectingTopicId) return;
    setSelectingTopicId(candidateId);
    setError(null);
    try {
      const res = await fetch("/api/debug/daily-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select_topic", run_id: run.id, topic_candidate_id: candidateId }),
      });
      const data = (await res.json()) as {
        status: string;
        run?: DailyRun;
        candidates?: TopicCandidate[];
        slides?: CarouselSlide[];
        publishJobs?: PublishJob[];
        events?: JobEvent[];
        storage_mode?: "supabase" | "local";
        error?: string;
      };
      if (data.status === "ok") {
        if (data.run) setRun(data.run);
        if (data.storage_mode) setStorageMode(data.storage_mode);
        setDetails({
          candidates: data.candidates ?? details?.candidates ?? [],
          slides: data.slides ?? details?.slides ?? [],
          publishJobs: data.publishJobs ?? details?.publishJobs ?? [],
          events: data.events ?? details?.events ?? [],
        });
      } else {
        setError(data.error ?? "Failed to select topic");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSelectingTopicId(null);
    }
  };

  const handleTestCron = async (type: "ideas" | "generate" | "publish", force = false) => {
    setCronPending(force ? "force_ideas" : type);
    setCronResult(null);
    try {
      const res = await fetch("/api/debug/cron-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, force }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        job_type?: string;
        status?: string;
        message?: string;
        stage?: string;
        errorCode?: string;
        errorMessage?: string;
        devHint?: string;
        error?: string;
      };
      setCronResult({
        ok: data.ok ?? res.ok,
        job_type: data.job_type ?? type,
        status: data.status ?? (res.ok ? "ok" : "error"),
        message: data.message ?? data.error ?? "",
        stage: data.stage,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        devHint: data.devHint,
      });
      await fetchToday();
    } catch (err) {
      setCronResult({
        ok: false,
        job_type: type,
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCronPending(null);
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
      const data = (await res.json()) as { status: string; storage_mode?: "supabase" | "local"; run?: DailyRun; error?: string };
      if (data.status === "ok" && data.run) {
        if (data.storage_mode) setStorageMode(data.storage_mode);
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
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "#9B9387", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Phoenix · Debug</p>
          <h1 style={{ color: "#FAFAF9", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Daily Run Dashboard</h1>
          <p style={{ color: "#9B9387", fontSize: 12 }}>台灣時間今日：{loading ? "讀取中…" : today}</p>
          <p style={{ color: storageMode === "supabase" ? "#4ade80" : storageMode === "local" ? "#FB923C" : "#6F675E", fontSize: 10, marginTop: 4 }}>
            {storageMode === "supabase" && "狀態儲存：Supabase phoenix_daily_runs ✓"}
            {storageMode === "local" && "狀態儲存：本機 JSON（Supabase tables 尚未套用）"}
            {storageMode === null && "確認儲存模式中…"}
          </p>
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
              {actionPending ? "建立中…" : "建立今天 Daily Run"}
            </button>
          </div>
        )}

        {loading && <p style={{ color: "#6F675E", fontSize: 12 }}>讀取中…</p>}

        {/* Run record */}
        {run && (
          <>
            <SectionCard title="今日 Run">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ color: "#FAFAF9", fontSize: 14, fontWeight: 700 }}>{run.run_date}</p>
                    <p style={{ color: "#9B9387", fontSize: 10, marginTop: 2 }}>
                      profile: {run.profile_key} · id: {run.id.slice(0, 8)}…
                    </p>
                  </div>
                  <StatusBadge status={run.status} />
                </div>
                {run.error_code && (
                  <p style={{ color: "#f87171", fontSize: 10 }}>
                    錯誤：{run.error_code} — {run.error_message}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                  <p style={{ color: "#6F675E", fontSize: 9 }}>建立：{run.created_at?.slice(0, 16) ?? "—"}</p>
                  {run.started_at && <p style={{ color: "#6F675E", fontSize: 9 }}>開始：{run.started_at.slice(0, 16)}</p>}
                  {run.finished_at && <p style={{ color: "#6F675E", fontSize: 9 }}>結束：{run.finished_at.slice(0, 16)}</p>}
                </div>

                {/* Debug actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 6, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {details.candidates.map((c) => {
                    const isSelected = c.status === "selected";
                    const isThisRunSelected = !!run?.selected_topic_id;
                    const slides = (c.draft_slides ?? []) as Array<{ slide_no?: number; slide_role?: string; title_text?: string; body_text?: string }>;
                    return (
                      <div key={c.id} style={{ padding: "14px 14px", background: isSelected ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${isSelected ? "rgba(249,115,22,0.25)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12 }}>
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                          <div>
                            <p style={{ color: "#FAFAF9", fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em" }}>
                              <span style={{ color: "#FB923C", marginRight: 6 }}>#{c.rank}</span>{c.title}
                            </p>
                            {c.angle && <p style={{ color: "#9B9387", fontSize: 11, marginTop: 3 }}>{c.angle}</p>}
                          </div>
                          <StatusBadge status={c.status} />
                        </div>

                        {/* Reason */}
                        {c.reason && (
                          <p style={{ color: "#6F675E", fontSize: 10, marginBottom: 8 }}>📌 {c.reason}</p>
                        )}

                        {/* Draft Caption */}
                        {c.draft_caption && (
                          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                            <p style={{ color: "#6F675E", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>Caption 草稿</p>
                            <p style={{ color: "#CFC7BA", fontSize: 10, lineHeight: 1.6 }}>{c.draft_caption}</p>
                          </div>
                        )}

                        {/* Slides */}
                        {slides.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <p style={{ color: "#6F675E", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>8 張輪播草稿</p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                              {slides.map((s, i) => (
                                <div key={i} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "6px 8px" }}>
                                  <p style={{ color: "#FB923C", fontSize: 8, fontWeight: 700, marginBottom: 2 }}>{s.slide_role ?? `SLIDE ${i + 1}`}</p>
                                  <p style={{ color: "#CFC7BA", fontSize: 10, fontWeight: 700, marginBottom: 2 }}>{s.title_text ?? ""}</p>
                                  <p style={{ color: "#6F675E", fontSize: 9, lineHeight: 1.4 }}>{s.body_text ?? ""}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Select button */}
                        {isSelected ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(249,115,22,0.08)", borderRadius: 8, border: "1px solid rgba(249,115,22,0.22)" }}>
                            <span style={{ color: "#FB923C", fontSize: 11, fontWeight: 700 }}>✓ 已選擇</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectTopic(c.id)}
                            disabled={isThisRunSelected || selectingTopicId !== null}
                            style={{
                              height: 34, paddingLeft: 16, paddingRight: 16, borderRadius: 8,
                              background: isThisRunSelected ? "rgba(255,255,255,0.02)" : "rgba(249,115,22,0.08)",
                              border: `1px solid ${isThisRunSelected ? "rgba(255,255,255,0.06)" : "rgba(249,115,22,0.22)"}`,
                              color: isThisRunSelected ? "#6F675E" : "#FB923C",
                              fontSize: 12, fontWeight: 700,
                              cursor: isThisRunSelected || selectingTopicId !== null ? "not-allowed" : "pointer",
                            }}
                          >
                            {selectingTopicId === c.id ? "選擇中…" : "選擇此主題"}
                          </button>
                        )}
                      </div>
                    );
                  })}
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

        {/* Cron Test Panel */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px", marginTop: 24 }}>
          <p style={{ color: "#9B9387", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Cron Test Panel</p>
          <p style={{ color: "#6F675E", fontSize: 10, marginBottom: 14 }}>Debug only. Calls OpenAI for 03:00 ideas. Does not call LINE, Runway, or Instagram.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(
              [
                { type: "ideas" as const, label: "測試 03:00 主題候選 Cron" },
                { type: "generate" as const, label: "測試 17:00 生成 Cron" },
                { type: "publish" as const, label: "測試 20:00 發布 Cron" },
              ] as const
            ).map(({ type, label }) => (
              <button
                key={type}
                onClick={() => handleTestCron(type)}
                disabled={cronPending !== null}
                style={{
                  height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 9,
                  background: cronPending === type ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: cronPending === type ? "#9B9387" : "#CFC7BA",
                  fontSize: 12, fontWeight: 600, cursor: cronPending !== null ? "not-allowed" : "pointer",
                  textAlign: "left",
                }}
              >
                {cronPending === type ? "執行中…" : label}
              </button>
            ))}

            {/* Force regenerate — with 2nd confirm */}
            <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {!confirmForceRegen ? (
                <button
                  onClick={() => setConfirmForceRegen(true)}
                  disabled={cronPending !== null}
                  style={{
                    height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 8,
                    background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.14)",
                    color: "#f87171", fontSize: 11, fontWeight: 600,
                    cursor: cronPending !== null ? "not-allowed" : "pointer", textAlign: "left",
                  }}
                >
                  重新產生今日 5 個主題候選（Debug）
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={{ color: "#f87171", fontSize: 10 }}>⚠ 會刪除今日候選並重新產生（消耗 OpenAI token）。是否確認？</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => { handleTestCron("ideas", true); setConfirmForceRegen(false); }}
                      disabled={cronPending !== null}
                      style={{
                        height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 8,
                        background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)",
                        color: "#f87171", fontSize: 11, fontWeight: 700,
                        cursor: cronPending !== null ? "not-allowed" : "pointer",
                      }}
                    >
                      {cronPending === "force_ideas" ? "重新產生中…" : "確認重新產生"}
                    </button>
                    <button
                      onClick={() => setConfirmForceRegen(false)}
                      style={{
                        height: 34, paddingLeft: 14, paddingRight: 14, borderRadius: 8,
                        background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                        color: "#9B9387", fontSize: 11, cursor: "pointer",
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {cronResult && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: cronResult.ok === false ? "rgba(239,68,68,0.06)" : "rgba(74,222,128,0.05)", border: `1px solid ${cronResult.ok === false ? "rgba(239,68,68,0.20)" : "rgba(74,222,128,0.15)"}`, borderRadius: 9, display: "flex", flexDirection: "column", gap: 5 }}>
              <p style={{ color: "#9B9387", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>{cronResult.job_type}</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <StatusBadge status={cronResult.status} />
                {cronResult.message && <span style={{ color: "#CFC7BA", fontSize: 11 }}>{cronResult.message}</span>}
              </div>
              {cronResult.stage && (
                <p style={{ color: "#9B9387", fontSize: 10 }}>stage: <span style={{ color: "#FB923C", fontFamily: "monospace" }}>{cronResult.stage}</span></p>
              )}
              {cronResult.errorMessage && (
                <p style={{ color: "#f87171", fontSize: 10, fontFamily: "monospace", wordBreak: "break-all" }}>{cronResult.errorMessage}</p>
              )}
              {cronResult.devHint && (
                <p style={{ color: "#6F675E", fontSize: 10 }}>{cronResult.devHint}</p>
              )}
            </div>
          )}
        </div>

        <p style={{ color: "#6F675E", fontSize: 9, textAlign: "center", marginTop: 24 }}>
          Debug only · Not available in production · No IG · No LINE · No auto-publish
        </p>
      </div>
    </div>
  );
}
