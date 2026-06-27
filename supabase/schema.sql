-- ─────────────────────────────────────────────────────────────
-- Phoenix Personal — Supabase Schema
-- V2 Data Foundation
-- ─────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- users
-- Stores Phoenix creator accounts.
-- ─────────────────────────────────────────────────────────────

create table if not exists users (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null unique,
  name        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists users_email_idx on users (email);

-- ─────────────────────────────────────────────────────────────
-- creator_dna
-- Phoenix's memory of the creator's brand, voice, and rules.
-- One record per user. Updated when creator teaches Phoenix.
-- ─────────────────────────────────────────────────────────────

create table if not exists creator_dna (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references users (id) on delete cascade,
  brand_voice        text,
  content_goal       text,
  content_formula    text,
  -- e.g. [{"label": "觀點", "pct": 50}, {"label": "爆點", "pct": 30}]
  content_ratio      jsonb default '[]',
  -- e.g. ["心靈雞湯", "標題黨"]
  avoid_list         jsonb default '[]',
  design_dna         text,
  -- e.g. ["如果題目有流量但不符品牌，Phoenix 可以否決。"]
  decision_rules     jsonb default '[]',
  -- e.g. ["退休", "AI", "保險觀念"]
  topic_preferences  jsonb default '[]',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index if not exists creator_dna_user_idx on creator_dna (user_id);

-- ─────────────────────────────────────────────────────────────
-- instagram_accounts
-- Stores connected Instagram account metadata and auth token.
-- ─────────────────────────────────────────────────────────────

create table if not exists instagram_accounts (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references users (id) on delete cascade,
  instagram_user_id       text not null,
  username                text,
  -- "creator" or "business"
  account_type            text,
  -- token must be encrypted before storing in production
  access_token_encrypted  text,
  connected_at            timestamptz,
  revoked_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists instagram_accounts_user_idx on instagram_accounts (user_id);

-- ─────────────────────────────────────────────────────────────
-- instagram_posts
-- Historical Instagram posts imported for analysis.
-- Used by the decision engine to understand content rhythm
-- and past performance.
-- ─────────────────────────────────────────────────────────────

create table if not exists instagram_posts (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references users (id) on delete cascade,
  instagram_account_id  uuid not null references instagram_accounts (id) on delete cascade,
  instagram_post_id     text not null unique,
  -- "carousel", "image", "video", "reel"
  post_type             text,
  caption               text,
  permalink             text,
  posted_at             timestamptz,
  -- e.g. {"saves": 120, "shares": 45, "reach": 3400, "engagement_rate": 0.04}
  metrics               jsonb default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists instagram_posts_user_idx  on instagram_posts (user_id);
create index if not exists instagram_posts_date_idx  on instagram_posts (posted_at desc);

-- ─────────────────────────────────────────────────────────────
-- daily_decisions
-- The core decision Phoenix makes each morning at 03:00.
-- One record per user per day.
-- ─────────────────────────────────────────────────────────────

create table if not exists daily_decisions (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references users (id) on delete cascade,
  decision_date     date not null,
  selected_topic    text,
  confidence_score  integer check (confidence_score between 0 and 100),
  main_judgment     text,
  -- e.g. [{"label": "Market Signal", "score": 84, "text": "..."}]
  decision_factors  jsonb default '[]',
  -- e.g. "如果今天不發，退休系列的品牌記憶會中斷。"
  risk              text,
  -- draft | approved | rejected | scheduled | published
  status            text not null default 'draft',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, decision_date)
);

create index if not exists daily_decisions_user_date_idx on daily_decisions (user_id, decision_date desc);
create index if not exists daily_decisions_status_idx    on daily_decisions (status);

-- ─────────────────────────────────────────────────────────────
-- decision_candidates
-- All topics Phoenix evaluated before selecting the winner.
-- Always kept — never deleted — for transparency and learning.
-- ─────────────────────────────────────────────────────────────

create table if not exists decision_candidates (
  id                 uuid primary key default uuid_generate_v4(),
  daily_decision_id  uuid not null references daily_decisions (id) on delete cascade,
  topic              text not null,
  market_score       integer check (market_score between 0 and 100),
  brand_fit_score    integer check (brand_fit_score between 0 and 100),
  share_score        integer check (share_score between 0 and 100),
  -- "Low" | "Medium" | "High"
  risk_level         text,
  rejected_reason    text,
  selected           boolean not null default false,
  created_at         timestamptz not null default now()
);

create index if not exists decision_candidates_decision_idx on decision_candidates (daily_decision_id);

-- ─────────────────────────────────────────────────────────────
-- carousel_drafts
-- The complete carousel draft for a daily decision.
-- ─────────────────────────────────────────────────────────────

create table if not exists carousel_drafts (
  id                 uuid primary key default uuid_generate_v4(),
  daily_decision_id  uuid not null references daily_decisions (id) on delete cascade,
  title              text,
  caption            text,
  -- e.g. ["#退休規劃", "#人生選擇", "#小佑"]
  hashtags           jsonb default '[]',
  -- "draft" | "approved" | "exported"
  export_status      text not null default 'draft',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists carousel_drafts_decision_idx on carousel_drafts (daily_decision_id);

-- ─────────────────────────────────────────────────────────────
-- carousel_slides
-- Individual slides within a carousel draft.
-- ─────────────────────────────────────────────────────────────

create table if not exists carousel_slides (
  id                  uuid primary key default uuid_generate_v4(),
  carousel_draft_id   uuid not null references carousel_drafts (id) on delete cascade,
  slide_number        integer not null,
  -- "cover" | "two-thought" | "statement" | "dramatic" | "minimal" | "quote" | "closing"
  headline            text,
  body                text,
  -- e.g. {"variant": "cover", "highlight": "20 年後的自由。"}
  design_notes        jsonb default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists carousel_slides_draft_idx on carousel_slides (carousel_draft_id, slide_number);

-- ─────────────────────────────────────────────────────────────
-- publish_jobs
-- Created when a user approves a decision for publishing.
-- Phoenix never creates this automatically without approval.
-- ─────────────────────────────────────────────────────────────

create table if not exists publish_jobs (
  id                 uuid primary key default uuid_generate_v4(),
  daily_decision_id  uuid not null references daily_decisions (id),
  carousel_draft_id  uuid not null references carousel_drafts (id),
  user_id            uuid not null references users (id),
  -- pending | scheduled | published | failed | cancelled
  status             text not null default 'pending',
  scheduled_at       timestamptz,
  published_at       timestamptz,
  force_publish      boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists publish_jobs_user_idx      on publish_jobs (user_id);
create index if not exists publish_jobs_status_idx    on publish_jobs (status);
create index if not exists publish_jobs_scheduled_idx on publish_jobs (scheduled_at);

-- ─────────────────────────────────────────────────────────────
-- learning_logs
-- What Phoenix learned from each decision and result.
-- Records accumulate over time — never overwritten.
-- ─────────────────────────────────────────────────────────────

create table if not exists learning_logs (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references users (id) on delete cascade,
  daily_decision_id  uuid references daily_decisions (id),
  -- "performance" | "brand_fit" | "rhythm" | "topic" | "decision_rule"
  learning_type      text,
  summary            text not null,
  -- raw signal data that triggered this learning
  signal_data        jsonb default '{}',
  created_at         timestamptz not null default now()
);

create index if not exists learning_logs_user_idx     on learning_logs (user_id);
create index if not exists learning_logs_decision_idx on learning_logs (daily_decision_id);

-- ─────────────────────────────────────────────────────────────
-- TODO: Enable Row Level Security before production
-- TODO: Add user-scoped policies (each user sees only their data)
-- TODO: Encrypt Instagram access tokens before storing
-- ─────────────────────────────────────────────────────────────
