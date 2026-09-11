// Server-side enforcement of the user's privacy choices. The client already
// minimizes the profile before sending it (web/src/lib/privacy.ts), but the
// server never trusts that: anything not allowed by `visibility` and
// `locationPrecision` is dropped here before it can reach the model.

const VISIBILITIES = new Set(["private", "business", "profile"]);
const CATEGORIES = new Set(["cafeteria", "restaurante", "tienda-abarrotes", "salon-belleza", "taller-mecanico", "papeleria", "otro"]);
const EXPERIENCE = new Set(["ninguna", "poca", "intermedia", "experto"]);
const KINDS = new Set(["abogado", "contador", "asesor-financiero", "marketing", "gestoria", "insumos"]);
const COUNTRIES = new Set(["Mexico", "Colombia", "Argentina", "Chile", "Peru", "Otro"]);

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

function str(value, max, field, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${field} is required`);
    return undefined;
  }
  if (typeof value !== "string") throw new ValidationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new ValidationError(`${field} is required`);
  return trimmed.slice(0, max);
}

function idList(value, field, max = 20) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be an array`);
  return value.slice(0, max).map((v) => str(v, 60, field, { required: true }));
}

export function sanitizeProfile(input) {
  if (!input || typeof input !== "object") throw new ValidationError("profile is required");

  const visibility = str(input.visibility, 20, "visibility", { required: true });
  if (!VISIBILITIES.has(visibility)) throw new ValidationError("visibility is invalid");

  const category = str(input.category, 40, "category", { required: true });
  if (!CATEGORIES.has(category)) throw new ValidationError("category is invalid");

  const location = input.location && typeof input.location === "object" ? input.location : {};
  const country = str(location.country, 40, "location.country", { required: true });

  const profile = {
    visibility,
    category,
    location: { country },
    nextStepId: str(input.nextStepId, 60, "nextStepId"),
    nextStepTitle: str(input.nextStepTitle, 120, "nextStepTitle"),
    completedStepIds: idList(input.completedStepIds, "completedStepIds"),
  };

  if (visibility !== "private") {
    const city = str(location.city, 80, "location.city");
    if (city) profile.location.city = city;
    const zoneId = str(location.zoneId, 20, "location.zoneId");
    if (zoneId) profile.location.zoneId = zoneId;
  }

  if (visibility === "profile") {
    const businessType = str(input.businessType, 120, "businessType");
    if (businessType) profile.businessType = businessType;
    const experience = str(input.experience, 20, "experience");
    if (experience && EXPERIENCE.has(experience)) profile.experience = experience;
    const budgetRange = str(input.budgetRange, 40, "budgetRange");
    if (budgetRange) profile.budgetRange = budgetRange;
  }

  return profile;
}

export function sanitizeCandidates(input) {
  if (!Array.isArray(input) || input.length === 0) throw new ValidationError("candidates must be a non-empty array");
  return input.slice(0, 12).map((c, i) => {
    if (!c || typeof c !== "object") throw new ValidationError(`candidates[${i}] is invalid`);
    const kind = str(c.kind, 30, `candidates[${i}].kind`, { required: true });
    if (!KINDS.has(kind)) throw new ValidationError(`candidates[${i}].kind is invalid`);
    const rating = Number(c.rating);
    return {
      id: str(c.id, 60, `candidates[${i}].id`, { required: true }),
      name: str(c.name, 120, `candidates[${i}].name`, { required: true }),
      kind,
      isAI: Boolean(c.isAI),
      city: str(c.city, 80, `candidates[${i}].city`) ?? "",
      rating: Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0,
      description: str(c.description, 300, `candidates[${i}].description`) ?? "",
      helpsWith: idList(c.helpsWith, `candidates[${i}].helpsWith`, 10),
    };
  });
}

export function sanitizeSteps(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 30).map((s, i) => ({
    id: str(s?.id, 60, `steps[${i}].id`, { required: true }),
    title: str(s?.title, 120, `steps[${i}].title`) ?? "",
    status: str(s?.status, 20, `steps[${i}].status`) ?? "locked",
  }));
}

// This is the user's own onboarding data, generating THEIR OWN report —
// not data shared with the network — so it isn't gated by `visibility`
// (that governs what providers/other users see, not what the person
// generating their own report can tell the model about themself).
export function sanitizeBusinessForm(input) {
  if (!input || typeof input !== "object") throw new ValidationError("businessForm is required");

  const businessType = str(input.businessType, 120, "businessType", { required: true });
  const category = str(input.category, 40, "category", { required: true });
  if (!CATEGORIES.has(category)) throw new ValidationError("category is invalid");

  const budget = Number(input.budget);
  if (!Number.isFinite(budget) || budget < 50 || budget > 500000) throw new ValidationError("budget must be between 50 and 500000");

  const experience = str(input.experience, 20, "experience", { required: true });
  if (!EXPERIENCE.has(experience)) throw new ValidationError("experience is invalid");

  const location = input.location && typeof input.location === "object" ? input.location : {};
  const country = str(location.country, 40, "location.country", { required: true });
  const state = str(location.state, 80, "location.state", { required: true });
  const city = str(location.city, 80, "location.city", { required: true });
  if (!COUNTRIES.has(country)) throw new ValidationError("location.country is invalid");

  const description = str(input.description, 600, "description") ?? "";

  return { businessType, category, budget: Math.round(budget), experience, description, location: { country, state, city } };
}

export function sanitizeReportNumbers(input) {
  if (!input || typeof input !== "object") throw new ValidationError("report is required");
  const num = (v, field) => {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new ValidationError(`${field} must be a number`);
    return n;
  };
  const demandTrend = str(input.demandTrend, 20, "demandTrend") ?? "estable";
  return {
    sectorGrowthPercent: num(input.sectorGrowthPercent, "sectorGrowthPercent"),
    sectorGrowthPeriod: str(input.sectorGrowthPeriod, 30, "sectorGrowthPeriod") ?? "",
    localBusinessCount: num(input.localBusinessCount, "localBusinessCount"),
    avgMonthlyRevenue: num(input.avgMonthlyRevenue, "avgMonthlyRevenue"),
    survivalRate5Years: num(input.survivalRate5Years, "survivalRate5Years"),
    demandTrend: ["creciendo", "estable", "decreciendo"].includes(demandTrend) ? demandTrend : "estable",
  };
}
