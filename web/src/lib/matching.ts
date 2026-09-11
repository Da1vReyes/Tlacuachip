import type { Provider, RoadmapStep, TeamRecommendation } from "../types";
import type { MinimizedProfile } from "./privacy";

export const providerKindLabel: Record<Provider["kind"], string> = {
  abogado: "Abogado/a",
  contador: "Contador/a",
  "asesor-financiero": "Asesor/a financiero",
  marketing: "Marketing",
  gestoria: "Gestoría de trámites",
  insumos: "Proveedor de insumos",
};

interface Scored {
  provider: Provider;
  score: number;
  forStepId?: string;
  reason: string;
}

// Deterministic ranking. Used directly when the AI isn't configured, and
// server-side to pre-select the candidates the model gets to choose from.
export function rankProviders(profile: MinimizedProfile, providers: Provider[], steps: RoadmapStep[]): Scored[] {
  const nextStep = steps.find((s) => s.id === profile.nextStepId);
  const upcoming = steps.filter((s) => s.status !== "completed").map((s) => s.id);

  return providers
    .map((provider) => {
      let score = provider.rating;
      const reasons: string[] = [];
      let forStepId: string | undefined;

      if (nextStep && provider.helpsWith.includes(nextStep.id)) {
        score += 6;
        forStepId = nextStep.id;
        reasons.push(`atiende tu siguiente paso: ${nextStep.title}`);
      } else {
        const future = provider.helpsWith.find((id) => upcoming.includes(id));
        if (future) {
          score += 2;
          forStepId = future;
          const step = steps.find((s) => s.id === future);
          if (step) reasons.push(`te servirá en “${step.title}”`);
        }
      }

      if (provider.category !== "general") {
        if (provider.category === profile.category) {
          score += 2;
          reasons.push("especializado en tu giro");
        } else {
          score -= 4;
        }
      }

      if (profile.location.city && provider.city === profile.location.city) {
        score += 2;
        reasons.push("está en tu ciudad");
      } else if (provider.isAI) {
        score += 1;
        reasons.push("disponible en línea de inmediato");
      }

      return { provider, score, forStepId, reason: reasons.join(" · ") || "buena calificación en la red" };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function toRecommendations(scored: Scored[], limit = 6): TeamRecommendation[] {
  return scored.slice(0, limit).map((s) => ({ providerId: s.provider.id, reason: s.reason, forStepId: s.forStepId }));
}
