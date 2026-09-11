import { pool } from "./db.js";

const XP_PER_LEVEL = 400;

// ---------- users ----------

export async function createUser({ email, passwordHash, name, role }) {
  const { rows } = await pool.query(
    `INSERT INTO tlacuachic_users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, avatar_url, role, created_at`,
    [email, passwordHash, name ?? null, role ?? "entrepreneur"]
  );
  return rows[0];
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM tlacuachic_users WHERE email = $1", [email]);
  return rows[0] ?? null;
}

export async function replaceUserPassword(userId, passwordHash) {
  await pool.query("UPDATE tlacuachic_users SET password_hash = $2 WHERE id = $1", [userId, passwordHash]);
}

export async function getUserPublic(userId) {
  const { rows } = await pool.query("SELECT id, email, name, avatar_url, role, created_at FROM tlacuachic_users WHERE id = $1", [userId]);
  return rows[0] ?? null;
}

export async function updateUserRole(userId, role) {
  const { rows } = await pool.query(
    "UPDATE tlacuachic_users SET role = $2 WHERE id = $1 RETURNING id, email, name, avatar_url, role, created_at",
    [userId, role]
  );
  return rows[0] ?? null;
}

export async function updateUserProfile(userId, { name, avatarUrl }) {
  const fields = [];
  const values = [userId];
  if (name !== undefined) { values.push(name); fields.push(`name = $${values.length}`); }
  if (avatarUrl !== undefined) { values.push(avatarUrl); fields.push(`avatar_url = $${values.length}`); }
  if (fields.length === 0) return getUserPublic(userId);
  const { rows } = await pool.query(
    `UPDATE tlacuachic_users SET ${fields.join(", ")} WHERE id = $1 RETURNING id, email, name, avatar_url, role, created_at`,
    values
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

// ---------- community + direct contact ----------

function publicCommunityRow(row) {
  return {
    id: row.id,
    parentId: row.parent_id,
    body: row.body,
    createdAt: row.created_at,
    // Private community participation remains possible, but never exposes a
    // name merely because the post can be read by other signed-in members.
    author: row.visibility === "private" ? "Miembro de Tlacuachic" : row.author_name || "Emprendedor/a",
    businessType: row.visibility === "private" ? "Miembro de Tlacuachic" : row.business_type || "Emprendimiento",
    location: row.visibility === "profile" ? [row.city, row.state].filter(Boolean).join(", ") || "México" : "Ubicación reservada",
  };
}

export async function listCommunityPosts() {
  const { rows } = await pool.query(
    `SELECT p.*, u.name AS author_name, bp.business_type, bp.city, bp.state, pref.visibility
       FROM tlacuachic_community_posts p
       JOIN tlacuachic_users u ON u.id = p.author_id
       LEFT JOIN tlacuachic_business_profiles bp ON bp.user_id = p.author_id
       LEFT JOIN tlacuachic_preferences pref ON pref.user_id = p.author_id
       ORDER BY p.created_at DESC LIMIT 100`
  );
  return rows.map(publicCommunityRow);
}

export async function createCommunityPost(userId, body, parentId = null) {
  const text = body.trim();
  if (!text || text.length > 1200) throw new Error("invalid_community_message");
  if (parentId) {
    const exists = await pool.query("SELECT 1 FROM tlacuachic_community_posts WHERE id = $1", [parentId]);
    if (exists.rowCount === 0) throw new Error("parent_post_not_found");
  }
  const { rows } = await pool.query(
    "INSERT INTO tlacuachic_community_posts (author_id, parent_id, body) VALUES ($1, $2, $3) RETURNING *",
    [userId, parentId, text]
  );
  const post = rows[0];
  const profile = await getBusinessProfile(userId);
  const preferences = await getPreferences(userId);
  const user = await getUserPublic(userId);
  return publicCommunityRow({ ...post, author_name: user?.name, business_type: profile?.business_type, city: profile?.city, state: profile?.state, visibility: preferences.visibility });
}

export async function startConversation(entrepreneurId, providerId, providerCatalogId, body) {
  const text = body.trim();
  if (!text || text.length > 1200) throw new Error("invalid_message");
  const { rows } = await pool.query(
    `INSERT INTO tlacuachic_conversations (entrepreneur_id, provider_id, provider_catalog_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (entrepreneur_id, provider_id) DO UPDATE SET provider_catalog_id = EXCLUDED.provider_catalog_id
     RETURNING *`,
    [entrepreneurId, providerId, providerCatalogId]
  );
  // Keep the first note private until the provider accepts the request. It
  // stays encrypted-at-rest by the DB connection and is never returned in a
  // pending request payload.
  const alreadyHasMessage = await pool.query("SELECT 1 FROM tlacuachic_conversation_messages WHERE conversation_id = $1", [rows[0].id]);
  if (alreadyHasMessage.rowCount === 0) await pool.query(
    "INSERT INTO tlacuachic_conversation_messages (conversation_id, sender_id, body) VALUES ($1, $2, $3)",
    [rows[0].id, entrepreneurId, text]
  );
  return rows[0];
}

export async function listConversations(userId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.entrepreneur_id, c.provider_id, c.provider_catalog_id, c.status, c.team_status, c.created_at,
       pref.visibility, business.category, business.city,
       CASE WHEN c.entrepreneur_id = $1 THEN provider.name
            WHEN COALESCE(pref.visibility, 'business') = 'profile' THEN entrepreneur.name
            ELSE 'Emprendedor/a' END AS counterpart_name,
       CASE WHEN c.entrepreneur_id = $1 THEN 'provider' ELSE 'entrepreneur' END AS counterpart_role
       FROM tlacuachic_conversations c
       JOIN tlacuachic_users entrepreneur ON entrepreneur.id = c.entrepreneur_id
       JOIN tlacuachic_users provider ON provider.id = c.provider_id
       LEFT JOIN tlacuachic_preferences pref ON pref.user_id = c.entrepreneur_id
       LEFT JOIN tlacuachic_business_profiles business ON business.user_id = c.entrepreneur_id
       WHERE c.entrepreneur_id = $1 OR c.provider_id = $1
       ORDER BY c.created_at DESC`,
    [userId]
  );
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const { rows: messages } = await pool.query(
    `SELECT id, conversation_id, sender_id, body, created_at
       FROM tlacuachic_conversation_messages
       WHERE conversation_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
    [ids]
  );
  return rows.map((row) => ({
    id: row.id,
    providerCatalogId: row.provider_catalog_id,
    counterpart: { name: row.counterpart_name, role: row.counterpart_role },
    status: row.status,
    teamStatus: row.team_status,
    request: row.provider_id === userId && row.status === "pending" ? {
      category: row.visibility === "private" ? null : row.category ?? null,
      city: row.visibility === "private" ? null : row.city ?? null,
    } : null,
    createdAt: row.created_at,
    messages: (row.provider_id === userId && row.status === "pending" ? [] : messages.filter((message) => message.conversation_id === row.id)).map((message) => ({
      id: message.id,
      body: message.body,
      sentByMe: message.sender_id === userId,
      createdAt: message.created_at,
    })),
  }));
}

export async function inviteConversationToTeam(userId, conversationId) {
  const { rows } = await pool.query(
    "UPDATE tlacuachic_conversations SET team_status = 'invited' WHERE id = $1 AND entrepreneur_id = $2 AND status = 'accepted' AND team_status = 'none' RETURNING id, team_status",
    [conversationId, userId]
  );
  if (!rows[0]) throw new Error("team_invite_not_available");
  return { id: rows[0].id, teamStatus: rows[0].team_status };
}

export async function acceptTeamInvite(userId, conversationId) {
  const { rows } = await pool.query(
    "UPDATE tlacuachic_conversations SET team_status = 'active' WHERE id = $1 AND provider_id = $2 AND status = 'accepted' AND team_status = 'invited' RETURNING id, team_status",
    [conversationId, userId]
  );
  if (!rows[0]) throw new Error("team_invite_not_available");
  return { id: rows[0].id, teamStatus: rows[0].team_status };
}

export async function listWorkspace(userId) {
  const { rows } = await pool.query(
    `SELECT c.id AS conversation_id, c.provider_catalog_id, c.entrepreneur_id, c.provider_id,
       CASE WHEN c.entrepreneur_id = $1 THEN provider.name ELSE entrepreneur.name END AS collaborator_name,
       CASE WHEN c.entrepreneur_id = $1 THEN 'provider' ELSE 'entrepreneur' END AS collaborator_role
       FROM tlacuachic_conversations c
       JOIN tlacuachic_users entrepreneur ON entrepreneur.id = c.entrepreneur_id
       JOIN tlacuachic_users provider ON provider.id = c.provider_id
       WHERE (c.entrepreneur_id = $1 OR c.provider_id = $1) AND c.team_status = 'active'
       ORDER BY c.created_at DESC`, [userId]
  );
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.conversation_id);
  const { rows: tasks } = await pool.query(
    "SELECT id, conversation_id, title, description, due_date, completed, created_at FROM tlacuachic_workspace_items WHERE conversation_id = ANY($1::uuid[]) ORDER BY due_date NULLS LAST, created_at ASC", [ids]
  );
  const { rows: files } = await pool.query(
    "SELECT id, conversation_id, file_name, mime_type, content, created_at FROM tlacuachic_workspace_files WHERE conversation_id = ANY($1::uuid[]) ORDER BY created_at DESC", [ids]
  );
  return rows.map((row) => ({
    conversationId: row.conversation_id,
    providerCatalogId: row.provider_catalog_id,
    collaborator: { name: row.collaborator_name, role: row.collaborator_role },
    tasks: tasks.filter((task) => task.conversation_id === row.conversation_id).map((task) => ({ id: task.id, title: task.title, description: task.description, dueDate: task.due_date, completed: task.completed, createdAt: task.created_at })),
    files: files.filter((file) => file.conversation_id === row.conversation_id).map((file) => ({ id: file.id, name: file.file_name, mimeType: file.mime_type, dataUrl: `data:${file.mime_type};base64,${file.content.toString("base64")}`, createdAt: file.created_at })),
  }));
}

export async function createWorkspaceItem(userId, conversationId, input) {
  const title = typeof input?.title === "string" ? input.title.trim().slice(0, 160) : "";
  const description = typeof input?.description === "string" ? input.description.trim().slice(0, 800) || null : null;
  const dueDate = typeof input?.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) ? input.dueDate : null;
  if (!title) throw new Error("invalid_workspace_item");
  const active = await pool.query("SELECT 1 FROM tlacuachic_conversations WHERE id = $1 AND provider_id = $2 AND team_status = 'active'", [conversationId, userId]);
  if (active.rowCount === 0) throw new Error("workspace_not_available");
  const { rows } = await pool.query("INSERT INTO tlacuachic_workspace_items (conversation_id, author_id, title, description, due_date) VALUES ($1,$2,$3,$4,$5) RETURNING *", [conversationId, userId, title, description, dueDate]);
  return rows[0];
}

export async function completeWorkspaceItem(userId, itemId, completed) {
  const { rows } = await pool.query(
    `UPDATE tlacuachic_workspace_items item SET completed = $3
     FROM tlacuachic_conversations c
     WHERE item.id = $1 AND item.conversation_id = c.id AND c.team_status = 'active'
       AND (c.entrepreneur_id = $2 OR c.provider_id = $2)
     RETURNING item.id, item.completed`,
    [itemId, userId, Boolean(completed)]
  );
  if (!rows[0]) throw new Error("workspace_not_available");
  return { id: rows[0].id, completed: rows[0].completed };
}

export async function uploadWorkspaceFile(userId, conversationId, input) {
  const name = typeof input?.name === "string" ? input.name.trim().replace(/[\\/]/g, "_").slice(0, 120) : "";
  const mimeType = input?.mimeType === "text/csv" ? "text/csv" : "";
  const encoded = typeof input?.contentBase64 === "string" ? input.contentBase64 : "";
  // CSV is the first deliberate vertical. It keeps this demo useful without
  // pretending that arbitrary uploads are already a secure document vault.
  if (!name || !name.toLowerCase().endsWith(".csv") || !mimeType || !/^[A-Za-z0-9+/=]+$/.test(encoded)) throw new Error("invalid_workspace_file");
  const content = Buffer.from(encoded, "base64");
  if (content.length === 0 || content.length > 250_000) throw new Error("invalid_workspace_file");
  const active = await pool.query("SELECT 1 FROM tlacuachic_conversations WHERE id = $1 AND provider_id = $2 AND team_status = 'active'", [conversationId, userId]);
  if (active.rowCount === 0) throw new Error("workspace_not_available");
  const { rows } = await pool.query(
    "INSERT INTO tlacuachic_workspace_files (conversation_id, uploader_id, file_name, mime_type, content) VALUES ($1,$2,$3,$4,$5) RETURNING id, file_name, mime_type, content, created_at",
    [conversationId, userId, name, mimeType, content]
  );
  return { id: rows[0].id, name: rows[0].file_name, mimeType: rows[0].mime_type, dataUrl: `data:${rows[0].mime_type};base64,${rows[0].content.toString("base64")}`, createdAt: rows[0].created_at };
}

export async function acceptConversation(userId, conversationId) {
  const { rows } = await pool.query(
    "UPDATE tlacuachic_conversations SET status = 'accepted' WHERE id = $1 AND provider_id = $2 AND status = 'pending' RETURNING id",
    [conversationId, userId]
  );
  if (!rows[0]) throw new Error("conversation_not_pending");
  return { id: rows[0].id, status: "accepted" };
}

export async function addConversationMessage(userId, conversationId, body) {
  const text = body.trim();
  if (!text || text.length > 1200) throw new Error("invalid_message");
  const owns = await pool.query(
    "SELECT 1 FROM tlacuachic_conversations WHERE id = $1 AND status = 'accepted' AND (entrepreneur_id = $2 OR provider_id = $2)",
    [conversationId, userId]
  );
  if (owns.rowCount === 0) throw new Error("conversation_not_found");
  const { rows } = await pool.query(
    "INSERT INTO tlacuachic_conversation_messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING id, body, created_at",
    [conversationId, userId, text]
  );
  return { id: rows[0].id, body: rows[0].body, sentByMe: true, createdAt: rows[0].created_at };
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
