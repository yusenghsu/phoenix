"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  DailyRun,
  TopicCandidate,
  CarouselSlide,
  PublishJob,
  JobEvent,
} from "@/lib/daily-workflow/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PHASE_LABEL: Record<string, string> = {
  generation_started: "準備中",
  slide_started: "開始處理",
  keyframe_started: "生成 Keyframe（OpenAI）",
  keyframe_generated: "Keyframe 完成",
  motion_started: "等待 Runway（消耗 credits）",
  motion_generated: "Runway 動態完成",
  compose_started: "合成 4:5（ffmpeg）",
  compose_completed: "合成完成",
  slide_ready: "READY ✓",
  generation_complete: "全部完成",
  generation_failed: "生成失敗",
  generation_partial: "部分完成（已中止）",
  locked: "鎖定（另一個 job 進行中）",
  generation_reset_debug: "已重置（Debug）",
};

function formatElapsed(startAt: string | null | undefined): string {
  if (!startAt) return "—";
  const ms = Date.now() - new Date(startAt).getTime();
  if (ms < 0) return "—";
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}m ${String(sec).padStart(2, "0")}s`;
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "published" || status === "dry_run_ready" ? "#4ade80"
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
  const isReady = s.final_ratio_status === "passed_4_5";
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ color: isReady ? "#4ade80" : "#6F675E", fontFamily: "monospace", fontSize: 10, width: 20, flexShrink: 0 }}>{String(s.slide_no).padStart(2, "0")}</span>
      <span style={{ color: "#CFC7BA", fontSize: 10, width: 72, flexShrink: 0 }}>{s.slide_role ?? "—"}</span>
      <StatusBadge status={s.keyframe_status} />
      <StatusBadge status={s.motion_status} />
      <StatusBadge status={s.provider_ratio_status} />
      <StatusBadge status={s.final_composition_status} />
      <StatusBadge status={s.final_ratio_status} />
      {isReady && <span style={{ color: "#4ade80", fontSize: 9, fontWeight: 700 }}>READY</span>}
      {s.error_code && <span style={{ color: "#f87171", fontSize: 9 }}>{s.error_code}</span>}
    </div>
  );
}

// ── Instagram readiness types (mirrors InstagramReadinessResult) ──────────────

interface IGReadinessCheck {
  key: string;
  label: string;
  status: "pass" | "fail" | "warning";
  message: string;
}

interface IGReadinessResult {
  ok: boolean;
  canAttemptPublish: boolean;
  autoPublishEnabled: boolean;
  checks: IGReadinessCheck[];
  account?: { igUserId?: string; username?: string; accountType?: string; mediaCount?: number };
  missingEnv: string[];
  mediaPreflight: { total: number; publicCount: number; localCount: number; invalidUrls: string[] };
  runIdUsed?: string;
  runDateUsed?: string;
  fallbackUsed?: boolean;
  error?: string;
}

// ── Storage sync result types (mirrors StorageSyncResult from storage-sync.ts) ─

interface StorageSlideSyncResult {
  slideNo: number;
  status: string;
  publicUrl?: string;
  errorMessage?: string;
}

interface StorageSyncResult {
  ok: boolean;
  uploaded: number;
  skipped: number;
  failed: number;
  slides: StorageSlideSyncResult[];
  bucketName: string;
  errorMessage?: string;
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
  const [confirmResetGeneration, setConfirmResetGeneration] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const [syncResult, setSyncResult] = useState<StorageSyncResult | null>(null);
  const [readinessPending, setReadinessPending] = useState(false);
  const [readiness, setReadiness] = useState<IGReadinessResult | null>(null);
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

  // Stable ref so silentRefresh can read the current run.id without being in its dep array
  const runRef = useRef<DailyRun | null>(null);
  useEffect(() => { runRef.current = run; }, [run]);

  const silentRefresh = useCallback(async () => {
    const currentRun = runRef.current;
    if (!currentRun) return;
    try {
      const [runRes, detailsRes] = await Promise.all([
        fetch("/api/debug/daily-runs"),
        fetch(`/api/debug/daily-runs?run_id=${currentRun.id}`),
      ]);
      const runData = (await runRes.json()) as { status: string; run?: DailyRun; today?: string; storage_mode?: "supabase" | "local" };
      const detailsData = (await detailsRes.json()) as { status: string; storage_mode?: "supabase" | "local"; candidates?: TopicCandidate[]; slides?: CarouselSlide[]; publishJobs?: PublishJob[]; events?: JobEvent[] };
      if (runData.status === "ok") {
        if (runData.today) setToday(runData.today);
        if (runData.storage_mode) setStorageMode(runData.storage_mode);
        if (runData.run) setRun(runData.run);
      }
      if (detailsData.status === "ok") {
        if (detailsData.storage_mode) setStorageMode(detailsData.storage_mode);
        setDetails({
          candidates: detailsData.candidates ?? [],
          slides: detailsData.slides ?? [],
          publishJobs: detailsData.publishJobs ?? [],
          events: detailsData.events ?? [],
        });
      }
    } catch { /* non-critical */ }
  }, []); // stable — reads run via runRef

  // Poll every 3 s while generation is active
  useEffect(() => {
    if (run?.status !== "generating" && run?.status !== "generation_queued") return;
    const interval = setInterval(silentRefresh, 3000);
    return () => clearInterval(interval);
  }, [run?.status, silentRefresh]);

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

  const handleResetGeneration = async () => {
    if (!run || !confirmResetGeneration) return;
    setActionPending(true);
    setConfirmResetGeneration(false);
    setError(null);
    try {
      const res = await fetch("/api/debug/daily-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_generation", run_id: run.id }),
      });
      const data = (await res.json()) as { status: string; run?: DailyRun; candidates?: TopicCandidate[]; slides?: CarouselSlide[]; publishJobs?: PublishJob[]; events?: JobEvent[]; storage_mode?: "supabase" | "local"; error?: string };
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
        setError(data.error ?? "Reset failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionPending(false);
    }
  };

  const handleSyncStorage = async () => {
    if (!run || syncPending) return;
    setSyncPending(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await fetch("/api/debug/daily-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_final_videos_to_storage", run_id: run.id }),
      });
      const data = (await res.json()) as {
        status: string;
        syncResult?: StorageSyncResult;
        storage_mode?: "supabase" | "local";
        candidates?: TopicCandidate[];
        slides?: CarouselSlide[];
        publishJobs?: PublishJob[];
        events?: JobEvent[];
        error?: string;
      };
      if (data.status === "ok") {
        if (data.syncResult) setSyncResult(data.syncResult);
        if (data.storage_mode) setStorageMode(data.storage_mode);
        setDetails({
          candidates: data.candidates ?? details?.candidates ?? [],
          slides: data.slides ?? details?.slides ?? [],
          publishJobs: data.publishJobs ?? details?.publishJobs ?? [],
          events: data.events ?? details?.events ?? [],
        });
      } else {
        setSyncResult({
          ok: false, uploaded: 0, skipped: 0, failed: 0, slides: [],
          bucketName: "phoenix-generated-assets", errorMessage: data.error,
        });
      }
    } catch (err) {
      setSyncResult({
        ok: false, uploaded: 0, skipped: 0, failed: 0, slides: [],
        bucketName: "phoenix-generated-assets",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSyncPending(false);
    }
  };

  const handleFindLatestReadyRun = async () => {
    setActionPending(true);
    setError(null);
    setSyncResult(null);
    setReadiness(null);
    try {
      const res = await fetch("/api/debug/daily-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "find_latest_ready_run" }),
      });
      const data = (await res.json()) as {
        status: string;
        run?: DailyRun;
        candidates?: TopicCandidate[];
        slides?: CarouselSlide[];
        publishJobs?: PublishJob[];
        events?: JobEvent[];
        storage_mode?: "supabase" | "local";
        message?: string;
        error?: string;
      };
      if (data.status === "ok" && data.run) {
        if (data.storage_mode) setStorageMode(data.storage_mode);
        setRun(data.run);
        setDetails({
          candidates: data.candidates ?? [],
          slides: data.slides ?? [],
          publishJobs: data.publishJobs ?? [],
          events: data.events ?? [],
        });
      } else {
        setError(data.message ?? data.error ?? "No ready run found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionPending(false);
    }
  };

  const handleCheckReadiness = async () => {
    if (readinessPending) return;
    setReadinessPending(true);
    setReadiness(null);
    try {
      // Always pass the run currently shown on screen — never let the API drift to today's run
      const params = run ? `?runId=${run.id}` : "";
      const res = await fetch(`/api/debug/instagram/readiness${params}`);
      const data = (await res.json()) as IGReadinessResult;
      setReadiness(data);
    } catch (err) {
      setReadiness({
        ok: false, canAttemptPublish: false, autoPublishEnabled: false,
        checks: [], missingEnv: [],
        mediaPreflight: { total: 0, publicCount: 0, localCount: 0, invalidUrls: [] },
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setReadinessPending(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0C0A08", padding: "40px 24px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: "#9B9387", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Phoenix · Debug</p>
          <h1 style={{ color: "#FAFAF9", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Daily Run Dashboard</h1>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <p style={{ color: "#9B9387", fontSize: 12 }}>台灣時間今日：{loading ? "讀取中…" : today}</p>
            <button
              onClick={handleFindLatestReadyRun}
              disabled={actionPending}
              style={{ height: 30, paddingLeft: 12, paddingRight: 12, borderRadius: 7, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", color: "#9B9387", fontSize: 10, fontWeight: 600, cursor: actionPending ? "not-allowed" : "pointer", flexShrink: 0 }}
            >
              查看最新 8/8 READY Run
            </button>
          </div>
          <p style={{ color: storageMode === "supabase" ? "#4ade80" : storageMode === "local" ? "#FB923C" : "#6F675E", fontSize: 10, marginTop: 4 }}>
            {storageMode === "supabase" && "狀態儲存：Supabase phoenix_daily_runs ✓"}
            {storageMode === "local" && "狀態儲存：本機 JSON（Supabase tables 尚未套用）"}
            {storageMode === null && "確認儲存模式中…"}
          </p>
          {run && today && run.run_date !== today && (
            <p style={{ color: "#FB923C", fontSize: 10, marginTop: 4 }}>
              目前查看：{run.run_date} run（非今日）
            </p>
          )}
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

            {/* Generation Progress — shown when generating */}
            {(run.status === "generating" || run.status === "generation_queued") && (() => {
              const genEvents = (details?.events ?? []).filter(e => e.job_type === "daily_generate");
              const latest = genEvents[0];
              const payload = latest?.payload as { slide_no?: number; slide_role?: string; ready_count?: number; total_count?: number; runway_task_id?: string; error_message?: string } | undefined;
              const slideNo = payload?.slide_no;
              const slideRole = payload?.slide_role;
              const readyCount = details?.slides.filter(s => s.final_ratio_status === "passed_4_5").length ?? 0;
              const totalCount = payload?.total_count ?? 8;
              const phase = latest?.status ?? "";
              const isWaitingRunway = phase === "motion_started";
              const lastEventMs = latest?.created_at ? Date.now() - new Date(latest.created_at).getTime() : null;
              const isStale = lastEventMs != null && lastEventMs > 10 * 60 * 1000;
              return (
                <SectionCard title="生成進度">
                  {/* Stats row */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <p style={{ color: "#9B9387", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3 }}>已完成</p>
                      <p style={{ color: "#4ade80", fontSize: 18, fontWeight: 800, fontFamily: "monospace" }}>{readyCount} <span style={{ color: "#6F675E", fontSize: 12 }}>/ {totalCount}</span></p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ color: "#9B9387", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3 }}>已用時</p>
                      <p style={{ color: "#CFC7BA", fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>{formatElapsed(run.started_at)}</p>
                    </div>
                  </div>

                  {/* Current slide */}
                  {slideNo != null && (
                    <div style={{ marginBottom: 10, padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                      <p style={{ color: "#9B9387", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>處理中</p>
                      <p style={{ color: "#FAFAF9", fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
                        第 <span style={{ color: "#FB923C" }}>{slideNo}</span> 張
                        {slideRole && <span style={{ color: "#9B9387", fontSize: 11, marginLeft: 8 }}>· {slideRole}</span>}
                      </p>
                      {phase && (
                        <p style={{ color: "#CFC7BA", fontSize: 11 }}>
                          階段：<span style={{ color: isWaitingRunway ? "#FB923C" : "#CFC7BA" }}>{PHASE_LABEL[phase] ?? phase}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Runway warning */}
                  {isWaitingRunway && (
                    <div style={{ marginBottom: 10, padding: "7px 10px", background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.22)", borderRadius: 8 }}>
                      <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 600 }}>⚠ Runway 正在消耗 credits，請勿重複點擊</p>
                    </div>
                  )}

                  {/* Latest event */}
                  {latest && (
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ color: "#6F675E", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>最新事件</p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ color: "#6F675E", fontSize: 9, fontFamily: "monospace" }}>{latest.created_at?.slice(11, 19)}</span>
                        <StatusBadge status={latest.status} />
                        {latest.message && <span style={{ color: "#9B9387", fontSize: 10 }}>{latest.message}</span>}
                      </div>
                    </div>
                  )}

                  {/* Stale warning + reset */}
                  {isStale && (
                    <div style={{ marginTop: 8, padding: "10px 12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.20)", borderRadius: 9 }}>
                      <p style={{ color: "#f87171", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                        ⚠ 生成可能卡住（最後事件 {Math.floor((lastEventMs ?? 0) / 60000)} 分鐘前），請檢查 Runway Dashboard 或 server logs。
                      </p>
                      {!confirmResetGeneration ? (
                        <button
                          onClick={() => setConfirmResetGeneration(true)}
                          disabled={actionPending}
                          style={{ height: 32, paddingLeft: 14, paddingRight: 14, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.24)", color: "#f87171", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                        >
                          Debug Reset Stuck Generation
                        </button>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <p style={{ color: "#f87171", fontSize: 10 }}>⚠ 只重置狀態，不刪除已完成 slides。READY 張數保留。確認？</p>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={handleResetGeneration}
                              disabled={actionPending}
                              style={{ height: 32, paddingLeft: 14, paddingRight: 14, borderRadius: 8, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.32)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                              確認 Reset
                            </button>
                            <button
                              onClick={() => setConfirmResetGeneration(false)}
                              style={{ height: 32, paddingLeft: 14, paddingRight: 14, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#9B9387", fontSize: 11, cursor: "pointer" }}
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              );
            })()}

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
            <SectionCard title={`動態輪播進度（${details?.slides.filter(s => s.final_ratio_status === "passed_4_5").length ?? 0} / 8 READY）`}>
              {!details || details.slides.length === 0 ? (
                <p style={{ color: "#6F675E", fontSize: 11 }}>尚無 slide 記錄 — 等待 17:00 生成啟動</p>
              ) : (
                <div>
                  <div style={{ display: "flex", gap: 8, padding: "4px 0", marginBottom: 4 }}>
                    <span style={{ color: "#6F675E", fontSize: 9, width: 20 }}>#</span>
                    <span style={{ color: "#6F675E", fontSize: 9, width: 72 }}>Role</span>
                    <span style={{ color: "#6F675E", fontSize: 9 }}>KF</span>
                    <span style={{ color: "#6F675E", fontSize: 9 }}>MOT</span>
                    <span style={{ color: "#6F675E", fontSize: 9 }}>RATIO</span>
                    <span style={{ color: "#6F675E", fontSize: 9 }}>COMP</span>
                    <span style={{ color: "#6F675E", fontSize: 9 }}>4:5</span>
                  </div>
                  {details.slides.map((s) => <SlideRow key={s.id} s={s} />)}
                </div>
              )}
            </SectionCard>

            {/* Storage / IG Media URLs */}
            {details && details.slides.length > 0 && (() => {
              const readySlides = details.slides.filter(s => s.final_ratio_status === "passed_4_5");
              const publicSlides = readySlides.filter(s => s.final_video_url?.startsWith("https://"));
              const allPublic = readySlides.length === 8 && publicSlides.length === 8;
              const hasLocalSlides = readySlides.some(s => s.final_video_url && !s.final_video_url.startsWith("https://"));
              return (
                <SectionCard title={`Storage / IG Media URLs（${publicSlides.length} / ${readySlides.length} public）`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div>
                      <p style={{ color: "#6F675E", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 3 }}>Bucket</p>
                      <p style={{ color: "#CFC7BA", fontSize: 11, fontFamily: "monospace" }}>{syncResult?.bucketName ?? "phoenix-generated-assets"}</p>
                    </div>
                    {allPublic && (
                      <span style={{ background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 8, padding: "4px 10px", color: "#4ade80", fontSize: 10, fontWeight: 700 }}>
                        8 / 8 PUBLIC ✓
                      </span>
                    )}
                  </div>

                  {/* Per-slide URL status */}
                  <div style={{ marginBottom: 12 }}>
                    {readySlides.map((s) => {
                      const isPublic = s.final_video_url?.startsWith("https://");
                      return (
                        <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <span style={{ color: "#6F675E", fontFamily: "monospace", fontSize: 10, width: 20, flexShrink: 0 }}>{String(s.slide_no).padStart(2, "0")}</span>
                          <span style={{ color: isPublic ? "#4ade80" : "#f87171", fontSize: 10, width: 14, flexShrink: 0 }}>{isPublic ? "✓" : "✗"}</span>
                          {isPublic ? (
                            <span style={{ color: "#6F675E", fontSize: 9, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>
                              {s.final_video_url}
                            </span>
                          ) : (
                            <span style={{ color: "#9B9387", fontSize: 9, fontFamily: "monospace" }}>
                              {s.final_video_url ?? "—"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {readySlides.length === 0 && (
                      <p style={{ color: "#6F675E", fontSize: 11 }}>尚無 READY slides — 等待 17:00 生成</p>
                    )}
                  </div>

                  {/* Sync button */}
                  {readySlides.length > 0 && (
                    <div>
                      <button
                        onClick={handleSyncStorage}
                        disabled={syncPending || allPublic}
                        style={{
                          height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 9, marginBottom: 6,
                          background: allPublic ? "rgba(74,222,128,0.04)" : syncPending ? "rgba(255,255,255,0.04)" : "rgba(96,165,250,0.07)",
                          border: `1px solid ${allPublic ? "rgba(74,222,128,0.15)" : syncPending ? "rgba(255,255,255,0.08)" : "rgba(96,165,250,0.20)"}`,
                          color: allPublic ? "#4ade80" : syncPending ? "#6F675E" : "#60a5fa",
                          fontSize: 12, fontWeight: 600,
                          cursor: syncPending || allPublic ? "not-allowed" : "pointer",
                          display: "block", width: "100%", textAlign: "left",
                        }}
                      >
                        {syncPending ? "上傳中…" : allPublic ? "✓ 全部已上傳到 Supabase Storage" : hasLocalSlides ? `上傳 ${readySlides.length - publicSlides.length} 張 final MP4 到 Supabase Storage（Debug）` : "上傳 8 張 final MP4 到 Supabase Storage（Debug）"}
                      </button>
                      <p style={{ color: "#6F675E", fontSize: 9, lineHeight: 1.5 }}>
                        Debug only. 上傳已存在的 final MP4。不呼叫 Instagram。不重新生成影片。
                      </p>
                    </div>
                  )}

                  {/* Sync result */}
                  {syncResult && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: syncResult.ok ? "rgba(74,222,128,0.05)" : "rgba(239,68,68,0.06)", border: `1px solid ${syncResult.ok ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.20)"}`, borderRadius: 8 }}>
                      <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                        <span style={{ color: "#4ade80", fontSize: 10 }}>↑ {syncResult.uploaded} uploaded</span>
                        <span style={{ color: "#6F675E", fontSize: 10 }}>→ {syncResult.skipped} skipped</span>
                        {syncResult.failed > 0 && <span style={{ color: "#f87171", fontSize: 10 }}>✗ {syncResult.failed} failed</span>}
                      </div>
                      {syncResult.errorMessage && (
                        <p style={{ color: "#f87171", fontSize: 10, fontFamily: "monospace", wordBreak: "break-all" }}>{syncResult.errorMessage}</p>
                      )}
                    </div>
                  )}
                </SectionCard>
              );
            })()}

            {/* Publish Jobs */}
            <SectionCard title="發布任務">
              {!details || details.publishJobs.length === 0 ? (
                <p style={{ color: "#6F675E", fontSize: 11 }}>尚無發布任務 — 等待 8/8 READY 後 20:00 觸發</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {details.publishJobs.map((j) => {
                    const meta = (j.metadata ?? {}) as {
                      dry_run?: boolean;
                      preflight?: {
                        autoPublishEnabled?: boolean;
                        hasMetaConfig?: boolean;
                        mediaUrlsPublic?: boolean;
                        blockedUrls?: string[];
                      };
                      error_code?: string;
                      error_message?: string;
                      container_ids_count?: number;
                      carousel_container_id?: string;
                      error_stage?: string;
                    };
                    const pf = meta.preflight;
                    const isRealPublish = pf?.autoPublishEnabled === true;
                    return (
                      <div key={j.id} style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ color: "#CFC7BA", fontSize: 12, fontWeight: 700 }}>{j.platform}</span>
                            <span style={{ fontSize: 9, color: isRealPublish ? "#4ade80" : "#9B9387", background: isRealPublish ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${isRealPublish ? "rgba(74,222,128,0.20)" : "rgba(255,255,255,0.08)"}`, borderRadius: 5, padding: "2px 6px" }}>
                              {isRealPublish ? "Real publish" : "Dry-run mode"}
                            </span>
                          </div>
                          <StatusBadge status={j.status} />
                        </div>
                        {/* Timestamps */}
                        <p style={{ color: "#6F675E", fontSize: 9, marginBottom: 5 }}>
                          排程：{j.scheduled_at?.slice(0, 16) ?? "—"}
                          {j.published_at && ` · 發布：${j.published_at.slice(0, 16)}`}
                          {j.platform_media_id && <span style={{ color: "#4ade80" }}> · media_id: {j.platform_media_id}</span>}
                        </p>
                        {/* Caption preview */}
                        {j.caption && (
                          <p style={{ color: "#9B9387", fontSize: 10, lineHeight: 1.5, marginBottom: 6 }}>
                            {j.caption.slice(0, 100)}{j.caption.length > 100 ? "…" : ""}
                          </p>
                        )}
                        {/* Preflight checklist */}
                        {pf && (
                          <div style={{ marginBottom: 6, padding: "7px 9px", background: "rgba(255,255,255,0.02)", borderRadius: 7 }}>
                            <p style={{ color: "#6F675E", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>Preflight</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <p style={{ fontSize: 10, color: pf.autoPublishEnabled ? "#4ade80" : "#9B9387" }}>
                                {pf.autoPublishEnabled ? "✓" : "✗"} PHOENIX_AUTO_PUBLISH_ENABLED
                              </p>
                              <p style={{ fontSize: 10, color: pf.hasMetaConfig ? "#4ade80" : "#9B9387" }}>
                                {pf.hasMetaConfig ? "✓" : "✗"} META_ACCESS_TOKEN + META_IG_USER_ID
                              </p>
                              <p style={{ fontSize: 10, color: pf.mediaUrlsPublic ? "#4ade80" : "#f87171" }}>
                                {pf.mediaUrlsPublic ? "✓" : "✗"} Media URLs（public https）
                              </p>
                              {(pf.blockedUrls ?? []).length > 0 && (
                                <p style={{ fontSize: 9, color: "#f87171", fontFamily: "monospace", marginTop: 2 }}>
                                  blocked: {pf.blockedUrls![0].slice(0, 50)}{pf.blockedUrls!.length > 1 ? ` +${pf.blockedUrls!.length - 1} more` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Container info (shown after real publish attempt) */}
                        {(meta.container_ids_count != null || meta.carousel_container_id) && (
                          <div style={{ marginBottom: 6, padding: "6px 9px", background: "rgba(255,255,255,0.02)", borderRadius: 7 }}>
                            <p style={{ color: "#6F675E", fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>IG Containers</p>
                            {meta.container_ids_count != null && (
                              <p style={{ fontSize: 10, color: "#CFC7BA" }}>item containers: {meta.container_ids_count}</p>
                            )}
                            {meta.carousel_container_id && (
                              <p style={{ fontSize: 9, color: "#9B9387", fontFamily: "monospace", marginTop: 2 }}>
                                carousel: {meta.carousel_container_id}
                              </p>
                            )}
                          </div>
                        )}
                        {/* Error / status reason */}
                        {(j.error_code || meta.error_message) && (
                          <div style={{ padding: "6px 8px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 6 }}>
                            {meta.error_stage && <p style={{ color: "#f87171", fontSize: 9, fontFamily: "monospace", marginBottom: 2 }}>stage: {meta.error_stage}</p>}
                            {j.error_code && <p style={{ color: "#f87171", fontSize: 9, fontFamily: "monospace", marginBottom: 2 }}>{j.error_code}</p>}
                            {meta.error_message && <p style={{ color: "#9B9387", fontSize: 10 }}>{meta.error_message}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Instagram Readiness */}
            <SectionCard title="Instagram Readiness">
              {/* Safety gate banner */}
              {readiness && (
                <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: readiness.autoPublishEnabled ? "rgba(239,68,68,0.07)" : "rgba(74,222,128,0.06)", border: `1px solid ${readiness.autoPublishEnabled ? "rgba(239,68,68,0.22)" : "rgba(74,222,128,0.18)"}` }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: readiness.autoPublishEnabled ? "#f87171" : "#4ade80" }}>
                    {readiness.autoPublishEnabled
                      ? "Auto publish is enabled. Pressing 20:00 publish may post to Instagram."
                      : "Auto publish disabled. 20:00 publish remains dry-run only."}
                  </p>
                </div>
              )}

              {/* Checks list */}
              {readiness && readiness.checks.length > 0 && (
                <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 5 }}>
                  {readiness.checks.map((c) => (
                    <div key={c.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1, width: 10,
                        color: c.status === "pass" ? "#4ade80" : c.status === "fail" ? "#f87171" : "#FB923C",
                      }}>
                        {c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "!"}
                      </span>
                      <div>
                        <p style={{ fontSize: 10, color: "#CFC7BA", fontWeight: 600 }}>{c.label}</p>
                        <p style={{ fontSize: 9, color: "#9B9387", marginTop: 1 }}>{c.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Account info */}
              {readiness?.account && (
                <div style={{ marginBottom: 10, padding: "7px 9px", background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 7 }}>
                  <p style={{ color: "#6F675E", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>IG Account</p>
                  <p style={{ color: "#4ade80", fontSize: 12, fontWeight: 700 }}>@{readiness.account.username ?? readiness.account.igUserId}</p>
                  <p style={{ color: "#9B9387", fontSize: 9, marginTop: 2 }}>
                    {readiness.account.accountType} · {readiness.account.mediaCount ?? "—"} posts
                  </p>
                </div>
              )}

              {/* Can attempt publish summary */}
              {readiness && (
                <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#6F675E" }}>Can attempt real publish:</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: readiness.canAttemptPublish ? "#4ade80" : "#f87171" }}>
                    {readiness.canAttemptPublish ? "YES" : "NO"}
                  </span>
                  {readiness.missingEnv.length > 0 && (
                    <span style={{ fontSize: 9, color: "#f87171", fontFamily: "monospace" }}>
                      missing: {readiness.missingEnv.join(", ")}
                    </span>
                  )}
                </div>
              )}

              {/* 0-slide hint: viewing a run with no slides yet */}
              {readiness && readiness.mediaPreflight.total === 0 && readiness.runDateUsed && (
                <div style={{ marginBottom: 10, padding: "7px 10px", background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.18)", borderRadius: 7 }}>
                  <p style={{ color: "#FB923C", fontSize: 10 }}>
                    目前檢查的是 {readiness.runDateUsed} run，此 run 尚未生成 slides。
                    請使用「查看最新 8/8 READY Run」切換至已完成的發文包。
                  </p>
                </div>
              )}

              {/* Error */}
              {readiness?.error && (
                <p style={{ color: "#f87171", fontSize: 10, marginBottom: 8 }}>{readiness.error}</p>
              )}

              {/* Trigger button */}
              <button
                onClick={handleCheckReadiness}
                disabled={readinessPending}
                style={{
                  height: 36, paddingLeft: 16, paddingRight: 16, borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: readinessPending ? "#6F675E" : "#CFC7BA",
                  fontSize: 12, fontWeight: 600, cursor: readinessPending ? "not-allowed" : "pointer",
                }}
              >
                {readinessPending ? "檢查中…" : "檢查 Instagram 發布條件"}
              </button>

              {/* Debug info */}
              {readiness?.runIdUsed && (
                <div style={{ marginTop: 10, padding: "6px 9px", background: "rgba(255,255,255,0.02)", borderRadius: 7 }}>
                  <p style={{ color: "#6F675E", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>Readiness Run</p>
                  <p style={{ color: "#9B9387", fontSize: 9, fontFamily: "monospace" }}>
                    {readiness.runDateUsed} / {readiness.runIdUsed.slice(0, 8)}…
                  </p>
                  <p style={{ color: "#6F675E", fontSize: 9, marginTop: 2 }}>
                    Slides: {readiness.mediaPreflight.total} · Public: {readiness.mediaPreflight.publicCount}
                    {readiness.fallbackUsed ? " · Fallback: true（today's run）" : ""}
                  </p>
                </div>
              )}
            </SectionCard>

            {/* Meta / Instagram Setup Panel */}
            {(() => {
              const envRows: Array<{ label: string; checkKey: string; required: boolean }> = [
                { label: "META_ACCESS_TOKEN", checkKey: "meta_access_token", required: true },
                { label: "META_IG_USER_ID", checkKey: "meta_ig_user_id", required: true },
                { label: "META_PAGE_ID", checkKey: "meta_page_id", required: false },
                { label: "META_GRAPH_API_VERSION", checkKey: "meta_graph_api_version", required: false },
                { label: "PHOENIX_AUTO_PUBLISH_ENABLED", checkKey: "auto_publish_enabled", required: false },
              ];
              const setupSteps = [
                "確認 Instagram 帳號是 Professional account（Business 或 Creator）",
                "確認 Instagram 已連到 Facebook Page",
                "到 Meta Developer → Graph API Explorer 取得 User Access Token（需要 instagram_basic 和 instagram_content_publish 權限）",
                "在 Instagram 設定 → 關於此帳號 取得 IG User ID",
                "將 META_ACCESS_TOKEN、META_IG_USER_ID、META_PAGE_ID、META_GRAPH_API_VERSION=v23.0 填入 .env.local",
                "重新啟動 dev server（npm run dev）",
                "回到本頁按「測試 Meta / IG 帳號讀取」確認連線",
              ];
              const graphCheck = readiness?.checks.find((c) => c.key === "graph_api_read");
              const autoPublishCheck = readiness?.checks.find((c) => c.key === "auto_publish_enabled");
              const isAutoPublishOn = autoPublishCheck?.status === "warning"; // warning = enabled = dangerous

              return (
                <SectionCard title="Meta / Instagram Setup">
                  {/* Env status table */}
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ color: "#6F675E", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>環境變數</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {envRows.map(({ label, checkKey, required }) => {
                        const check = readiness?.checks.find((c) => c.key === checkKey);
                        const status = check?.status;
                        const color =
                          status === "pass" ? "#4ade80"
                          : status === "fail" ? "#f87171"
                          : status === "warning" ? "#FB923C"
                          : "#6F675E";
                        const statusLabel =
                          status === "pass" ? "exists"
                          : status === "fail" ? "missing"
                          : status === "warning" ? (checkKey === "auto_publish_enabled" ? "enabled" : "not set")
                          : "—";
                        return (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <span style={{ color: "#CFC7BA", fontSize: 10, fontFamily: "monospace" }}>{label}</span>
                            <span style={{ color, fontSize: 9, fontWeight: 700 }}>
                              {statusLabel}{required && status === "fail" ? " *" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ color: "#6F675E", fontSize: 9, marginTop: 5 }}>* 必填 · — 尚未檢查（請按按鈕）</p>
                  </div>

                  {/* PHOENIX_AUTO_PUBLISH_ENABLED safety notice */}
                  <div style={{ marginBottom: 14, padding: "8px 10px", borderRadius: 8, background: isAutoPublishOn ? "rgba(239,68,68,0.07)" : "rgba(74,222,128,0.05)", border: `1px solid ${isAutoPublishOn ? "rgba(239,68,68,0.20)" : "rgba(74,222,128,0.15)"}` }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: isAutoPublishOn ? "#f87171" : "#4ade80" }}>
                      {isAutoPublishOn
                        ? "PHOENIX_AUTO_PUBLISH_ENABLED=true — 危險：20:00 cron 會真的發文到 Instagram。先在 .env.local 設回 false。"
                        : "PHOENIX_AUTO_PUBLISH_ENABLED=false — 安全。20:00 cron 為 dry-run，不會真的發文。填妥 Meta env 後可測試帳號連線。"}
                    </p>
                  </div>

                  {/* Setup steps */}
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ color: "#6F675E", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>設定步驟</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {setupSteps.map((step, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <span style={{ color: "#FB923C", fontSize: 9, fontWeight: 700, flexShrink: 0, width: 14 }}>{i + 1}.</span>
                          <p style={{ color: "#9B9387", fontSize: 10, lineHeight: 1.5 }}>{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Read test result */}
                  {readiness?.account && (
                    <div style={{ marginBottom: 12, padding: "8px 10px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.18)", borderRadius: 8 }}>
                      <p style={{ color: "#6F675E", fontSize: 9, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5 }}>IG 帳號驗證成功</p>
                      <p style={{ color: "#4ade80", fontSize: 14, fontWeight: 700, marginBottom: 2 }}>@{readiness.account.username}</p>
                      <p style={{ color: "#9B9387", fontSize: 10 }}>
                        {readiness.account.accountType ?? "—"} · {readiness.account.mediaCount ?? "—"} posts
                      </p>
                    </div>
                  )}
                  {readiness && !readiness.account && graphCheck?.status === "fail" && (
                    <div style={{ marginBottom: 12, padding: "8px 10px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 8 }}>
                      <p style={{ color: "#f87171", fontSize: 10, fontWeight: 600, marginBottom: 4 }}>Graph API Read 失敗</p>
                      <p style={{ color: "#9B9387", fontSize: 10, lineHeight: 1.5 }}>{graphCheck.message}</p>
                    </div>
                  )}
                  {readiness && !readiness.account && graphCheck?.status !== "fail" && !readiness.checks.find(c => c.key === "meta_access_token" && c.status === "pass") && (
                    <div style={{ marginBottom: 12, padding: "7px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 7 }}>
                      <p style={{ color: "#6F675E", fontSize: 10 }}>META_ACCESS_TOKEN 和 META_IG_USER_ID 填妥後即可測試帳號連線。</p>
                    </div>
                  )}

                  {/* Button — shares readiness state */}
                  <button
                    onClick={handleCheckReadiness}
                    disabled={readinessPending}
                    style={{
                      height: 36, paddingLeft: 16, paddingRight: 16, borderRadius: 8,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      color: readinessPending ? "#6F675E" : "#CFC7BA",
                      fontSize: 12, fontWeight: 600, cursor: readinessPending ? "not-allowed" : "pointer",
                    }}
                  >
                    {readinessPending ? "測試中…" : "測試 Meta / IG 帳號讀取"}
                  </button>
                </SectionCard>
              );
            })()}

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
          <p style={{ color: "#6F675E", fontSize: 10, marginBottom: 10 }}>Debug only. 03:00 calls OpenAI. 17:00 calls OpenAI（keyframe）+ Runway（motion）— 消耗 credit。20:00 calls Instagram only if PHOENIX_AUTO_PUBLISH_ENABLED=true + META env complete。不呼叫 LINE。</p>
          {/* Stuck state warning */}
          {run && run.status === "ideas_generating" && (!details || details.candidates.length === 0) && (
            <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.22)", borderRadius: 9 }}>
              <p style={{ color: "#FB923C", fontSize: 11, fontWeight: 600 }}>⚠ 主題生成可能卡住，請使用「重新產生今日 5 個主題候選（Debug）」</p>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(
              [
                { type: "ideas" as const, label: "測試 03:00 主題候選 Cron", locked: false },
                { type: "generate" as const, label: "測試 17:00 生成 Cron", locked: run?.status === "generating" || run?.status === "generation_queued" },
                { type: "publish" as const, label: "測試 20:00 發布 Cron", locked: false },
              ] as const
            ).map(({ type, label, locked }) => (
              <button
                key={type}
                onClick={() => !locked && handleTestCron(type)}
                disabled={cronPending !== null || locked}
                style={{
                  height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 9,
                  background: cronPending === type ? "rgba(255,255,255,0.06)" : locked ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${locked ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.10)"}`,
                  color: cronPending === type ? "#9B9387" : locked ? "#f87171" : "#CFC7BA",
                  fontSize: 12, fontWeight: 600, cursor: cronPending !== null || locked ? "not-allowed" : "pointer",
                  textAlign: "left",
                }}
              >
                {cronPending === type ? "執行中…" : locked ? `${label}（生成中 — 鎖定）` : label}
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
