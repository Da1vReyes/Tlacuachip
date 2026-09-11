-- user-service owns these tables in the shared Postgres database. Every
-- table is prefixed tlacuachic_ so this never collides with tables other
-- projects keep in the same database (this instance already had one:
-- `estudiante`, untouched by anything here).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tlacuachic_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'entrepreneur' CHECK (role IN ('entrepreneur', 'provider')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tlacuachic_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- A conversation only starts after an entrepreneur explicitly writes to a
-- provider. Neither email nor exact budget is copied into these tables.
CREATE TABLE IF NOT EXISTS tlacuachic_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id UUID NOT NULL REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  provider_catalog_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  team_status TEXT NOT NULL DEFAULT 'none' CHECK (team_status IN ('none', 'invited', 'active')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entrepreneur_id, provider_id)
);

ALTER TABLE tlacuachic_conversations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE tlacuachic_conversations ADD COLUMN IF NOT EXISTS team_status TEXT NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS tlacuachic_workspace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES tlacuachic_conversations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description TEXT,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspace files are deliberately small, scoped to an accepted collaboration,
-- and only stored for the prototype. A production deployment should move the
-- bytes to object storage with signed URLs and malware scanning.
CREATE TABLE IF NOT EXISTS tlacuachic_workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES tlacuachic_conversations(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  content BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tlacuachic_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES tlacuachic_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tlacuachic_community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES tlacuachic_community_posts(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tlacuachic_business_profiles (
  user_id       UUID PRIMARY KEY REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  business_type TEXT NOT NULL,
  category      TEXT NOT NULL,
  budget        INTEGER NOT NULL,
  country       TEXT NOT NULL,
  state         TEXT NOT NULL,
  city          TEXT NOT NULL,
  experience    TEXT NOT NULL,
  description   TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The full ReportData blob (numbers + insights + source + sources) as
-- JSONB. It's generated wholesale by server/src/report.js and never
-- partially edited, so one JSON column is the honest shape — no need to
-- normalize insights/sources into their own tables.
CREATE TABLE IF NOT EXISTS tlacuachic_reports (
  user_id    UUID PRIMARY KEY REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tlacuachic_progress (
  user_id        UUID PRIMARY KEY REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  level          INTEGER NOT NULL DEFAULT 1,
  xp             INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tlacuachic_completed_steps (
  user_id      UUID NOT NULL REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  step_id      TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, step_id)
);

CREATE TABLE IF NOT EXISTS tlacuachic_preferences (
  user_id             UUID PRIMARY KEY REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  visibility          TEXT NOT NULL DEFAULT 'business' CHECK (visibility IN ('private', 'business', 'profile')),
  location_precision  TEXT NOT NULL DEFAULT 'city' CHECK (location_precision IN ('city', 'zone')),
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  selected_zone_id    TEXT,
  location_mode       TEXT CHECK (location_mode IS NULL OR location_mode IN ('explore', 'existing')),
  tutorial_seen       BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS tlacuachic_provider_profiles (
  user_id     UUID PRIMARY KEY REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL,
  is_ai       BOOLEAN NOT NULL DEFAULT false,
  city        TEXT NOT NULL,
  country     TEXT NOT NULL,
  description TEXT NOT NULL,
  helps_with  JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Providers an entrepreneur saved to "Mi equipo". provider_id references
-- the seed catalog in web/src/data/mockData.ts for now (see AGENTS.md
-- "Known gaps" — the real provider roster isn't wired to a catalog service
-- yet), not a row in provider_profiles.
CREATE TABLE IF NOT EXISTS tlacuachic_team_providers (
  user_id     UUID NOT NULL REFERENCES tlacuachic_users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider_id)
);
