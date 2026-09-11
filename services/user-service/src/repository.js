import { pool } from "./db.js";

const XP_PER_LEVEL = 400;

// ---------- users ----------

export async function createUser({ email, passwordHash, name, role }) {
  const { rows } = await pool.query(
    `INSERT INTO tlacuachic_users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role, created_at`,
    [email, passwordHash, name ?? null, role ?? "entrepreneur"]
  );
  return rows[0];
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM tlacuachic_users WHERE email = $1", [email]);
  return rows[0] ?? null;
}

export async function getUserPublic(userId) {
  const { rows } = await pool.query("SELECT id, email, name, role, created_at FROM tlacuachic_users WHERE id = $1", [userId]);
  return rows[0] ?? null;
}

export async function updateUserRole(userId, role) {
  const { rows } = await pool.query(
    "UPDATE tlacuachic_users SET role = $2 WHERE id = $1 RETURNING id, email, name, role, created_at",
    [userId, role]
  );
  return rows[0] ?? null;
}

// ---------- business profile ----------

export async function getBusinessProfile(userId) {
  const { rows } = await pool.query("SELECT * FROM tlacuachic_business_profiles WHERE user_id = $1", [userId]);
  return rows[0] ?? null;
}

export async function upsertBusinessProfile(userId, profile) {
  const { businessType, category, budget, country, state, city, experience, description } = profile;
  const { rows } = await pool.query(
    `INSERT INTO tlacuachic_business_profiles (user_id, business_type, category, budget, country, state, city, experience, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id) DO UPDATE SET
       business_type = EXCLUDED.business_type, category = EXCLUDED.category, budget = EXCLUDED.budget,
       country = EXCLUDED.country, state = EXCLUDED.state, city = EXCLUDED.city,
       experience = EXCLUDED.experience, description = EXCLUDED.description, updated_at = now()
     RETURNING *`,
    [userId, businessType, category, budget, country, state, city, experience, description ?? null]
  );
  return rows[0];
}

// ---------- report ----------

export async function getReport(userId) {
  const { rows } = await pool.query("SELECT data FROM tlacuachic_reports WHERE user_id = $1", [userId]);
  return rows[0]?.data ?? null;
}

export async function saveReport(userId, data) {
  await pool.query(
    `INSERT INTO tlacuachic_reports (user_id, data) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [userId, data]
  );
  return data;
}

// ---------- progress ----------

async function ensureProgress(userId) {
  const { rows } = await pool.query(
    `INSERT INTO tlacuachic_progress (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [userId]
  );
  return rows[0];
}

export async function getProgress(userId) {
  const progress = await ensureProgress(userId);
  const { rows } = await pool.query(
    "SELECT step_id FROM tlacuachic_completed_steps WHERE user_id = $1 ORDER BY completed_at ASC",
    [userId]
  );
  return { ...progress, completedSteps: rows.map((r) => r.step_id) };
}

export async function completeStep(userId, stepId, xpReward) {
  await ensureProgress(userId);
  const inserted = await pool.query(
    `INSERT INTO tlacuachic_completed_steps (user_id, step_id) VALUES ($1, $2)
     ON CONFLICT (user_id, step_id) DO NOTHING
     RETURNING step_id`,
    [userId, stepId]
  );

  if (inserted.rowCount > 0) {
    const current = await pool.query("SELECT xp FROM tlacuachic_progress WHERE user_id = $1", [userId]);
    const newXp = (current.rows[0]?.xp ?? 0) + (xpReward ?? 0);
    const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
    await pool.query(
      "UPDATE tlacuachic_progress SET xp = $2, level = $3, last_active_at = now() WHERE user_id = $1",
      [userId, newXp, newLevel]
    );
  }

  return getProgress(userId);
}

// ---------- preferences ----------

const DEFAULT_PREFERENCES = {
  visibility: "business",
  location_precision: "city",
  onboarding_complete: false,
  selected_zone_id: null,
  location_mode: null,
  tutorial_seen: false,
};

export async function getPreferences(userId) {
  const { rows } = await pool.query(
    `INSERT INTO tlacuachic_preferences (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [userId]
  );
  return rows[0] ?? { user_id: userId, ...DEFAULT_PREFERENCES };
}

export async function updatePreferences(userId, patch) {
  await getPreferences(userId); // ensure row exists
  const fields = [];
  const values = [userId];
  const columnFor = {
    visibility: "visibility",
    locationPrecision: "location_precision",
    onboardingComplete: "onboarding_complete",
    selectedZoneId: "selected_zone_id",
    locationMode: "location_mode",
    tutorialSeen: "tutorial_seen",
  };
  for (const [key, column] of Object.entries(columnFor)) {
    if (patch[key] !== undefined) {
      values.push(patch[key]);
      fields.push(`${column} = $${values.length}`);
    }
  }
  if (fields.length === 0) return getPreferences(userId);
  const { rows } = await pool.query(
    `UPDATE tlacuachic_preferences SET ${fields.join(", ")} WHERE user_id = $1 RETURNING *`,
    values
  );
  return rows[0];
}

// ---------- provider profile ----------

export async function getProviderProfile(userId) {
  const { rows } = await pool.query("SELECT * FROM tlacuachic_provider_profiles WHERE user_id = $1", [userId]);
  return rows[0] ?? null;
}

export async function upsertProviderProfile(userId, profile) {
  const { name, kind, isAI, city, country, description, helpsWith } = profile;
  const { rows } = await pool.query(
    `INSERT INTO tlacuachic_provider_profiles (user_id, name, kind, is_ai, city, country, description, helps_with)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id) DO UPDATE SET
       name = EXCLUDED.name, kind = EXCLUDED.kind, is_ai = EXCLUDED.is_ai, city = EXCLUDED.city,
       country = EXCLUDED.country, description = EXCLUDED.description, helps_with = EXCLUDED.helps_with,
       updated_at = now()
     RETURNING *`,
    [userId, name, kind, Boolean(isAI), city, country, description, JSON.stringify(helpsWith ?? [])]
  );
  return rows[0];
}

// ---------- team (saved providers) ----------

export async function getTeam(userId) {
  const { rows } = await pool.query(
    "SELECT provider_id FROM tlacuachic_team_providers WHERE user_id = $1 ORDER BY saved_at ASC",
    [userId]
  );
  return rows.map((r) => r.provider_id);
}

export async function toggleTeamProvider(userId, providerId) {
  const existing = await pool.query(
    "SELECT 1 FROM tlacuachic_team_providers WHERE user_id = $1 AND provider_id = $2",
    [userId, providerId]
  );
  if (existing.rowCount > 0) {
    await pool.query("DELETE FROM tlacuachic_team_providers WHERE user_id = $1 AND provider_id = $2", [userId, providerId]);
  } else {
    await pool.query("INSERT INTO tlacuachic_team_providers (user_id, provider_id) VALUES ($1, $2)", [userId, providerId]);
  }
  return getTeam(userId);
}

// ---------- full profile bootstrap + delete-everything ----------

export async function getFullProfile(userId) {
  const [user, businessProfile, report, progress, preferences, providerProfile, team] = await Promise.all([
    getUserPublic(userId),
    getBusinessProfile(userId),
    getReport(userId),
    getProgress(userId),
    getPreferences(userId),
    getProviderProfile(userId),
    getTeam(userId),
  ]);
  return { user, businessProfile, report, progress, preferences, providerProfile, team };
}

export async function deleteUser(userId) {
  // ON DELETE CASCADE on every child table handles the rest.
  await pool.query("DELETE FROM tlacuachic_users WHERE id = $1", [userId]);
}
