// Domain types for the Phoenix Daily Auto-Publishing Workflow.
// Server-side only — do not import in client components.

// ── Run status machine ────────────────────────────────────────────────────────

export type DailyRunStatus =
  | "idle"
  | "ideas_generating"
  | "ideas_ready"
  | "waiting_for_selection"
  | "selected"
  | "generation_queued"
  | "generating"
  | "ready_to_publish"
  | "publishing"
  | "published"
  | "failed"
  | "skipped_no_selection"
  | "skipped_not_ready";

// ── Slide status types ────────────────────────────────────────────────────────

export type KeyframeStatus = "missing" | "generating" | "generated" | "failed";
export type MotionStatus = "missing" | "generating" | "generated" | "failed";
export type ProviderRatioStatus = "unknown" | "validating" | "accepted_intermediate" | "failed";
export type FinalCompositionStatus = "missing" | "needed" | "composing" | "composed" | "failed";
export type FinalRatioStatus = "unknown" | "passed_4_5";

// ── Topic selection source ────────────────────────────────────────────────────

export type TopicSelectionSource = "line" | "dashboard" | "fallback";

// ── Asset types ───────────────────────────────────────────────────────────────

export type AssetType =
  | "keyframe_png"
  | "runway_intermediate_mp4"
  | "final_slide_mp4"
  | "cover_image"
  | "caption_json";

// ── Publish platform ──────────────────────────────────────────────────────────

export type PublishPlatform = "instagram";
export type PublishStatus =
  | "pending"
  | "queued"
  | "publishing"
  | "published"
  | "failed"
  | "skipped"
  | "dry_run"
  | "dry_run_ready"
  | "dry_run_missing_env"
  | "blocked_local_media_url";

// ── Domain models ─────────────────────────────────────────────────────────────

export interface BrandProfile {
  id: string;
  profile_key: string;
  display_name: string;
  role: string;
  audience: string;
  tone_rules: string[];
  content_pillars: string[];
  visual_style: Record<string, unknown>;
  constraints: string[];
  created_at: string;
  updated_at: string;
}

export interface DailyRun {
  id: string;
  run_date: string;            // "YYYY-MM-DD" Taiwan date
  status: DailyRunStatus;
  profile_key: string;
  selected_topic_id: string | null;
  scheduled_idea_at: string | null;
  scheduled_generation_at: string | null;
  scheduled_publish_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TopicCandidate {
  id: string;
  run_id: string;
  rank: number;
  title: string;
  angle: string | null;
  reason: string | null;
  market_signal: Record<string, unknown>;
  draft_caption: string | null;
  draft_slides: unknown[];
  status: "pending" | "selected" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface TopicSelection {
  id: string;
  run_id: string;
  topic_candidate_id: string;
  source: TopicSelectionSource;
  line_user_id: string | null;
  selected_at: string;
  raw_payload: Record<string, unknown>;
}

export interface CarouselSlide {
  id: string;
  run_id: string;
  slide_no: number;
  slide_role: string | null;
  title_text: string | null;
  body_text: string | null;
  keyframe_url: string | null;
  runway_task_id: string | null;
  runway_intermediate_video_url: string | null;
  final_video_url: string | null;
  keyframe_status: KeyframeStatus;
  motion_status: MotionStatus;
  provider_ratio_status: ProviderRatioStatus;
  final_composition_status: FinalCompositionStatus;
  final_ratio_status: FinalRatioStatus;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GeneratedAsset {
  id: string;
  run_id: string | null;
  slide_id: string | null;
  asset_type: AssetType;
  storage_bucket: string | null;
  storage_path: string | null;
  public_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PublishJob {
  id: string;
  run_id: string;
  platform: PublishPlatform;
  status: PublishStatus;
  scheduled_at: string | null;
  published_at: string | null;
  platform_media_id: string | null;
  caption: string | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LineBinding {
  id: string;
  line_user_id: string;
  profile_key: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobEvent {
  id: string;
  run_id: string | null;
  job_type: string;
  status: string;
  message: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

// ── Input types for service functions ─────────────────────────────────────────

export interface CreateTopicCandidateInput {
  rank: number;
  title: string;
  angle?: string;
  reason?: string;
  market_signal?: Record<string, unknown>;
  draft_caption?: string;
  draft_slides?: unknown[];
}

export interface CreateOrUpdateSlideInput {
  slide_role?: string;
  title_text?: string;
  body_text?: string;
  keyframe_url?: string;
  runway_task_id?: string;
  runway_intermediate_video_url?: string;
  final_video_url?: string;
  keyframe_status?: KeyframeStatus;
  motion_status?: MotionStatus;
  provider_ratio_status?: ProviderRatioStatus;
  final_composition_status?: FinalCompositionStatus;
  final_ratio_status?: FinalRatioStatus;
  error_code?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateGeneratedAssetInput {
  run_id?: string;
  slide_id?: string;
  asset_type: AssetType;
  storage_bucket?: string;
  storage_path?: string;
  public_url?: string;
  mime_type?: string;
  size_bytes?: number;
  metadata?: Record<string, unknown>;
}

export interface CreatePublishJobInput {
  run_id: string;
  platform?: PublishPlatform;
  status?: PublishStatus;
  scheduled_at?: string;
  caption?: string;
  metadata?: Record<string, unknown>;
}

export interface LogJobEventInput {
  run_id?: string;
  job_type: string;
  status: string;
  message?: string;
  payload?: Record<string, unknown>;
}
