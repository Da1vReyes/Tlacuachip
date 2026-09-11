import type { Mentor, Provider, RoadmapStep } from "../types";

export const CATALOG_API_BASE = import.meta.env.VITE_CATALOG_SERVICE_URL ?? "http://localhost:4200";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${CATALOG_API_BASE}${path}`);
  if (!res.ok) throw new Error(`catalog-service ${path} failed: ${res.status}`);
  return res.json();
}

// Server rows have no `status` field — that's computed client-side from
// user progress in unlockNextSteps(), same as it always was for the static
// mockData list.
export function fetchRoadmapSteps() {
  return get<Omit<RoadmapStep, "status">[]>("/api/roadmap-steps");
}

export function fetchMentors() {
  return get<Mentor[]>("/api/mentors");
}

export function fetchProviders() {
  return get<Provider[]>("/api/providers");
}
