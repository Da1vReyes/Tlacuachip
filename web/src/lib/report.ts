import type { BusinessFormData, ReportData } from "../types";
import { API_BASE, postJson } from "./api";
import { generateMockReport } from "../data/mockData";

interface ServerReport {
  source: "llm" | "fallback";
  model: string | null;
  localBusinessCount: number;
  osmAvailable: boolean;
  sectorGrowthPercent: number;
  sectorGrowthPeriod: string;
  avgMonthlyRevenue: number;
  survivalRate5Years: number;
  demandTrend: "creciendo" | "estable" | "decreciendo";
  insights: string[];
}

function withSources(base: Omit<ReportData, "sources">): ReportData {
  const sources = base.osmAvailable
    ? [
        {
          name: "Negocios similares mapeados cerca de tu ciudad",
          publisher: "OpenStreetMap contributors",
          year: new Date().getFullYear(),
          url: "https://www.openstreetmap.org/copyright",
        },
      ]
    : [];
  if (base.source === "llm") {
    sources.push({
      name: "Lectura de mercado generada por IA a partir de tus datos",
      publisher: "OpenRouter",
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
 * already handles those internally), falls back to the fully local mock
 * generator so the app never blocks on a network problem.
 */
export async function generateReport(form: BusinessFormData): Promise<ReportData> {
  try {
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
    });
  } catch (err) {
    console.warn(`No se pudo contactar ${API_BASE} para el reporte, usando datos locales:`, err);
    const mock = generateMockReport(form);
    return { ...mock, source: "fallback", osmAvailable: false };
  }
}
