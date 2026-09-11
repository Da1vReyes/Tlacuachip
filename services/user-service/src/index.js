import express from "express";
import cors from "cors";
import { migrate } from "./db.js";
import { hashPassword, verifyPassword, signToken, requireAuth } from "./auth.js";
import {
  createUser,
  findUserByEmail,
  getUserPublic,
  updateUserRole,
  getBusinessProfile,
  upsertBusinessProfile,
  getReport,
  saveReport,
  getProgress,
  completeStep,
  getPreferences,
  updatePreferences,
  getProviderProfile,
  upsertProviderProfile,
  getTeam,
  toggleTeamProvider,
  getFullProfile,
  deleteUser,
} from "./repository.js";
import {
  ValidationError,
  validateSignup,
  validateLogin,
  validateBusinessProfile,
  validatePreferences,
  validateProviderProfile,
  validateReportBlob,
} from "./validate.js";
import { rateLimit } from "./ratelimit.js";
import { syncProviderToCatalog, removeProviderFromCatalog } from "./catalogSync.js";

await migrate();

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5180,http://127.0.0.1:5173,http://127.0.0.1:5180")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)) }));
app.use(express.json({ limit: "128kb" }));
app.disable("x-powered-by");

const PORT = process.env.PORT || 4100;
const authLimiter = rateLimit(20); // signup/login: 20/min/IP, brute-force friction

app.get("/", (_req, res) => {
  res.json({
    name: "tlacuachic-user-service",
    owns: ["users", "business_profiles", "reports", "progress", "completed_steps", "preferences", "provider_profiles", "team_providers"],
    auth: "Bearer JWT — every /api/me/* route acts on the caller's own account only, derived from the token, never from a client-supplied id",
    endpoints: [
      "POST /api/auth/signup",
      "POST /api/auth/login",
      "GET /api/me",
      "PUT /api/me/role",
      "PUT /api/me/business-profile",
      "GET /api/me/report",
      "PUT /api/me/report",
      "GET /api/me/progress",
      "POST /api/me/progress/complete-step",
      "PUT /api/me/preferences",
      "PUT /api/me/provider-profile",
      "GET /api/me/team",
      "POST /api/me/team/:providerId/toggle",
      "DELETE /api/me",
    ],
  });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

function handleValidation(err, res) {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: "invalid_request", message: err.message });
    return true;
  }
  return false;
}

// ---------- auth ----------

app.post("/api/auth/signup", authLimiter, async (req, res, next) => {
  try {
    const { email, password, name, role } = validateSignup(req.body);
    if (await findUserByEmail(email)) {
      return res.status(409).json({ error: "email_taken", message: "An account with this email already exists" });
    }
    const passwordHash = await hashPassword(password);
    const user = await createUser({ email, passwordHash, name, role });
    res.status(201).json({ token: signToken(user.id), user });
  } catch (err) {
    if (handleValidation(err, res)) return;
    next(err);
  }
});

app.post("/api/auth/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = validateLogin(req.body);
    const user = await findUserByEmail(email);
    // Same generic error whether the email doesn't exist or the password is
    // wrong — don't let this endpoint confirm which emails have accounts.
    const invalid = () => res.status(401).json({ error: "invalid_credentials", message: "Email o contraseña incorrectos" });
    if (!user) return invalid();
    if (!(await verifyPassword(password, user.password_hash))) return invalid();
    const { password_hash: _drop, ...publicUser } = user;
    res.json({ token: signToken(user.id), user: publicUser });
  } catch (err) {
    if (handleValidation(err, res)) return;
    next(err);
  }
});

// ---------- everything below requires a valid token, and only ever
// touches req.userId — there is no id in any of these URLs to tamper with.

app.use("/api/me", requireAuth);

// A token stays cryptographically valid for its full TTL even after the
// account is deleted (DELETE /api/me, or one day an admin action) — there's
// no server-side session to revoke. Without this check, every route below
// would hit a foreign-key violation trying to write child rows for a user
// that no longer exists and surface a raw 500. Check once, here, and every
// route downstream can assume req.userId refers to a real account.
app.use("/api/me", async (req, res, next) => {
  try {
    const user = await getUserPublic(req.userId);
    if (!user) return res.status(401).json({ error: "account_not_found", message: "This account no longer exists" });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/api/me", async (req, res, next) => {
  try {
    res.json(await getFullProfile(req.userId));
  } catch (err) {
    next(err);
  }
});

app.put("/api/me/role", async (req, res, next) => {
  try {
    const role = req.body?.role;
    if (role !== "entrepreneur" && role !== "provider") throw new ValidationError("role is invalid");
    res.json(await updateUserRole(req.userId, role));
  } catch (err) {
    if (handleValidation(err, res)) return;
    next(err);
  }
});

app.get("/api/me/business-profile", async (req, res, next) => {
  try {
    const profile = await getBusinessProfile(req.userId);
    if (!profile) return res.status(404).json({ error: "no_business_profile" });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

app.put("/api/me/business-profile", async (req, res, next) => {
  try {
    const profile = validateBusinessProfile(req.body);
    res.json(await upsertBusinessProfile(req.userId, profile));
  } catch (err) {
    if (handleValidation(err, res)) return;
    next(err);
  }
});

app.get("/api/me/report", async (req, res, next) => {
  try {
    const report = await getReport(req.userId);
    if (!report) return res.status(404).json({ error: "no_report" });
    res.json(report);
  } catch (err) {
    next(err);
  }
});

app.put("/api/me/report", async (req, res, next) => {
  try {
    const data = validateReportBlob(req.body);
    res.json(await saveReport(req.userId, data));
  } catch (err) {
    if (handleValidation(err, res)) return;
    next(err);
  }
});

app.get("/api/me/progress", async (req, res, next) => {
  try {
    res.json(await getProgress(req.userId));
  } catch (err) {
    next(err);
  }
});

app.post("/api/me/progress/complete-step", async (req, res, next) => {
  try {
    const stepId = req.body?.stepId;
    if (typeof stepId !== "string" || !stepId.trim()) throw new ValidationError("stepId is required");
    const xp = Number(req.body?.xp);
    res.json(await completeStep(req.userId, stepId.trim().slice(0, 60), Number.isFinite(xp) ? Math.max(0, Math.min(xp, 1000)) : 0));
  } catch (err) {
    if (handleValidation(err, res)) return;
    next(err);
  }
});

app.put("/api/me/preferences", async (req, res, next) => {
  try {
    const patch = validatePreferences(req.body);
    res.json(await updatePreferences(req.userId, patch));
  } catch (err) {
    if (handleValidation(err, res)) return;
    next(err);
  }
});

app.get("/api/me/provider-profile", async (req, res, next) => {
  try {
    const profile = await getProviderProfile(req.userId);
    if (!profile) return res.status(404).json({ error: "no_provider_profile" });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

app.put("/api/me/provider-profile", async (req, res, next) => {
  try {
    const profile = validateProviderProfile(req.body);
    const saved = await upsertProviderProfile(req.userId, profile);
    syncProviderToCatalog(req.userId, profile); // fire-and-forget, see catalogSync.js
    res.json(saved);
  } catch (err) {
    if (handleValidation(err, res)) return;
    next(err);
  }
});

app.get("/api/me/team", async (req, res, next) => {
  try {
    res.json(await getTeam(req.userId));
  } catch (err) {
    next(err);
  }
});

app.post("/api/me/team/:providerId/toggle", async (req, res, next) => {
  try {
    const providerId = String(req.params.providerId).slice(0, 60);
    res.json(await toggleTeamProvider(req.userId, providerId));
  } catch (err) {
    next(err);
  }
});

app.delete("/api/me", async (req, res, next) => {
  try {
    await deleteUser(req.userId);
    removeProviderFromCatalog(req.userId); // fire-and-forget, see catalogSync.js
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "payload_too_large" });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "invalid_json" });
  console.error("[user-service] unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

app.listen(PORT, () => {
  console.log(`tlacuachic-user-service listening on http://localhost:${PORT}`);
});
