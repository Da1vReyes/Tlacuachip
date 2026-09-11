// Deterministic ranking, mirrored from web/src/lib/matching.ts. Used as the
// fallback when the model is unavailable and to build the "did the model
// pick from the allowed list" check on its output.

export function rankCandidates(profile, candidates, steps) {
  const nextStep = steps.find((s) => s.id === profile.nextStepId);
  const upcoming = steps.filter((s) => s.status !== "completed").map((s) => s.id);

  return candidates
    .map((provider) => {
      let score = provider.rating;
      const reasons = [];
      let forStepId;

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

      if (profile.location.city && provider.city === profile.location.city) {
        score += 2;
        reasons.push("está en tu ciudad");
      } else if (provider.isAI) {
        score += 1;
        reasons.push("disponible en línea de inmediato");
      }

      return { providerId: provider.id, score, forStepId, reason: reasons.join(" · ") || "buena calificación en la red" };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ providerId, forStepId, reason }) => ({ providerId, forStepId, reason }));
}

export function fallbackInsights(profile, report) {
  const city = profile.location.city ? ` en ${profile.location.city}` : "";
  const insights = [
    `Hay ${report.localBusinessCount} negocios similares registrados${city}: hay mercado, pero también competencia directa que conviene ubicar antes de elegir local.`,
    report.sectorGrowthPercent > 0
      ? `El sector muestra un crecimiento estimado de ${report.sectorGrowthPercent}% (${report.sectorGrowthPeriod}); la tendencia de demanda es ${report.demandTrend}.`
      : `El sector no muestra crecimiento estimado en ${report.sectorGrowthPeriod}; valida la demanda antes de comprometer inversión.`,
    `${report.survivalRate5Years}% de negocios de este tipo siguen abiertos a los 5 años; la diferencia suele estar en formalizarse a tiempo y controlar el flujo de efectivo.`,
  ];
  if (profile.nextStepTitle) {
    insights.push(`Tu siguiente paso en la ruta es “${profile.nextStepTitle}”; resolverlo antes de firmar o invertir evita el error más caro.`);
  }
  return insights;
}
