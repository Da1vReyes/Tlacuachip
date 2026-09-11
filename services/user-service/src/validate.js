const CATEGORIES = new Set(["cafeteria", "restaurante", "tienda-abarrotes", "salon-belleza", "taller-mecanico", "papeleria", "otro"]);
const EXPERIENCE = new Set(["ninguna", "poca", "intermedia", "experto"]);
const COUNTRIES = new Set(["Mexico", "Colombia", "Argentina", "Chile", "Peru", "Otro"]);
const VISIBILITIES = new Set(["private", "business", "profile"]);
const PRECISIONS = new Set(["city", "zone"]);
const LOCATION_MODES = new Set(["explore", "existing"]);
const PROVIDER_KINDS = new Set(["abogado", "contador", "asesor-financiero", "marketing", "gestoria", "insumos"]);
const ROLES = new Set(["entrepreneur", "provider"]);

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

export function validateSignup(input) {
  const email = str(input?.email, 254, "email", { required: true }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("email is invalid");
  const password = input?.password;
  if (typeof password !== "string" || password.length < 8) throw new ValidationError("password must be at least 8 characters");
  if (password.length > 200) throw new ValidationError("password is too long");
  const name = str(input?.name, 120, "name");
  const role = str(input?.role, 20, "role") ?? "entrepreneur";
  if (!ROLES.has(role)) throw new ValidationError("role is invalid");
  return { email, password, name, role };
}

export function validateLogin(input) {
  const email = str(input?.email, 254, "email", { required: true }).toLowerCase();
  const password = input?.password;
  if (typeof password !== "string" || !password) throw new ValidationError("password is required");
  return { email, password };
}

export function validateBusinessProfile(input) {
  const businessType = str(input?.businessType, 120, "businessType", { required: true });
  const category = str(input?.category, 40, "category", { required: true });
  if (!CATEGORIES.has(category)) throw new ValidationError("category is invalid");
  const budget = Number(input?.budget);
  if (!Number.isFinite(budget) || budget < 50 || budget > 500000) throw new ValidationError("budget must be between 50 and 500000");
  const experience = str(input?.experience, 20, "experience", { required: true });
  if (!EXPERIENCE.has(experience)) throw new ValidationError("experience is invalid");
  const country = str(input?.country, 40, "country", { required: true });
  if (!COUNTRIES.has(country)) throw new ValidationError("country is invalid");
  const state = str(input?.state, 80, "state", { required: true });
  const city = str(input?.city, 80, "city", { required: true });
  const description = str(input?.description, 600, "description") ?? null;
  return { businessType, category, budget: Math.round(budget), experience, country, state, city, description };
}

export function validatePreferences(input) {
  const patch = {};
  if (input?.visibility !== undefined) {
    if (!VISIBILITIES.has(input.visibility)) throw new ValidationError("visibility is invalid");
    patch.visibility = input.visibility;
  }
  if (input?.locationPrecision !== undefined) {
    if (!PRECISIONS.has(input.locationPrecision)) throw new ValidationError("locationPrecision is invalid");
    patch.locationPrecision = input.locationPrecision;
  }
  if (input?.onboardingComplete !== undefined) {
    patch.onboardingComplete = Boolean(input.onboardingComplete);
  }
  if (input?.selectedZoneId !== undefined) {
    patch.selectedZoneId = str(input.selectedZoneId, 20, "selectedZoneId") ?? null;
  }
  if (input?.locationMode !== undefined) {
    if (input.locationMode !== null && !LOCATION_MODES.has(input.locationMode)) throw new ValidationError("locationMode is invalid");
    patch.locationMode = input.locationMode;
  }
  if (input?.tutorialSeen !== undefined) {
    patch.tutorialSeen = Boolean(input.tutorialSeen);
  }
  return patch;
}

export function validateProviderProfile(input) {
  const name = str(input?.name, 120, "name", { required: true });
  const kind = str(input?.kind, 30, "kind", { required: true });
  if (!PROVIDER_KINDS.has(kind)) throw new ValidationError("kind is invalid");
  const isAI = Boolean(input?.isAI);
  const city = str(input?.city, 80, "city", { required: true });
  const country = str(input?.country, 40, "country", { required: true });
  const description = str(input?.description, 400, "description", { required: true });
  if (!Array.isArray(input?.helpsWith) || input.helpsWith.length === 0) throw new ValidationError("helpsWith must be a non-empty array");
  const helpsWith = input.helpsWith.slice(0, 20).map((v) => str(v, 60, "helpsWith[]", { required: true }));
  return { name, kind, isAI, city, country, description, helpsWith };
}

export function validateReportBlob(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ValidationError("report must be an object");
  const json = JSON.stringify(input);
  if (json.length > 20000) throw new ValidationError("report payload is too large");
  return input;
}
