// Daily workflow service — server-side only.
// Wraps all Supabase interactions for the Phoenix daily automation pipeline.
// Never import this in client components.
import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import type {
  DailyRun,
  DailyRunStatus,
  TopicCandidate,
  TopicSelection,
  CarouselSlide,
  GeneratedAsset,
  PublishJob,
  JobEvent,
  CreateTopicCandidateInput,
  CreateOrUpdateSlideInput,
  CreateGeneratedAssetInput,
  CreatePublishJobInput,
  LogJobEventInput,
  TopicSelectionSource,
} from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTaiwanDateString(date?: Date): string {
  const d = date ?? new Date();
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
}

function requireClient() {
  const client = createServerClient();
  if (!client) throw new Error("Supabase client unavailable — check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  return client;
}

// ── Daily Run ─────────────────────────────────────────────────────────────────

export async function getOrCreateDailyRun(runDate: string): Promise<DailyRun> {
  const db = requireClient();

  const { data: existing } = await db
    .from("phoenix_daily_runs")
    .select("*")
    .eq("run_date", runDate)
    .single();

  if (existing) return existing as DailyRun;

  const { data: created, error } = await db
    .from("phoenix_daily_runs")
    .insert({
      run_date: runDate,
      status: "idle",
      profile_key: "yuseng_teacher",
      metadata: {},
    })
    .select()
    .single();

  if (error || !created) throw new Error(`Failed to create daily run: ${error?.message}`);
  return created as DailyRun;
}

export async function getTodayRun(): Promise<DailyRun | null> {
  const db = requireClient();
  const today = getTaiwanDateString();

  const { data } = await db
    .from("phoenix_daily_runs")
    .select("*")
    .eq("run_date", today)
    .single();

  return (data as DailyRun | null) ?? null;
}

export async function updateRunStatus(
  runId: string,
  status: DailyRunStatus,
  metadata?: Record<string, unknown>
): Promise<DailyRun> {
  const db = requireClient();

  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "ideas_generating" || status === "generating" || status === "publishing") {
    updates.started_at = new Date().toISOString();
  }
  if (["published", "failed", "skipped_no_selection", "skipped_not_ready"].includes(status)) {
    updates.finished_at = new Date().toISOString();
  }
  if (metadata) {
    const { data: current } = await db.from("phoenix_daily_runs").select("metadata").eq("id", runId).single();
    updates.metadata = { ...(current?.metadata ?? {}), ...metadata };
  }

  const { data, error } = await db
    .from("phoenix_daily_runs")
    .update(updates)
    .eq("id", runId)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to update run status: ${error?.message}`);
  return data as DailyRun;
}

// ── Force reset for debug regeneration ───────────────────────────────────────

export async function deleteRunCandidates(runId: string): Promise<number> {
  const db = requireClient();
  const { data, error } = await db
    .from("phoenix_topic_candidates")
    .delete()
    .eq("run_id", runId)
    .select("id");
  if (error) throw new Error(`Failed to delete candidates: ${error.message}`);
  return data?.length ?? 0;
}

export async function forceResetRunForRegeneration(runId: string): Promise<DailyRun> {
  const db = requireClient();
  const { data, error } = await db
    .from("phoenix_daily_runs")
    .update({ selected_topic_id: null, status: "idle", updated_at: new Date().toISOString() })
    .eq("id", runId)
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to reset run: ${error?.message}`);
  return data as DailyRun;
}

// ── Topic Candidates ──────────────────────────────────────────────────────────

export async function createTopicCandidates(
  runId: string,
  candidates: CreateTopicCandidateInput[]
): Promise<TopicCandidate[]> {
  const db = requireClient();

  const rows = candidates.map((c) => ({
    run_id: runId,
    rank: c.rank,
    title: c.title,
    angle: c.angle ?? null,
    reason: c.reason ?? null,
    market_signal: c.market_signal ?? {},
    draft_caption: c.draft_caption ?? null,
    draft_slides: c.draft_slides ?? [],
    status: "pending",
  }));

  const { data, error } = await db
    .from("phoenix_topic_candidates")
    .insert(rows)
    .select();

  if (error || !data) throw new Error(`Failed to create topic candidates: ${error?.message}`);
  return data as TopicCandidate[];
}

export async function selectTopic(
  runId: string,
  topicCandidateId: string,
  source: TopicSelectionSource,
  payload?: Record<string, unknown>,
  lineUserId?: string
): Promise<TopicSelection> {
  const db = requireClient();

  const { data, error } = await db
    .from("phoenix_topic_selections")
    .insert({
      run_id: runId,
      topic_candidate_id: topicCandidateId,
      source,
      line_user_id: lineUserId ?? null,
      raw_payload: payload ?? {},
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to record topic selection: ${error?.message}`);

  await db
    .from("phoenix_daily_runs")
    .update({ selected_topic_id: topicCandidateId, status: "selected", updated_at: new Date().toISOString() })
    .eq("id", runId);

  await db
    .from("phoenix_topic_candidates")
    .update({ status: "selected", updated_at: new Date().toISOString() })
    .eq("id", topicCandidateId);

  return data as TopicSelection;
}

export async function getSelectedTopic(runId: string): Promise<TopicCandidate | null> {
  const db = requireClient();

  const { data: run } = await db
    .from("phoenix_daily_runs")
    .select("selected_topic_id")
    .eq("id", runId)
    .single();

  if (!run?.selected_topic_id) return null;

  const { data } = await db
    .from("phoenix_topic_candidates")
    .select("*")
    .eq("id", run.selected_topic_id)
    .single();

  return (data as TopicCandidate | null) ?? null;
}

// ── Carousel Slides ───────────────────────────────────────────────────────────

export async function createOrUpdateSlide(
  runId: string,
  slideNo: number,
  payload: CreateOrUpdateSlideInput
): Promise<CarouselSlide> {
  const db = requireClient();

  const { data: existing } = await db
    .from("phoenix_carousel_slides")
    .select("id")
    .eq("run_id", runId)
    .eq("slide_no", slideNo)
    .single();

  const row = {
    run_id: runId,
    slide_no: slideNo,
    ...payload,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await db
      .from("phoenix_carousel_slides")
      .update(row)
      .eq("id", existing.id)
      .select()
      .single();
    if (error || !data) throw new Error(`Failed to update slide: ${error?.message}`);
    return data as CarouselSlide;
  }

  const { data, error } = await db
    .from("phoenix_carousel_slides")
    .insert(row)
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to create slide: ${error?.message}`);
  return data as CarouselSlide;
}

export async function markSlideStatus(
  runId: string,
  slideNo: number,
  statusPayload: Partial<CreateOrUpdateSlideInput>
): Promise<void> {
  const db = requireClient();
  await db
    .from("phoenix_carousel_slides")
    .update({ ...statusPayload, updated_at: new Date().toISOString() })
    .eq("run_id", runId)
    .eq("slide_no", slideNo);
}

// ── Generated Assets ──────────────────────────────────────────────────────────

export async function createGeneratedAsset(
  payload: CreateGeneratedAssetInput
): Promise<GeneratedAsset> {
  const db = requireClient();

  const { data, error } = await db
    .from("phoenix_generated_assets")
    .insert({
      run_id: payload.run_id ?? null,
      slide_id: payload.slide_id ?? null,
      asset_type: payload.asset_type,
      storage_bucket: payload.storage_bucket ?? null,
      storage_path: payload.storage_path ?? null,
      public_url: payload.public_url ?? null,
      mime_type: payload.mime_type ?? null,
      size_bytes: payload.size_bytes ?? null,
      metadata: payload.metadata ?? {},
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to create generated asset: ${error?.message}`);
  return data as GeneratedAsset;
}

// ── Publish Jobs ──────────────────────────────────────────────────────────────

export async function createPublishJob(
  payload: CreatePublishJobInput
): Promise<PublishJob> {
  const db = requireClient();

  const { data, error } = await db
    .from("phoenix_publish_jobs")
    .insert({
      run_id: payload.run_id,
      platform: payload.platform ?? "instagram",
      status: payload.status ?? "pending",
      scheduled_at: payload.scheduled_at ?? null,
      caption: payload.caption ?? null,
      metadata: payload.metadata ?? {},
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to create publish job: ${error?.message}`);
  return data as PublishJob;
}

// ── Job Events ────────────────────────────────────────────────────────────────

export async function logJobEvent(payload: LogJobEventInput): Promise<JobEvent> {
  const db = requireClient();

  const { data, error } = await db
    .from("phoenix_job_events")
    .insert({
      run_id: payload.run_id ?? null,
      job_type: payload.job_type,
      status: payload.status,
      message: payload.message ?? null,
      payload: payload.payload ?? {},
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to log job event: ${error?.message}`);
  return data as JobEvent;
}

// ── Read helpers for dashboard ────────────────────────────────────────────────

export async function getRunDetails(runId: string): Promise<{
  run: DailyRun;
  candidates: TopicCandidate[];
  slides: CarouselSlide[];
  publishJobs: PublishJob[];
  events: JobEvent[];
}> {
  const db = requireClient();

  const [runRes, candidatesRes, slidesRes, jobsRes, eventsRes] = await Promise.all([
    db.from("phoenix_daily_runs").select("*").eq("id", runId).single(),
    db.from("phoenix_topic_candidates").select("*").eq("run_id", runId).order("rank"),
    db.from("phoenix_carousel_slides").select("*").eq("run_id", runId).order("slide_no"),
    db.from("phoenix_publish_jobs").select("*").eq("run_id", runId).order("created_at"),
    db.from("phoenix_job_events").select("*").eq("run_id", runId).order("created_at", { ascending: false }).limit(50),
  ]);

  if (!runRes.data) throw new Error("Run not found");

  return {
    run: runRes.data as DailyRun,
    candidates: (candidatesRes.data ?? []) as TopicCandidate[],
    slides: (slidesRes.data ?? []) as CarouselSlide[],
    publishJobs: (jobsRes.data ?? []) as PublishJob[],
    events: (eventsRes.data ?? []) as JobEvent[],
  };
}

export { getTaiwanDateString };
