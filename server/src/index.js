import dns from "node:dns";
import express from "express";
import cors from "cors";

// Some networks have a broken/unreachable IPv6 route to hosts that still
// publish AAAA records (Overpass's public instance does). Node's fetch
// tries IPv6 first by default and can hang for the full timeout before
// falling back — curl doesn't have this problem, which is what made the
// symptom confusing while debugging. Prefer IPv4 for all outbound requests.
dns.setDefaultResultOrder("ipv4first");
import { fetchRealPoints } from "./overpass.js";
import { zoneCenters, boundingBox, bucketPoints, scoreFromCount } from "./zones.js";
import { sanitizeProfile, sanitizeCandidates, sanitizeSteps, sanitizeReportNumbers, sanitizeBusinessForm, ValidationError } from "./privacy.js";
import { chatJson, llmStatus, LlmUnavailable } from "./llm.js";
import { rankCandidates, fallbackInsights } from "./matching.js";
import { rateLimit } from "./ratelimit.js";
import { buildReport } from "./report.js";

const app = express();

// Only the web app's origins may call this API from a browser. Requests
// without an Origin header (curl, server-to-server) are still allowed.
// Any localhost/127.0.0.1 origin is allowed regardless of port — Vite picks
// the next free port (5173, 5174, 5175...) whenever an earlier one is still
// held by a stray dev server, and a hardcoded port list breaks CORS every
// time that happens. ALLOWED_ORIGINS stays authoritative for real, non-local
// origins (e.g. a deployed frontend).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5180,http://127.0.0.1:5173,http://127.0.0.1:5180")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin) || isLocalOrigin(origin)),
  })
);
app.use(express.json({ limit: "64kb" }));
app.disable("x-powered-by");

const PORT = process.env.PORT || 4000;
const aiLimiter = rateLimit(Number(process.env.AI_RATE_LIMIT_PER_MINUTE || 20));

app.get("/", (_req, res) => {
  res.json({
    name: "tlacuachic-server",
    endpoints: ["/api/health", "/api/ai/status", "/api/density?lat=&lng=&category=", "POST /api/report", "POST /api/match", "POST /api/insights", "POST /api/step-help", "POST /api/roadmap-review"],
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/ai/status", (_req, res) => {
  res.json(llmStatus());
});

// GET /api/density?lat=19.43&lng=-99.13&category=cafeteria
// Real point-of-interest density per zone, sourced from OpenStreetMap.
app.get("/api/density", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const category = String(req.query.category ?? "otro");

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng are required numbers" });
  }

  const zones = zoneCenters(lat, lng);
  const bbox = boundingBox(zones);

  try {
    const { points, source, capturedAt } = await fetchRealPoints(bbox, category);
    const counts = bucketPoints(zones, points);

    const zonesOut = zones.map((z) => ({
      id: z.id,
      name: z.name,
      row: z.row,
      col: z.col,
      businessCount: counts[z.id],
      supplyScore: scoreFromCount(counts[z.id]),
      // Temporary deterministic prototype signals. They are intentionally
      // returned separately from the real DENUE count so the client can
      // never present them as official data.
      demandEstimate: Math.round(38 + ((Math.abs(Math.sin((z.lat * 23) + (z.lng * 17))) * 42)) - Math.min(counts[z.id] * 1.5, 12)),
      costEstimate: Math.round(34 + (Math.abs(Math.sin((z.lat * 11) - (z.lng * 29))) * 48)),
    }));

    res.json({ source, capturedAt, category, center: { lat, lng }, totalPoints: points.length, points, zones: zonesOut, estimates: { synthetic: true, method: "señal temporal determinista para demo; no es renta, tráfico ni demanda observada" } });
  } catch (err) {
    console.error("[density] Overpass fetch failed:", err.message);
    res.status(502).json({ error: "upstream_unavailable", message: "Could not reach OpenStreetMap Overpass API" });
  }
});

// POST /api/report
// Body: a business form (businessType, category, budget, experience,
// description, location). Geocodes the city, counts REAL nearby similar
// businesses via OpenStreetMap, and asks the model to reason a market
// reading grounded in that count plus the user's own description. Always
// returns a usable report — falls back to a local heuristic (still using
// the real count) if the model is unavailable.
app.post("/api/report", aiLimiter, async (req, res) => {
  let form;
  try {
    form = sanitizeBusinessForm(req.body);
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: "invalid_request", message: err.message });
    throw err;
  }

  const report = await buildReport(form);
  res.json(report);
});

// POST /api/match
// Body: { profile, candidates, steps }. The profile is re-minimized here per
// the user's visibility settings; the model only chooses among `candidates`
// and its output is filtered back to that list. Falls back to the local
// ranking when the model is unavailable.
app.post("/api/match", aiLimiter, async (req, res) => {
  let profile;
  let candidates;
  let steps;
  try {
    profile = sanitizeProfile(req.body?.profile);
    candidates = sanitizeCandidates(req.body?.candidates);
    steps = sanitizeSteps(req.body?.steps);
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: "invalid_request", message: err.message });
    throw err;
  }

  const fallback = rankCandidates(profile, candidates, steps);

  try {
    const { model, data } = await chatJson({
      system: [
        "Eres el asistente de Tlacuachic, una plataforma que da información a microemprendedores en México sobre cómo formalizar su negocio.",
        "Recibes el perfil mínimo de un emprendedor y una lista de proveedores candidatos (abogados, contadores, asesores, marketing, gestoría, insumos).",
        "Selecciona hasta 6 candidatos de la lista, priorizando los más relevantes para el paso pendiente del emprendedor; si la lista tiene pocos candidatos relevantes, inclúyelos a todos aunque sean menos de 3. Para cada uno escribe una frase (máximo 140 caracteres, español) que informe qué suele resolver ese tipo de profesional en ese paso, como lo explicaría un profesional del ramo.",
        "Tono: informativo, no directivo. Describe prácticas reales ('un contador normalmente revisa…'), no órdenes ('debes…', 'contrata a…'). La decisión es del emprendedor.",
        "Nunca inventes proveedores: usa únicamente los `id` de la lista. Nunca prometas resultados ni des asesoría legal o fiscal específica.",
        "Responde SOLO con JSON válido con esta forma exacta:",
        '{"summary": "una frase en español", "recommendations": [{"providerId": "id", "reason": "texto", "forStepId": "id de paso o null"}]}',
      ].join(" "),
      user: JSON.stringify({ perfil: profile, siguientePaso: steps.find((s) => s.id === profile.nextStepId) ?? null, candidatos: candidates }),
    });

    const allowed = new Map(candidates.map((c) => [c.id, c]));
    const stepIds = new Set(steps.map((s) => s.id));
    const recommendations = (Array.isArray(data?.recommendations) ? data.recommendations : [])
      .filter((r) => r && typeof r.providerId === "string" && allowed.has(r.providerId))
      .slice(0, 6)
      .map((r) => ({
        providerId: r.providerId,
        reason: typeof r.reason === "string" ? r.reason.slice(0, 160) : "recomendado por la IA",
        forStepId: typeof r.forStepId === "string" && stepIds.has(r.forStepId) ? r.forStepId : allowed.get(r.providerId).helpsWith.includes(profile.nextStepId) ? profile.nextStepId : undefined,
      }));

    if (recommendations.length === 0) throw new LlmUnavailable("Model returned no usable recommendations");

    res.json({
      source: "llm",
      model,
      summary: typeof data?.summary === "string" ? data.summary.slice(0, 240) : undefined,
      recommendations,
    });
  } catch (err) {
    if (!(err instanceof LlmUnavailable)) throw err;
    console.warn("[match] falling back to local ranking:", err.message);
    res.json({ source: "fallback", model: null, recommendations: fallback });
  }
});

// POST /api/insights
// Body: { profile, report }. Turns the report's indicators into a short,
// plain-language reading. Same privacy path as /api/match.
app.post("/api/insights", aiLimiter, async (req, res) => {
  let profile;
  let report;
  try {
    profile = sanitizeProfile(req.body?.profile);
    report = sanitizeReportNumbers(req.body?.report);
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: "invalid_request", message: err.message });
    throw err;
  }

  try {
    const { model, data } = await chatJson({
      system: [
        "Eres el asistente de Tlacuachic. Explicas indicadores de mercado a una persona que quiere abrir una microempresa en México y no tiene formación financiera.",
        "Escribe entre 3 y 4 frases cortas en español. Cada una informa qué significa un número y qué suelen revisar los profesionales (contadores, asesores, dueños con experiencia) ante ese dato. Aclara cuando un dato es estimación.",
        "Tono: informativo, no directivo. Nada de 'debes', 'te recomiendo' ni 'haz'. Presenta contexto y prácticas comunes; la decisión es de la persona.",
        "No prometas resultados, no des asesoría legal ni fiscal, no inventes cifras que no estén en los datos.",
        "Si localBusinessCount es 0, eso puede significar que no se pudo consultar OpenStreetMap en ese momento, no que se haya confirmado ausencia de competencia — no afirmes 'no hay competencia' en ese caso.",
        'Responde SOLO con JSON válido: {"insights": ["frase 1", "frase 2", "frase 3"]}',
      ].join(" "),
      user: JSON.stringify({ perfil: profile, indicadores: report, nota: "localBusinessCount viene de OpenStreetMap cuando fue posible consultarlo; el resto son estimaciones del prototipo." }),
      temperature: 0.4,
    });

    const insights = (Array.isArray(data?.insights) ? data.insights : [])
      .filter((s) => typeof s === "string" && s.trim())
      .slice(0, 4)
      .map((s) => s.trim().slice(0, 280));

    if (insights.length === 0) throw new LlmUnavailable("Model returned no insights");

    res.json({ source: "llm", model, insights });
  } catch (err) {
    if (!(err instanceof LlmUnavailable)) throw err;
    console.warn("[insights] falling back to template:", err.message);
    res.json({ source: "fallback", model: null, insights: fallbackInsights(profile, report) });
  }
});

// POST /api/step-help
// A deliberately on-demand assistant for a single roadmap task. The default
// UI guidance is local; this endpoint spends an LLM request only after the
// entrepreneur asks a concrete question.
app.post("/api/step-help", aiLimiter, async (req, res) => {
  const step = req.body?.step;
  const profile = req.body?.profile;
  const question = typeof req.body?.question === "string" ? req.body.question.trim().slice(0, 700) : "";
  const completed = Array.isArray(req.body?.completed) ? req.body.completed.filter((item) => typeof item === "string").slice(0, 12) : [];
  if (!step || typeof step.title !== "string" || !Array.isArray(step.instructions) || !profile || typeof profile.businessType !== "string") {
    return res.status(400).json({ error: "invalid_request", message: "Falta el contexto del paso." });
  }
  if (!question) return res.status(400).json({ error: "invalid_request", message: "Escribe una duda concreta." });

  const safeStep = { title: step.title.slice(0, 140), summary: typeof step.summary === "string" ? step.summary.slice(0, 500) : "", instructions: step.instructions.filter((item) => typeof item === "string").slice(0, 8) };
  const safeProfile = { businessType: profile.businessType.slice(0, 140), category: typeof profile.category === "string" ? profile.category.slice(0, 60) : "", city: typeof profile.city === "string" ? profile.city.slice(0, 80) : "", experience: typeof profile.experience === "string" ? profile.experience.slice(0, 40) : "", description: typeof profile.description === "string" ? profile.description.slice(0, 600) : "" };
  const fallback = {
    answer: `Para “${safeStep.title}”, separa tu duda en una acción verificable: qué dato falta, qué documento necesitas o qué autoridad/profesional puede confirmarlo. No avances solo por una suposición.`,
    nextAction: completed.length < safeStep.instructions.length ? `Retoma el siguiente punto pendiente de tu checklist: ${safeStep.instructions.find((item) => !completed.includes(item)) ?? safeStep.instructions[0] ?? "revisa la fuente oficial"}.` : "Ya marcaste la lista; revisa la evidencia y contrástala con la fuente oficial antes de cerrar el paso.",
  };
  try {
    const { model, data } = await chatJson({
      system: [
        "Eres el asistente de tareas de Tlacuachic para microemprendedores en México.",
        "Responde una duda sobre un paso de formalización en español claro, en máximo 90 palabras.",
        "Solo puedes afirmar hechos que aparezcan literalmente en `paso`. No agregues requisitos, deudas, permisos, costos, oficinas, portales, nombres de autoridades o documentos que no aparezcan allí.",
        "Da contexto y una siguiente acción verificable, sin dar asesoría legal/fiscal definitiva. Si faltan datos, di que el caso depende del domicilio, giro o autoridad y pide contrastarlo con el enlace oficial visible en la pantalla o con un profesional.",
        'Responde SOLO JSON: {"answer":"respuesta breve", "nextAction":"una acción concreta"}.',
      ].join(" "),
      user: JSON.stringify({ negocio: safeProfile, paso: safeStep, yaMarcado: completed, pregunta: question }),
      temperature: 0.25,
    });
    if (typeof data?.answer !== "string" || typeof data?.nextAction !== "string") throw new LlmUnavailable("Invalid task helper response");
    res.json({ source: "llm", model, answer: data.answer.slice(0, 650), nextAction: data.nextAction.slice(0, 260) });
  } catch (err) {
    if (!(err instanceof LlmUnavailable)) throw err;
    console.warn("[step-help] falling back to local guide:", err.message);
    res.json({ source: "fallback", model: null, ...fallback });
  }
});

// POST /api/roadmap-review
// An optional, concise reflection. It is deliberately not a compliance score
// and consumes an LLM request only when the entrepreneur asks for it.
app.post("/api/roadmap-review", aiLimiter, async (req, res) => {
  const profile = req.body?.profile;
  const steps = Array.isArray(req.body?.steps) ? req.body.steps : [];
  if (!profile || typeof profile.businessType !== "string" || steps.length === 0) {
    return res.status(400).json({ error: "invalid_request", message: "Falta el contexto de tu ruta." });
  }
  const safeProfile = {
    businessType: profile.businessType.slice(0, 140),
    city: typeof profile.city === "string" ? profile.city.slice(0, 80) : "",
    experience: typeof profile.experience === "string" ? profile.experience.slice(0, 40) : "",
    description: typeof profile.description === "string" ? profile.description.slice(0, 600) : "",
  };
  const safeSteps = steps.slice(0, 16).flatMap((item) => {
    if (!item || typeof item.title !== "string" || !["completed", "available", "in-progress", "locked"].includes(item.status)) return [];
    return [{ title: item.title.slice(0, 140), status: item.status }];
  });
  if (safeSteps.length === 0) return res.status(400).json({ error: "invalid_request", message: "No hay pasos válidos para revisar." });
  const completed = safeSteps.filter((item) => item.status === "completed");
  const next = safeSteps.find((item) => item.status === "available" || item.status === "in-progress");
  const fallback = {
    source: "fallback",
    model: null,
    strengths: completed.length ? `Ya registraste ${completed.length} paso${completed.length === 1 ? "" : "s"}; esa evidencia te da una base más ordenada.` : "Aún no has cerrado pasos; empezar por una sola evidencia reduce el riesgo de avanzar a ciegas.",
    watchout: "No interpretes el progreso en Tlacuachic como una autorización: contrasta cada requisito con su fuente oficial o un profesional.",
    nextFocus: next ? `Enfócate sólo en “${next.title}”. Cierra su checklist antes de abrir otro frente.` : "Revisa la evidencia de tus pasos cerrados y consulta requisitos que dependan de tu giro o domicilio.",
  };
  try {
    const { model, data } = await chatJson({
      system: [
        "Eres un asistente de progreso para microemprendedores en México.",
        "Da una crítica útil y amable basada únicamente en el perfil y estados recibidos. Máximo 55 palabras por campo.",
        "No infieras demanda, competencia, rentas, flujo peatonal, clientes, mercado, costos ni viabilidad desde el giro o ciudad. No inventes requisitos legales, permisos, autoridades, indicadores financieros ni afirmes que el negocio cumple. No des asesoría definitiva.",
        "Identifica una fortaleza, una alerta práctica y un único siguiente enfoque. Si la información no basta, dilo con claridad.",
        'Responde SOLO JSON: {"strengths":"...", "watchout":"...", "nextFocus":"..."}.',
      ].join(" "),
      user: JSON.stringify({ negocio: safeProfile, avance: safeSteps }),
      temperature: 0.25,
    });
    if (![data?.strengths, data?.watchout, data?.nextFocus].every((item) => typeof item === "string")) throw new LlmUnavailable("Invalid roadmap review response");
    const responseText = `${data.strengths} ${data.watchout} ${data.nextFocus}`;
    if (/\b(demanda|competencia|mercado|renta|alquiler|flujo peatonal|costo(?:s)?|clientes)\b/i.test(responseText)) {
      throw new LlmUnavailable("Roadmap review made an unsupported market claim");
    }
    res.json({ source: "llm", model, strengths: data.strengths.slice(0, 420), watchout: data.watchout.slice(0, 420), nextFocus: data.nextFocus.slice(0, 420) });
  } catch (err) {
    if (!(err instanceof LlmUnavailable)) throw err;
    console.warn("[roadmap-review] falling back to local guide:", err.message);
    res.json(fallback);
  }
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "payload_too_large" });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "invalid_json" });
  console.error("[server] unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

app.listen(PORT, () => {
  const { configured, model } = llmStatus();
  console.log(`tlacuachic-server listening on http://localhost:${PORT}`);
  console.log(configured ? `[ai] OpenRouter configured (model: ${model})` : "[ai] OPENROUTER_API_KEY not set — /api/match and /api/insights use local fallbacks");
});
