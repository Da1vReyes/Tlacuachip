import express from "express";
import cors from "cors";
import { migrate } from "./db.js";
import { seedIfEmpty } from "./seed.js";
import { listRoadmapSteps, listMentors, listProviders, getProviderOwner, upsertProviderForUser, removeProviderForUser } from "./repository.js";
import { rateLimit } from "./ratelimit.js";

await migrate();
await seedIfEmpty();

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5180,http://127.0.0.1:5173,http://127.0.0.1:5180")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)) }));
app.use(express.json({ limit: "64kb" }));
app.disable("x-powered-by");

const PORT = process.env.PORT || 4200;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const publicLimiter = rateLimit(120);

app.get("/", (_req, res) => {
  res.json({
    name: "tlacuachic-catalog-service",
    owns: ["roadmap_steps", "mentors", "providers"],
    endpoints: [
      "GET /api/roadmap-steps",
      "GET /api/mentors",
      "GET /api/providers",
      "GET /api/internal/providers/:providerId/owner (internal)",
      "PUT /api/providers/:userId (internal, x-internal-key)",
      "DELETE /api/providers/:userId (internal, x-internal-key)",
    ],
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/roadmap-steps", publicLimiter, async (_req, res, next) => {
  try {
    res.json(await listRoadmapSteps());
  } catch (err) {
    next(err);
  }
});

app.get("/api/mentors", publicLimiter, async (_req, res, next) => {
  try {
    res.json(await listMentors());
  } catch (err) {
    next(err);
  }
});

app.get("/api/providers", publicLimiter, async (_req, res, next) => {
  try {
    res.json(await listProviders());
  } catch (err) {
    next(err);
  }
});

// Called by user-service (server-to-server), never by the browser directly —
// that's why this checks a shared secret header instead of a user JWT.
// catalog-service doesn't know what a JWT is; it just trusts whoever holds
// INTERNAL_API_KEY to have already verified the caller owns that userId.
function requireInternalKey(req, res, next) {
  if (!INTERNAL_API_KEY) {
    console.error("[catalog-service] INTERNAL_API_KEY is not set — refusing internal write");
    return res.status(500).json({ error: "internal_key_not_configured" });
  }
  if (req.get("x-internal-key") !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: "invalid_internal_key" });
  }
  next();
}

app.put("/api/providers/:userId", requireInternalKey, async (req, res, next) => {
  try {
    const userId = String(req.params.userId);
    const profile = req.body;
    if (!profile || typeof profile !== "object") return res.status(400).json({ error: "invalid_request" });
    res.json(await upsertProviderForUser(userId, profile));
  } catch (err) {
    next(err);
  }
});

app.get("/api/internal/providers/:providerId/owner", requireInternalKey, async (req, res, next) => {
  try {
    const owner = await getProviderOwner(String(req.params.providerId).slice(0, 80));
    // A demo account is still a real account with an inbox. It is visibly
    // labelled in the browser and exists only to test the end-to-end flow.
    if (!owner || !owner.userId) return res.status(404).json({ error: "provider_not_contactable" });
    res.json(owner);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/providers/:userId", requireInternalKey, async (req, res, next) => {
  try {
    await removeProviderForUser(String(req.params.userId));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "payload_too_large" });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "invalid_json" });
  console.error("[catalog-service] unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

app.listen(PORT, () => {
  console.log(`tlacuachic-catalog-service listening on http://localhost:${PORT}`);
});
