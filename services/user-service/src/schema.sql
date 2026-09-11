-- user-service owns exactly these four tables. No other service is allowed
-- to read or write this database directly — cross-service access only
-- happens over HTTP, once these are wired up.

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS business_profiles (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_type TEXT NOT NULL,
  category      TEXT NOT NULL,
  budget        INTEGER NOT NULL,
  country       TEXT NOT NULL,
  state         TEXT NOT NULL,
  city          TEXT NOT NULL,
  experience    TEXT NOT NULL,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  level          INTEGER NOT NULL DEFAULT 1,
  xp             INTEGER NOT NULL DEFAULT 0,
  last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS completed_steps (
  id           TEXT PRIMARY KEY,
  progress_id  TEXT NOT NULL REFERENCES progress(id) ON DELETE CASCADE,
  step_id      TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (progress_id, step_id)
);
