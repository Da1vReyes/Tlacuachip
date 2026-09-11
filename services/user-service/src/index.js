import express from "express";
import cors from "cors";
import {
  upsertUser,
  getUser,
  getBusinessProfile,
  upsertBusinessProfile,
  getProgress,
  completeStep,
} from "./repository.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4100;

app.get("/", (_req, res) => {
  res.json({
    name: "tlacuachip-user-service",
    owns: ["users", "business_profiles", "progress", "completed_steps"],
    endpoints: [
      "POST /api/users",
      "GET /api/users/:id",
      "GET /api/users/:id/business-profile",
      "PUT /api/users/:id/business-profile",
      "GET /api/users/:id/progress",
      "POST /api/users/:id/progress/complete-step",
    ],
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Upsert-by-email: acts as both signup and login for this prototype (there
// is no password/session layer yet — see server-level README).
app.post("/api/users", (req, res) => {
  const { email, name } = req.body ?? {};
  if (!email) return res.status(400).json({ error: "email is required" });
  res.status(201).json(upsertUser({ email, name }));
});

app.get("/api/users/:id", (req, res) => {
  const user = getUser(req.params.id);
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json(user);
});

app.get("/api/users/:id/business-profile", (req, res) => {
  if (!getUser(req.params.id)) return res.status(404).json({ error: "user_not_found" });
  const profile = getBusinessProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "no_business_profile" });
  res.json(profile);
});

app.put("/api/users/:id/business-profile", (req, res) => {
  if (!getUser(req.params.id)) return res.status(404).json({ error: "user_not_found" });
  const { businessType, category, budget, country, state, city, experience } = req.body ?? {};
  if (!businessType || !category || !budget || !country || !state || !city || !experience) {
    return res.status(400).json({ error: "businessType, category, budget, country, state, city, experience are all required" });
  }
  res.json(upsertBusinessProfile(req.params.id, { businessType, category, budget, country, state, city, experience }));
});

app.get("/api/users/:id/progress", (req, res) => {
  if (!getUser(req.params.id)) return res.status(404).json({ error: "user_not_found" });
  res.json(getProgress(req.params.id));
});

app.post("/api/users/:id/progress/complete-step", (req, res) => {
  if (!getUser(req.params.id)) return res.status(404).json({ error: "user_not_found" });
  const { stepId, xp } = req.body ?? {};
  if (!stepId) return res.status(400).json({ error: "stepId is required" });
  res.json(completeStep(req.params.id, stepId, Number(xp) || 0));
});

app.listen(PORT, () => {
  console.log(`tlacuachip-user-service listening on http://localhost:${PORT}`);
});
