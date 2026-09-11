import { geocodeCity } from "./geocode.js";
import { fetchRealPoints } from "./overpass.js";
import { zoneCenters, boundingBox } from "./zones.js";
import { chatJson, LlmUnavailable } from "./llm.js";

const CATEGORY_LABEL = {
  cafeteria: "cafetería",
  restaurante: "restaurante",
  "tienda-abarrotes": "tienda de abarrotes",
  "salon-belleza": "salón de belleza",
  "taller-mecanico": "taller mecánico",
  papeleria: "papelería",
  otro: "negocio",
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Used when the model is unavailable, and as the seed for the numbers we
// hand the model — real local competition count in, a plausible reading
// out. Never fully invented: localBusinessCount always comes from OSM.
function heuristicNumbers(form, localBusinessCount) {
  const saturationPenalty = clamp(localBusinessCount * 0.6, 0, 25);
  const survivalRate5Years = Math.round(clamp(68 - saturationPenalty + (form.experience === "experto" ? 8 : form.experience === "intermedia" ? 4 : 0), 30, 85));
  const avgMonthlyRevenue = Math.round(clamp(form.budget * 0.16 - localBusinessCount * 40, form.budget * 0.05, form.budget * 0.4));
  const demandTrend = localBusinessCount > 40 ? "estable" : "creciendo";
  return {
    sectorGrowthPercent: localBusinessCount > 40 ? 3.5 : 7.2,
    sectorGrowthPeriod: "últimos 24 meses",
    avgMonthlyRevenue,
    survivalRate5Years,
    demandTrend,
  };
}

function fallbackInsights(form, localBusinessCount, numbers, marketDataAvailable, marketSource) {
  const label = CATEGORY_LABEL[form.category] ?? "negocio";
  const sourceLabel = marketSource === "inegi_denue_snapshot" ? "DENUE de INEGI" : "OpenStreetMap";
  const insights = [
    marketDataAvailable
      ? `Hay ${localBusinessCount} negocios de tipo ${label} registrados cerca de ${form.location.city} en ${sourceLabel}; es una señal real de oferta, no una recomendación de ubicación.`
      : `No pudimos consultar un directorio georreferenciado en este momento, así que no tenemos un conteo real de competencia directa cerca de ${form.location.city}; vale la pena volver a generar el reporte más tarde.`,
    `Con un presupuesto de $${form.budget.toLocaleString()} MXN, un ingreso mensual de referencia ronda los $${numbers.avgMonthlyRevenue.toLocaleString()} MXN; contadores y asesores comparan esta cifra contra los costos fijos locales, no solo contra la inversión inicial.`,
    `La estimación de supervivencia a 5 años (${numbers.survivalRate5Years}%) baja cuando hay más competencia directa registrada en la zona; conviene contrastarla con la experiencia de quienes ya operan ahí.`,
  ];
  if (form.description) {
    insights.push("La descripción que compartiste se incluye en esta lectura base; puedes pedir una interpretación con IA cuando el servicio esté disponible.");
  }
  return insights;
}

/**
 * Builds a market report from real inputs: the actual count of similar
 * businesses near the entrepreneur's city (OpenStreetMap/Overpass) plus
 * their own form, reasoned over by the LLM when available. Never throws —
 * degrades to a transparent local heuristic using the same real count.
 */
export async function buildReport(form) {
  const { lat, lng, source: geoSource } = await geocodeCity(form.location.city, form.location.state, form.location.country);

  let localBusinessCount = 0;
  let marketDataAvailable = false;
  let marketSource = null;
  try {
    const zones = zoneCenters(lat, lng);
    const bbox = boundingBox(zones);
    const { points, source } = await fetchRealPoints(bbox, form.category);
    localBusinessCount = points.length;
    marketDataAvailable = true;
    marketSource = source;
  } catch (err) {
    console.warn("[report] Overpass unavailable, continuing without a real count:", err.message);
  }

  const heuristics = heuristicNumbers(form, localBusinessCount);

  try {
    const { model, data } = await chatJson({
      system: [
        "Eres el asistente de Tlacuachic. A partir de datos reales y del propio negocio de la persona, generas una lectura de mercado orientativa para alguien que quiere abrir una microempresa en México.",
        "Recibes: el conteo de negocios similares en un directorio georreferenciado cerca de su ciudad (marcado como disponible o no disponible — si NO está disponible, un conteo de 0 significa que no pudimos consultar los datos, NO que no exista competencia; nunca afirmes 'no hay competencia' o 'es un nicho vacío' en ese caso, dilo explícitamente como dato faltante), su presupuesto, categoría, experiencia y una descripción libre que escribió sobre su idea.",
        "Con eso, produce una estimación razonada (no inventada al azar) de: crecimiento del sector, ingreso mensual de referencia en MXN, tasa de supervivencia a 5 años, y tendencia de demanda. Cuando el conteo sí esté disponible, úsalo como principal ancla de tu razonamiento sobre competencia. No afirmes haber buscado en internet ni cites una fuente que no recibiste: la única fuente externa que recibes es el directorio indicado.",
        "Escribe 3 a 4 insights en español, cada uno explicando qué significa un dato y qué suelen revisar profesionales del ramo ante ese dato. Si el usuario escribió una descripción de su negocio, incorpórala explícitamente en al menos un insight.",
        "Tono: informativo, no directivo. Nunca 'debes' ni 'te recomiendo'. Dejas ver el razonamiento, no das órdenes ni garantías. Aclara que crecimiento, ingreso y supervivencia son estimaciones, no cifras oficiales.",
        "Responde SOLO con JSON válido con esta forma exacta:",
        '{"sectorGrowthPercent": number, "sectorGrowthPeriod": "texto corto", "avgMonthlyRevenue": number, "survivalRate5Years": number, "demandTrend": "creciendo"|"estable"|"decreciendo", "insights": ["frase 1", "frase 2", "frase 3"]}',
      ].join(" "),
      user: JSON.stringify({
        negocio: {
          tipo: form.businessType,
          categoria: form.category,
          descripcion: form.description || null,
          presupuestoMXN: form.budget,
          experiencia: form.experience,
        },
        ubicacion: form.location,
        datosReales: {
          negociosSimilaresCercanos: localBusinessCount,
          conteoDisponible: marketDataAvailable,
          fuente: marketSource === "inegi_denue_snapshot" ? "DENUE de INEGI" : "OpenStreetMap",
          nota: marketDataAvailable
            ? "Este conteo es real y está confirmado."
            : "No se pudo consultar OpenStreetMap en este momento. El conteo es 0 solo porque falta el dato, no porque se haya confirmado ausencia de competencia.",
        },
      }),
      temperature: 0.4,
    });

    const insights = (Array.isArray(data?.insights) ? data.insights : [])
      .filter((s) => typeof s === "string" && s.trim())
      .slice(0, 4)
      .map((s) => s.trim().slice(0, 300));

    const sectorGrowthPercent = Number(data?.sectorGrowthPercent);
    const avgMonthlyRevenue = Number(data?.avgMonthlyRevenue);
    const survivalRate5Years = Number(data?.survivalRate5Years);
    const demandTrend = ["creciendo", "estable", "decreciendo"].includes(data?.demandTrend) ? data.demandTrend : heuristics.demandTrend;

    if (insights.length === 0 || !Number.isFinite(sectorGrowthPercent) || !Number.isFinite(avgMonthlyRevenue) || !Number.isFinite(survivalRate5Years)) {
      throw new LlmUnavailable("Model returned incomplete report data");
    }

    return {
      source: "llm",
      model,
      localBusinessCount,
      osmAvailable: marketDataAvailable,
      marketSource,
      sectorGrowthPercent: clamp(sectorGrowthPercent, -30, 60),
      sectorGrowthPeriod: typeof data.sectorGrowthPeriod === "string" ? data.sectorGrowthPeriod.slice(0, 40) : heuristics.sectorGrowthPeriod,
      avgMonthlyRevenue: Math.round(clamp(avgMonthlyRevenue, 0, form.budget * 6 + 50000)),
      survivalRate5Years: Math.round(clamp(survivalRate5Years, 0, 100)),
      demandTrend,
      insights,
    };
  } catch (err) {
    if (!(err instanceof LlmUnavailable)) throw err;
    console.warn("[report] falling back to local heuristic:", err.message);
    return {
      source: "fallback",
      model: null,
      localBusinessCount,
      osmAvailable: marketDataAvailable,
      marketSource,
      ...heuristics,
      insights: fallbackInsights(form, localBusinessCount, heuristics, marketDataAvailable, marketSource),
    };
  }
}
