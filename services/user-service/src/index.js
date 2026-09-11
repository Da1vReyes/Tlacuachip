import express from "express";
import cors from "cors";
import { migrate } from "./db.js";
import { hashPassword, verifyPassword, signToken, requireAuth } from "./auth.js";
import {
  createUser,
  findUserByEmail,
  getUserPublic,
  updateUserRole,
  updateUserProfile,
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
  listCommunityPosts,
  createCommunityPost,
  startConversation,
  listConversations,
  addConversationMessage,
  acceptConversation,
  inviteConversationToTeam,
  acceptTeamInvite,
  listWorkspace,
  createWorkspaceItem,
  completeWorkspaceItem,
  uploadWorkspaceFile,
} from "./repository.js";
import {
  ValidationError,
  validateSignup,
  validateLogin,
  validateBusinessProfile,
  validatePreferences,
  validateProviderProfile,
  validateReportBlob,
  validateUserProfile,
} from "./validate.js";
import { rateLimit } from "./ratelimit.js";
import { syncProviderToCatalog, removeProviderFromCatalog, getProviderOwnerFromCatalog } from "./catalogSync.js";

await migrate();

const app = express();

// Any localhost/127.0.0.1 origin is allowed regardless of port — Vite picks
// the next free port whenever an earlier one is held by a stray dev server,
// and a hardcoded port list breaks CORS every time that happens.
// ALLOWED_ORIGINS stays authoritative for real, non-local origins.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5180,http://127.0.0.1:5173,http://127.0.0.1:5180")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin) || isLocalOrigin(origin)) }));
// A collaboration can include one small CSV. The per-file validation below
// remains the real cap; this only lets its base64 transport reach the route.
app.use(express.json({ limit: "512kb" }));
app.disable("x-powered-by");

const PORT = process.env.PORT || 4100;
const authLimiter = rateLimit(20); // signup/login: 20/min/IP, brute-force friction

// The base legal path is deliberately enforced server-side as well as in the
// timeline UI. Conditional checks remain available after municipal opening;
// they are not silently treated as universal permits.
const STEP_PREREQUISITES = {
  "sat-rfc": ["local-viability"],
  "fiscal-setup": ["sat-rfc"],
  "municipal-opening": ["fiscal-setup"],
  "sector-permits": ["municipal-opening"],
  "employment-imss": ["municipal-opening"],
  "operational-ready": ["municipal-opening"],
  "brand-and-growth": ["operational-ready"],
};

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
      "PATCH /api/me/profile",
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

app.get("/api/community/posts", async (_req, res, next) => {
  try { res.json(await listCommunityPosts()); } catch (err) { next(err); }
});

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

app.post("/api/me/community/posts", async (req, res, next) => {
  try {
    const body = typeof req.body?.body === "string" ? req.body.body : "";
    const parentId = typeof req.body?.parentId === "string" ? req.body.parentId : null;
    res.status(201).json(await createCommunityPost(req.userId, body, parentId));
  } catch (err) {
    if (String(err.message).startsWith("invalid_") || err.message === "parent_post_not_found") return res.status(400).json({ error: "invalid_request", message: "La publicación no es válida." });
    next(err);
  }
});

app.post("/api/me/conversations", async (req, res, next) => {
  try {
    const providerId = typeof req.body?.providerId === "string" ? req.body.providerId.slice(0, 80) : "";
    const body = typeof req.body?.body === "string" ? req.body.body : "";
    const owner = await getProviderOwnerFromCatalog(providerId);
    if (!owner) return res.status(404).json({ error: "provider_not_contactable", message: "Este perfil no acepta mensajes todavía." });
    if (owner.userId === req.userId) return res.status(400).json({ error: "invalid_request", message: "No puedes enviarte un mensaje a ti mismo." });
    res.status(201).json(await startConversation(req.userId, owner.userId, providerId, body));
  } catch (err) {
    if (err.message === "invalid_message") return res.status(400).json({ error: "invalid_request", message: "Escribe un mensaje de hasta 1,200 caracteres." });
    next(err);
  }
});

app.get("/api/me/conversations", async (req, res, next) => {
  try { res.json(await listConversations(req.userId)); } catch (err) { next(err); }
});

app.post("/api/me/conversations/:conversationId/messages", async (req, res, next) => {
  try {
    const body = typeof req.body?.body === "string" ? req.body.body : "";
    res.status(201).json(await addConversationMessage(req.userId, String(req.params.conversationId), body));
  } catch (err) {
    if (err.message === "invalid_message") return res.status(400).json({ error: "invalid_request", message: "Escribe un mensaje de hasta 1,200 caracteres." });
    if (err.message === "conversation_not_found") return res.status(404).json({ error: "conversation_not_found" });
    next(err);
  }
});

app.post("/api/me/conversations/:conversationId/accept", async (req, res, next) => {
  try { res.json(await acceptConversation(req.userId, String(req.params.conversationId))); }
  catch (err) {
    if (err.message === "conversation_not_pending") return res.status(409).json({ error: "conversation_not_pending" });
    next(err);
  }
});

app.post("/api/me/conversations/:conversationId/team-invite", async (req, res, next) => {
  try { res.json(await inviteConversationToTeam(req.userId, String(req.params.conversationId))); }
  catch (err) { if (err.message === "team_invite_not_available") return res.status(409).json({ error: "team_invite_not_available" }); next(err); }
});

app.post("/api/me/conversations/:conversationId/team-accept", async (req, res, next) => {
  try { res.json(await acceptTeamInvite(req.userId, String(req.params.conversationId))); }
  catch (err) { if (err.message === "team_invite_not_available") return res.status(409).json({ error: "team_invite_not_available" }); next(err); }
});

app.get("/api/me/workspace", async (req, res, next) => {
  try { res.json(await listWorkspace(req.userId)); } catch (err) { next(err); }
});

app.post("/api/me/workspace/:conversationId/items", async (req, res, next) => {
  try { res.status(201).json(await createWorkspaceItem(req.userId, String(req.params.conversationId), req.body)); }
  catch (err) { if (err.message === "invalid_workspace_item") return res.status(400).json({ error: "invalid_workspace_item" }); if (err.message === "workspace_not_available") return res.status(403).json({ error: "workspace_not_available" }); next(err); }
});

app.patch("/api/me/workspace/items/:itemId", async (req, res, next) => {
  try { res.json(await completeWorkspaceItem(req.userId, String(req.params.itemId), req.body?.completed)); }
  catch (err) { if (err.message === "workspace_not_available") return res.status(403).json({ error: "workspace_not_available" }); next(err); }
});

app.post("/api/me/workspace/:conversationId/files", async (req, res, next) => {
  try { res.status(201).json(await uploadWorkspaceFile(req.userId, String(req.params.conversationId), req.body)); }
  catch (err) {
    if (err.message === "invalid_workspace_file") return res.status(400).json({ error: "invalid_workspace_file", message: "Solo se permiten archivos CSV de hasta 250 KB." });
    if (err.message === "workspace_not_available") return res.status(403).json({ error: "workspace_not_available" });
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

app.patch("/api/me/profile", async (req, res, next) => {
  try {
    res.json(await updateUserProfile(req.userId, validateUserProfile(req.body)));
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
    const normalizedId = stepId.trim().slice(0, 60);
    const prerequisites = STEP_PREREQUISITES[normalizedId] ?? [];
    const current = await getProgress(req.userId);
    if (prerequisites.some((id) => !current.completedSteps.includes(id))) {
      return res.status(409).json({ error: "step_locked", message: "Completa primero los pasos base anteriores." });
    }
    const xp = Number(req.body?.xp);
    res.json(await completeStep(req.userId, normalizedId, Number.isFinite(xp) ? Math.max(0, Math.min(xp, 1000)) : 0));
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
