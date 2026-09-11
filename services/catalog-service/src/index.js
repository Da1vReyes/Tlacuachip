import express from "express";
import cors from "cors";
import { db } from "./db.js";
import { seedIfEmpty } from "./seed.js";

seedIfEmpty();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4200;

function rowToStep(row) {
  return {
    id: row.id,
    level: row.level,
    title: row.title,
    description: row.description,
    category: row.category,
    xp: row.xp,
    detail: {
      summary: row.summary,
      instructions: JSON.parse(row.instructions),
      officialLink: row.official_label && row.official_url ? { label: row.official_label, url: row.official_url } : null,
      hasCost: Boolean(row.has_cost),
      estimatedCost: row.estimated_cost,
      canDoOnline: Boolean(row.can_do_online),
      connectTo: JSON.parse(row.connect_to),
    },
  };
}

app.get("/", (_req, res) => {
  res.json({
    name: "tlacuachic-catalog-service",
    owns: ["roadmap_steps", "mentors", "providers"],
    endpoints: ["GET /api/roadmap-steps", "GET /api/mentors", "GET /api/providers"],
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/roadmap-steps", (_req, res) => {
  const rows = db.prepare("SELECT * FROM roadmap_steps ORDER BY level ASC, rowid ASC").all();
  res.json(rows.map(rowToStep));
});

app.get("/api/mentors", (_req, res) => {
  res.json(db.prepare("SELECT * FROM mentors ORDER BY rowid ASC").all());
});

app.get("/api/providers", (_req, res) => {
  res.json(db.prepare("SELECT * FROM providers ORDER BY rowid ASC").all());
});

app.listen(PORT, () => {
  console.log(`tlacuachic-catalog-service listening on http://localhost:${PORT}`);
});
