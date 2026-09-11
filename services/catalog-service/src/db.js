import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DB_PATH ?? join(dataDir, "catalog-service.db");
export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);
