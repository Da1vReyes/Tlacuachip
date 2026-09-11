import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required — copy e.env.example to e.env and set it.");
}

// Render (and most managed Postgres) terminate TLS with a cert that isn't
// in Node's default trust store for this kind of ad-hoc connection;
// rejectUnauthorized:false keeps the connection encrypted but skips CA
// verification. Fine for a hackathon DB, not for a cert you actually
// need to trust — revisit if this ever holds real user data at scale.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // The hosted demo database has a costly TLS handshake. Keep a small warm
  // pool instead of paying that handshake on every login/profile request.
  min: 1,
  max: 4,
  idleTimeoutMillis: 300_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
});

export async function migrate() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  await pool.query(schema);
}
