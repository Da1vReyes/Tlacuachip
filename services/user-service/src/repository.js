import { randomUUID } from "node:crypto";
import { db } from "./db.js";

const XP_PER_LEVEL = 400;

export function upsertUser({ email, name }) {
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (existing) {
    if (name && name !== existing.name) {
      db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, existing.id);
      return { ...existing, name };
    }
    return existing;
  }
  const id = randomUUID();
  db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").run(id, email, name ?? null);
  return getUser(id);
}

export function getUser(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) ?? null;
}

export function getBusinessProfile(userId) {
  return db.prepare("SELECT * FROM business_profiles WHERE user_id = ?").get(userId) ?? null;
}

export function upsertBusinessProfile(userId, profile) {
  const existing = getBusinessProfile(userId);
  const { businessType, category, budget, country, state, city, experience } = profile;
  if (existing) {
    db.prepare(
      `UPDATE business_profiles
       SET business_type = ?, category = ?, budget = ?, country = ?, state = ?, city = ?, experience = ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).run(businessType, category, budget, country, state, city, experience, userId);
  } else {
    db.prepare(
      `INSERT INTO business_profiles (id, user_id, business_type, category, budget, country, state, city, experience)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(randomUUID(), userId, businessType, category, budget, country, state, city, experience);
  }
  return getBusinessProfile(userId);
}

function ensureProgress(userId) {
  let progress = db.prepare("SELECT * FROM progress WHERE user_id = ?").get(userId);
  if (!progress) {
    const id = randomUUID();
    db.prepare("INSERT INTO progress (id, user_id) VALUES (?, ?)").run(id, userId);
    progress = db.prepare("SELECT * FROM progress WHERE user_id = ?").get(userId);
  }
  return progress;
}

export function getProgress(userId) {
  const progress = ensureProgress(userId);
  const completedSteps = db
    .prepare("SELECT step_id FROM completed_steps WHERE progress_id = ? ORDER BY completed_at ASC")
    .all(progress.id)
    .map((r) => r.step_id);
  return { ...progress, completedSteps };
}

export function completeStep(userId, stepId, xpReward) {
  const progress = ensureProgress(userId);
  const already = db
    .prepare("SELECT 1 FROM completed_steps WHERE progress_id = ? AND step_id = ?")
    .get(progress.id, stepId);

  if (!already) {
    db.prepare("INSERT INTO completed_steps (id, progress_id, step_id) VALUES (?, ?, ?)").run(
      randomUUID(),
      progress.id,
      stepId
    );
    const newXp = progress.xp + (xpReward ?? 0);
    const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
    db.prepare(
      "UPDATE progress SET xp = ?, level = ?, last_active_at = datetime('now') WHERE id = ?"
    ).run(newXp, newLevel, progress.id);
  }

  return getProgress(userId);
}
