import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getAiStatus, postJson, type AiStatus } from "../lib/api";
import { buildMinimizedProfile } from "../lib/privacy";
import { IconCheck } from "../components/icons";
import { generateReport } from "../lib/report";

interface InsightsResponse {
  source: "llm" | "fallback";
  model: string | null;
  insights: string[];
}

export default function Report() {
  const navigate = useNavigate();
  const { businessForm, report, preferences, steps, saveReport } = useApp();
  const ready = Boolean(businessForm && report);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [aiResult, setAiResult] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshingReport, setRefreshingReport] = useState(false);

  useEffect(() => {
    if (!ready) navigate("/formulario", { replace: true });
    else if (!preferences.onboardingComplete) navigate("/onboarding/mapa", { replace: true });
  }, [ready, preferences.onboardingComplete, navigate]);

  useEffect(() => {
    let cancelled = false;
    getAiStatus().then((s) => {
      if (!cancelled) setAiStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!businessForm || !report || !preferences.onboardingComplete) {
    return null;
  }

  const interpret = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = buildMinimizedProfile(businessForm, preferences, steps);
      const res = await postJson<InsightsResponse>("/api/insights", {
        profile,
        report: {
          sectorGrowthPercent: report.sectorGrowthPercent,
          sectorGrowthPeriod: report.sectorGrowthPeriod,
          localBusinessCount: report.localBusinessCount,
          avgMonthlyRevenue: report.avgMonthlyRevenue,
          survivalRate5Years: report.survivalRate5Years,
          demandTrend: report.demandTrend,
        },
      });
      setAiResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo consultar la IA");
    } finally {
      setLoading(false);
    }
  };

  const insights = aiResult?.insights ?? report.insights;
  const sourceLabel = report.marketSource === "inegi_denue_snapshot" ? "DENUE de INEGI" : report.marketSource === "openstreetmap" ? "OpenStreetMap" : "un directorio georreferenciado";

  const refreshReport = async () => {
    setRefreshingReport(true);
    setError(null);
    try {
      const refreshed = await generateReport(businessForm);
      saveReport(refreshed);
      setAiResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar el reporte");
    } finally {
      setRefreshingReport(false);
    }
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: 6 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="pill">Reporte de {businessForm.location.city}</span>
          {report.source === "llm" ? (
            <span className="pill pill-success">Generado con IA a partir de datos reales</span>
          ) : (
            <span className="pill pill-warn">Lectura base · datos locales + supuestos transparentes</span>
          )}
        </div>
        <h1>Así está el mercado para "{businessForm.businessType}"</h1>
        <p>
          {report.osmAvailable
            ? `El conteo de negocios en tu zona proviene de ${sourceLabel}. `
            : "No pudimos consultar un directorio georreferenciado en este momento, así que el conteo de negocios quedó en 0 — el resto del reporte sigue siendo una lectura base. "}
          Crecimiento, ingreso y supervivencia son una lectura razonada a partir de esos datos, no cifras oficiales. Nada de esto es una recomendación financiera.
        </p>
      </div>

      <div className="grid-4">
        <div className="card">
          <div className="muted">Crecimiento del sector</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accentBlue)" }}>
            +{report.sectorGrowthPercent}%
          </div>
          <div className="muted">{report.sectorGrowthPeriod} · estimación IA</div>
        </div>
        <div className="card">
          <div className="muted">Negocios similares</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{report.localBusinessCount}</div>
          <div className="muted">{report.osmAvailable ? `dato real · ${sourceLabel}` : "sin datos disponibles"}</div>
        </div>
        <div className="card">
          <div className="muted">Ingreso mensual prom.</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            ${report.avgMonthlyRevenue.toLocaleString()} MXN
          </div>
          <div className="muted">estimación IA · tu presupuesto</div>
        </div>
        <div className="card">
          <div className="muted">Sobrevive 5 años</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{report.survivalRate5Years}%</div>
          <div className="muted">estimación IA · no estadística oficial</div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2>Lo que dicen los datos</h2>
            <button className="btn btn-secondary" onClick={interpret} disabled={loading || aiStatus === null || !aiStatus.configured}>
              {loading ? "Interpretando…" : aiResult ? "Volver a interpretar" : "Interpretar con IA"}
            </button>
          </div>
          {insights.map((insight, i) => (
            <p key={i}>• {insight}</p>
          ))}
          <span className="muted" style={{ fontSize: 12.5 }}>
            {aiResult?.source === "llm" ? (
              <span className="row" style={{ gap: 6, alignItems: "center" }}>
                <span style={{ color: "var(--success)", display: "inline-flex" }}><IconCheck size={13} /></span>
                Reinterpretado con IA ({aiResult.model}) a partir de los indicadores de arriba y solo los datos que elegiste compartir. No es asesoría.
              </span>
            ) : report.source === "llm" ? (
              <span className="row" style={{ gap: 6, alignItems: "center" }}>
                <span style={{ color: "var(--success)", display: "inline-flex" }}><IconCheck size={13} /></span>
                Estos insights ya se generaron con IA al crear tu reporte, incluyendo lo que describiste sobre tu negocio. Puedes pedir una nueva lectura cuando quieras.
              </span>
            ) : aiStatus && !aiStatus.configured ? (
              "IA no configurada en el servidor: se muestra la interpretación base local."
            ) : (
              "Esta versión se generó como lectura base. Puedes regenerarla con IA cuando el servicio esté disponible."
            )}
          </span>
          {error && <span className="muted" style={{ color: "var(--warn)", fontSize: 12.5 }}>La IA no respondió ({error}).</span>}
          {report.source !== "llm" && <button className="btn btn-ghost" style={{ width: "fit-content" }} onClick={refreshReport} disabled={refreshingReport}>{refreshingReport ? "Actualizando lectura…" : "Regenerar reporte con IA"}</button>}
        </div>

        <div className="card stack" id="metodologia">
          <h2>Fuentes y método</h2>
          <p className="muted" style={{ fontSize: 13 }}>La IA interpreta los insumos listados; no navega ni inventa fuentes. Los indicadores estimados no son cifras publicadas por INEGI.</p>
          {(report.sources ?? []).map((s) => (
            <div key={s.name} className="stack" style={{ gap: 2 }}>
              {s.url.startsWith("#") ? <span style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</span> : <a href={s.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: 14 }}>
                {s.name}
              </a>}
              <span className="muted">
                {s.publisher} · {s.year}
              </span>
            </div>
          ))}
          <div className="stack" style={{ gap: 2, paddingTop: 8, borderTop: "1px solid var(--mainBorder)" }}>
            <a href="https://www.inegi.org.mx/app/mapa/denue/" target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: 14 }}>Consulta el directorio original</a>
            <span className="muted">DENUE de INEGI · valida nombre, giro y ubicación de establecimientos.</span>
          </div>
        </div>
      </div>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <button className="btn btn-secondary" onClick={() => navigate("/mapa-calor")}>
          Ver mapa de calor de oferta, demanda y costos
        </button>
        <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
          Quiero continuar con mi negocio
        </button>
        <button className="btn btn-ghost" onClick={() => navigate("/formulario")}>
          Editar mi información
        </button>
      </div>
    </div>
  );
}
