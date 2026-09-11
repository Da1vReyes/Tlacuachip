-- catalog-service owns these three tables: reference data other services
-- (and eventually the web app) read but never write directly over HTTP.

CREATE TABLE IF NOT EXISTS roadmap_steps (
  id             TEXT PRIMARY KEY,
  level          INTEGER NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  category       TEXT NOT NULL,
  xp             INTEGER NOT NULL,
  summary        TEXT NOT NULL,
  instructions   TEXT NOT NULL,   -- JSON-encoded string[]
  official_label TEXT,
  official_url   TEXT,
  has_cost       INTEGER NOT NULL,
  estimated_cost TEXT,
  can_do_online  INTEGER NOT NULL,
  connect_to     TEXT NOT NULL    -- JSON-encoded string[] ("mentores" | "proveedores")
);

CREATE TABLE IF NOT EXISTS mentors (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  expertise         TEXT NOT NULL,
  businesses_opened INTEGER NOT NULL,
  location          TEXT NOT NULL,
  rating            REAL NOT NULL,
  avatar_color      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS providers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  type        TEXT NOT NULL,
  location    TEXT NOT NULL,
  rating      REAL NOT NULL,
  description TEXT NOT NULL
);
