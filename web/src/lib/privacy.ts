import type { BusinessFormData, DataPreferences, RoadmapStep } from "../types";

// The exact object that leaves the device when the entrepreneur asks the AI
// for recommendations. Built here, shown to the user verbatim in the UI, and
// re-validated server-side (server/src/privacy.js) so neither side can leak
// more than the user chose to share.
export interface MinimizedProfile {
  visibility: DataPreferences["visibility"];
  category: BusinessFormData["category"];
  businessType?: string;
  experience?: BusinessFormData["experience"];
  budgetRange?: string;
  location: { country: string; city?: string; zoneId?: string };
  nextStepId?: string;
  nextStepTitle?: string;
  completedStepIds: string[];
}

function budgetRange(budget: number): string {
  if (budget < 20000) return "menos de $20,000 MXN";
  if (budget < 100000) return "$20,000 – $100,000 MXN";
  if (budget < 300000) return "$100,000 – $300,000 MXN";
  return "más de $300,000 MXN";
}

export function buildMinimizedProfile(form: BusinessFormData, preferences: DataPreferences, steps: RoadmapStep[]): MinimizedProfile {
  const nextStep = steps.find((s) => s.status === "available" || s.status === "in-progress");
  const completedStepIds = steps.filter((s) => s.status === "completed").map((s) => s.id);
  const location: MinimizedProfile["location"] = { country: form.location.country };

  if (preferences.visibility !== "private") {
    location.city = form.location.city;
    if (preferences.locationPrecision === "zone" && preferences.selectedZoneId) {
      location.zoneId = preferences.selectedZoneId;
    }
  }

  const profile: MinimizedProfile = {
    visibility: preferences.visibility,
    category: form.category,
    location,
    nextStepId: nextStep?.id,
    nextStepTitle: nextStep?.title,
    completedStepIds,
  };

  if (preferences.visibility === "profile") {
    profile.businessType = form.businessType;
    profile.experience = form.experience;
    profile.budgetRange = budgetRange(form.budget);
  }

  return profile;
}

export function describeMinimizedProfile(profile: MinimizedProfile): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [
    { label: "Giro", value: profile.category },
    { label: "País", value: profile.location.country },
  ];
  if (profile.location.city) rows.push({ label: "Ciudad", value: profile.location.city });
  if (profile.location.zoneId) rows.push({ label: "Zona", value: profile.location.zoneId });
  if (profile.businessType) rows.push({ label: "Descripción del negocio", value: profile.businessType });
  if (profile.experience) rows.push({ label: "Experiencia", value: profile.experience });
  if (profile.budgetRange) rows.push({ label: "Rango de presupuesto", value: profile.budgetRange });
  rows.push({ label: "Siguiente paso", value: profile.nextStepTitle ?? "Sin paso pendiente" });
  rows.push({ label: "Pasos completados", value: String(profile.completedStepIds.length) });
  return rows;
}

export const NEVER_SHARED = ["Correo electrónico", "Nombre", "Presupuesto exacto", "Dirección"];
