import type { BusinessFormData, ReportData } from "../types";
import { postJson } from "./api";

interface ServerReport {
  source: "llm" | "fallback";
  model: string | null;
  localBusinessCount: number;
  osmAvailable: boolean;
  marketSource?: string | null;
  sectorGrowthPercent: number;
  sectorGrowthPeriod: string;
  avgMonthlyRevenue: number;
  survivalRate5Years: number;
  demandTrend: "creciendo" | "estable" | "decreciendo";
  insights: string[];
}

function withSources(base: Omit<ReportData, "sources">): ReportData {
  const usesDenue = base.marketSource === "inegi_denue_snapshot";
  const sourceKnown = usesDenue || base.marketSource === "openstreetmap";
  const sources = base.osmAvailable
    ? [
        {
          name: usesDenue ? "DENUE: establecimientos similares cerca de tu ciudad" : sourceKnown ? "Negocios similares mapeados cerca de tu ciudad" : "Directorio georreferenciado usado en la lectura anterior",
          publisher: usesDenue ? "INEGI" : sourceKnown ? "OpenStreetMap contributors" : "Fuente a actualizar",
          year: new Date().getFullYear(),
          url: usesDenue ? "https://www.inegi.org.mx/app/mapa/denue/" : sourceKnown ? "https://www.openstreetmap.org/copyright" : "https://www.inegi.org.mx/app/mapa/denue/",
        },
      ]
    : [];
  sources.push({
    name: "Información de tu negocio",
    publisher: "Formulario de Tlacuachic · solo datos que tú ingresaste",
    year: new Date().getFullYear(),
    url: "#metodologia",
  });
  if (base.source === "llm") {
    sources.push({
      name: "Interpretación de los insumos anteriores",
      publisher: "OpenRouter · no es una fuente de datos ni una búsqueda web",
      year: new Date().getFullYear(),
      url: "https://openrouter.ai",
    });
  }
  return { ...base, sources };
}

/**
 * Gets a market report for this business. Tries the real endpoint first
 * (real OSM competition count + AI reasoning, server/src/report.js); if the
 * server itself is unreachable (not just the AI or Overpass — the server
 * already handles those internally), surfaces that error instead of
 * fabricating a market report in the browser.
 */
export async function generateReport(form: BusinessFormData): Promise<ReportData> {
  const server = await postJson<ServerReport>("/api/report", form);
  return withSources({
    sectorGrowthPercent: server.sectorGrowthPercent,
    sectorGrowthPeriod: server.sectorGrowthPeriod,
    localBusinessCount: server.localBusinessCount,
    avgMonthlyRevenue: server.avgMonthlyRevenue,
    survivalRate5Years: server.survivalRate5Years,
    demandTrend: server.demandTrend,
    insights: server.insights,
    source: server.source,
    osmAvailable: server.osmAvailable,
    marketSource: server.marketSource,
  });
}
