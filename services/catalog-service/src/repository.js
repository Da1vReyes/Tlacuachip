import { pool } from "./db.js";

function stepRow(r) {
  return {
    id: r.id,
    level: r.level,
    title: r.title,
    description: r.description,
    category: r.category,
    xp: r.xp,
    detail: {
      summary: r.summary,
      instructions: r.instructions,
      applicability: r.applicability,
      authority: r.authority,
      evidence: r.evidence,
      officialLinks: r.official_links,
      caution: r.caution ?? undefined,
      hasCost: r.has_cost,
      estimatedCost: r.estimated_cost ?? undefined,
      canDoOnline: r.can_do_online,
      connectTo: r.connect_to,
    },
  };
}

export async function listRoadmapSteps() {
  const { rows } = await pool.query("SELECT * FROM tlacuachic_roadmap_steps ORDER BY position ASC");
  return rows.map(stepRow);
}

function mentorRow(r) {
  return {
    id: r.id,
    name: r.name,
    expertise: r.expertise,
    businessesOpened: r.businesses_opened,
    location: r.location,
    rating: r.rating,
    avatarColor: r.avatar_color,
  };
}

export async function listMentors() {
  const { rows } = await pool.query("SELECT * FROM tlacuachic_mentors ORDER BY name ASC");
  return rows.map(mentorRow);
}

function providerRow(r) {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    isAI: r.is_ai,
    category: r.category,
    type: r.type,
    location: r.location,
    city: r.city,
    rating: r.rating,
    description: r.description,
    helpsWith: r.helps_with,
  };
}

export async function listProviders() {
  const { rows } = await pool.query("SELECT * FROM tlacuachic_providers ORDER BY created_at ASC");
  return rows.map(providerRow);
}

// profile comes from user-service's validateProviderProfile shape:
// { name, kind, isAI, city, country, description, helpsWith }
export async function upsertProviderForUser(userId, profile) {
  const id = `u-${userId}`;
  const location = `${profile.city}, ${profile.country}`;
  const { rows } = await pool.query(
    `INSERT INTO tlacuachic_providers
       (id, user_id, name, kind, is_ai, category, type, location, city, country, rating, description, helps_with, updated_at)
     VALUES ($1,$2,$3,$4,$5,'general','servicio',$6,$7,$8,5,$9,$10, now())
     ON CONFLICT (user_id) DO UPDATE SET
       name = EXCLUDED.name,
       kind = EXCLUDED.kind,
       is_ai = EXCLUDED.is_ai,
       location = EXCLUDED.location,
       city = EXCLUDED.city,
       country = EXCLUDED.country,
       description = EXCLUDED.description,
       helps_with = EXCLUDED.helps_with,
       updated_at = now()
     RETURNING *`,
    [
      id,
      userId,
      profile.name,
      profile.kind,
      Boolean(profile.isAI),
      location,
      profile.city,
      profile.country,
      profile.description,
      JSON.stringify(profile.helpsWith ?? []),
    ]
  );
  return providerRow(rows[0]);
}

export async function removeProviderForUser(userId) {
  await pool.query("DELETE FROM tlacuachic_providers WHERE user_id = $1", [userId]);
}
