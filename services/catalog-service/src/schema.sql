-- catalog-service owns these tables, in the SAME Postgres database as
-- user-service (same DATABASE_URL) but its own tables, prefixed
-- tlacuachic_ like everything else here. No foreign keys back to
-- tlacuachic_users on purpose: catalog-service doesn't do auth and
-- shouldn't need to know that table's shape. tlacuachic_providers.user_id
-- is a loose reference (no FK) populated only via the internal sync route.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tlacuachic_roadmap_steps (
  id             TEXT PRIMARY KEY,
  position       INTEGER NOT NULL,
  level          INTEGER NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  category       TEXT NOT NULL,
  xp             INTEGER NOT NULL,
  summary        TEXT NOT NULL,
  instructions   JSONB NOT NULL DEFAULT '[]'::jsonb,
  applicability  TEXT NOT NULL DEFAULT 'base',
  authority      TEXT NOT NULL DEFAULT '',
  evidence       JSONB NOT NULL DEFAULT '[]'::jsonb,
  official_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  caution        TEXT,
  has_cost       BOOLEAN NOT NULL DEFAULT false,
  estimated_cost TEXT,
  can_do_online  BOOLEAN NOT NULL DEFAULT false,
  connect_to     JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS tlacuachic_mentors (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  expertise         TEXT NOT NULL,
  businesses_opened INTEGER NOT NULL,
  location          TEXT NOT NULL,
  rating            REAL NOT NULL,
  avatar_color      TEXT NOT NULL
);

-- Two kinds of rows here, distinguished by user_id:
--  - user_id IS NULL: seed/demo providers (id like 'p-abogado-1'), shipped
--    so the marketplace isn't empty on day one.
--  - user_id IS NOT NULL: a real account's public provider listing, kept
--    in sync by user-service (PUT /api/providers/:userId, internal-key
--    only) whenever that person saves their provider profile. This is
--    the actual public roster real signups add themselves to.
CREATE TABLE IF NOT EXISTS tlacuachic_providers (
  id          TEXT PRIMARY KEY,
  user_id     UUID UNIQUE,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL,
  is_ai       BOOLEAN NOT NULL DEFAULT false,
  category    TEXT NOT NULL DEFAULT 'general',
  type        TEXT NOT NULL DEFAULT 'servicio' CHECK (type IN ('producto', 'servicio')),
  location    TEXT NOT NULL,
  city        TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'Mexico',
  rating      REAL NOT NULL DEFAULT 5,
  description TEXT NOT NULL,
  helps_with  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
