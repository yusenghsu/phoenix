-- ─────────────────────────────────────────────────────────────
-- Phoenix Daily Auto-Publishing — Schema Migration
-- Created: 2026-06-29
-- Purpose: Foundation tables for daily automation workflow
--          (topic selection → generation → publish pipeline)
-- ─────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- phoenix_brand_profiles
-- Creator brand identity and content rules.
-- ─────────────────────────────────────────────────────────────

create table if not exists phoenix_brand_profiles (
  id               uuid primary key default uuid_generate_v4(),
  profile_key      text not null unique,
  display_name     text not null,
  role             text not null,
  audience         text not null,
  tone_rules       jsonb not null default '[]',
  content_pillars  jsonb not null default '[]',
  visual_style     jsonb not null default '{}',
  constraints      jsonb not null default '[]',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

insert into phoenix_brand_profiles (
  profile_key, display_name, role, audience, tone_rules, content_pillars, visual_style, constraints
) values (
  'yuseng_teacher',
  '小佑老師',
  '保險業務訓練者 / 富邦人壽訓練組長 / 保險業內容創作者',
  '18-35 歲，保險新人、轉職者、對保險業有興趣但害怕被拒絕的人',
  '["真話", "不迎合", "不雞湯", "有主管視角", "能點破新人盲點", "但不要羞辱新人"]',
  '["新人心態破解", "業務實戰技巧", "保險業真相", "職涯建議"]',
  '{"palette": "dark warm amber", "ratio": "4:5 vertical", "motion": true}',
  '["不要心靈雞湯", "不要標題黨", "不要過度吹捧", "不接 IG API", "不自動發文"]'
) on conflict (profile_key) do update set
  display_name    = excluded.display_name,
  role            = excluded.role,
  audience        = excluded.audience,
  tone_rules      = excluded.tone_rules,
  content_pillars = excluded.content_pillars,
  visual_style    = excluded.visual_style,
  constraints     = excluded.constraints,
  updated_at      = now();

-- ─────────────────────────────────────────────────────────────
-- phoenix_daily_runs
-- One row per calendar day (Taiwan time). Primary workflow record.
-- ─────────────────────────────────────────────────────────────

create table if not exists phoenix_daily_runs (
  id                      uuid primary key default uuid_generate_v4(),
  run_date                date not null unique,
  status                  text not null default 'idle',
  profile_key             text not null default 'yuseng_teacher',
  selected_topic_id       uuid,
  scheduled_idea_at       timestamptz,
  scheduled_generation_at timestamptz,
  scheduled_publish_at    timestamptz,
  started_at              timestamptz,
  finished_at             timestamptz,
  error_code              text,
  error_message           text,
  metadata                jsonb not null default '{}',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists phoenix_daily_runs_date_idx on phoenix_daily_runs (run_date desc);
create index if not exists phoenix_daily_runs_status_idx on phoenix_daily_runs (status);

-- ─────────────────────────────────────────────────────────────
-- phoenix_topic_candidates
-- 5 AI-generated topic options per daily run.
-- ─────────────────────────────────────────────────────────────

create table if not exists phoenix_topic_candidates (
  id              uuid primary key default uuid_generate_v4(),
  run_id          uuid not null references phoenix_daily_runs (id) on delete cascade,
  rank            integer not null,
  title           text not null,
  angle           text,
  reason          text,
  market_signal   jsonb not null default '{}',
  draft_caption   text,
  draft_slides    jsonb not null default '[]',
  status          text not null default 'pending',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists phoenix_topic_candidates_run_idx on phoenix_topic_candidates (run_id);

-- ─────────────────────────────────────────────────────────────
-- phoenix_topic_selections
-- Records which topic was selected and by whom.
-- source: 'line' | 'dashboard' | 'fallback'
-- ─────────────────────────────────────────────────────────────

create table if not exists phoenix_topic_selections (
  id                   uuid primary key default uuid_generate_v4(),
  run_id               uuid not null references phoenix_daily_runs (id) on delete cascade,
  topic_candidate_id   uuid not null references phoenix_topic_candidates (id),
  source               text not null,
  line_user_id         text,
  selected_at          timestamptz not null default now(),
  raw_payload          jsonb not null default '{}'
);

create index if not exists phoenix_topic_selections_run_idx on phoenix_topic_selections (run_id);

-- ─────────────────────────────────────────────────────────────
-- phoenix_carousel_slides
-- Per-slide generation state for each daily run.
-- ─────────────────────────────────────────────────────────────

create table if not exists phoenix_carousel_slides (
  id                             uuid primary key default uuid_generate_v4(),
  run_id                         uuid not null references phoenix_daily_runs (id) on delete cascade,
  slide_no                       integer not null,
  slide_role                     text,
  title_text                     text,
  body_text                      text,
  keyframe_url                   text,
  runway_task_id                 text,
  runway_intermediate_video_url  text,
  final_video_url                text,
  keyframe_status                text not null default 'missing',
  motion_status                  text not null default 'missing',
  provider_ratio_status          text not null default 'unknown',
  final_composition_status       text not null default 'missing',
  final_ratio_status             text not null default 'unknown',
  error_code                     text,
  error_message                  text,
  metadata                       jsonb not null default '{}',
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  unique (run_id, slide_no)
);

create index if not exists phoenix_carousel_slides_run_idx on phoenix_carousel_slides (run_id);

-- ─────────────────────────────────────────────────────────────
-- phoenix_generated_assets
-- Durable references to generated files stored in object storage.
-- IMPORTANT: production must use Supabase Storage (not local public/).
-- Local debug may still write to public/generated for dev convenience.
-- ─────────────────────────────────────────────────────────────

create table if not exists phoenix_generated_assets (
  id              uuid primary key default uuid_generate_v4(),
  run_id          uuid references phoenix_daily_runs (id) on delete cascade,
  slide_id        uuid references phoenix_carousel_slides (id) on delete set null,
  asset_type      text not null,
  storage_bucket  text,
  storage_path    text,
  public_url      text,
  mime_type       text,
  size_bytes      bigint,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists phoenix_generated_assets_run_idx on phoenix_generated_assets (run_id);
create index if not exists phoenix_generated_assets_slide_idx on phoenix_generated_assets (slide_id);

-- ─────────────────────────────────────────────────────────────
-- phoenix_publish_jobs
-- IG (or future platform) publish job per daily run.
-- ─────────────────────────────────────────────────────────────

create table if not exists phoenix_publish_jobs (
  id                  uuid primary key default uuid_generate_v4(),
  run_id              uuid not null references phoenix_daily_runs (id) on delete cascade,
  platform            text not null default 'instagram',
  status              text not null default 'pending',
  scheduled_at        timestamptz,
  published_at        timestamptz,
  platform_media_id   text,
  caption             text,
  error_code          text,
  error_message       text,
  metadata            jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists phoenix_publish_jobs_run_idx on phoenix_publish_jobs (run_id);

-- ─────────────────────────────────────────────────────────────
-- phoenix_line_bindings
-- Maps LINE user IDs to Phoenix brand profiles.
-- ─────────────────────────────────────────────────────────────

create table if not exists phoenix_line_bindings (
  id            uuid primary key default uuid_generate_v4(),
  line_user_id  text not null unique,
  profile_key   text not null,
  display_name  text,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists phoenix_line_bindings_profile_idx on phoenix_line_bindings (profile_key);

-- ─────────────────────────────────────────────────────────────
-- phoenix_job_events
-- Immutable event log for every step in the automation pipeline.
-- Records 03:00 / 17:00 / 20:00 cron runs, LINE selections, IG publishes.
-- ─────────────────────────────────────────────────────────────

create table if not exists phoenix_job_events (
  id         uuid primary key default uuid_generate_v4(),
  run_id     uuid references phoenix_daily_runs (id) on delete set null,
  job_type   text not null,
  status     text not null,
  message    text,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists phoenix_job_events_run_idx on phoenix_job_events (run_id);
create index if not exists phoenix_job_events_created_idx on phoenix_job_events (created_at desc);
