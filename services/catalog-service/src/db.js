import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required — copy .env.example to .env and set it.");
}

// Managed Postgres needs TLS; a local one usually doesn't. Skip TLS for
// localhost URLs, or force it either way with DATABASE_SSL=true|false.
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(process.env.DATABASE_URL);
const useSsl = process.env.DATABASE_SSL ? process.env.DATABASE_SSL !== "false" : !isLocal;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
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
