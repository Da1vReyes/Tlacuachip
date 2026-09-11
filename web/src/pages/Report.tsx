import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Report() {
  const navigate = useNavigate();
  const { businessForm, report, preferences } = useApp();
  const ready = Boolean(businessForm && report);

  useEffect(() => {
    if (!ready) navigate("/formulario", { replace: true });
    else if (!preferences.onboardingComplete) navigate("/onboarding/mapa", { replace: true });
  }, [ready, preferences.onboardingComplete, navigate]);

  if (!businessForm || !report || !preferences.onboardingComplete) return null;

  const sourceLabel = report.marketSource === "inegi_denue_snapshot" ? "DENUE de INEGI" : report.marketSource === "openstreetmap" ? "OpenStreetMap" : "directorio local";
  const takeaways = report.insights.slice(0, 2);

  return <div className="stack" style={{ gap: 24, maxWidth: 1120 }}>
    <header className="stack" style={{ gap: 5 }}>
      <span className="step-resource-kicker">{businessForm.location.city} · {businessForm.businessType}</span>
      <h1>Tu mercado, en breve</h1>
      <p>Dos señales para observar antes de comprometer tu dinero.</p>
    </header>

    <section className="grid-2">
      <article className="card stack" style={{ gap: 5 }}>
        <span className="muted" style={{ fontSize: 12 }}>Oferta cerca de ti</span>
        <strong style={{ fontSize: 28 }}>{report.osmAvailable ? report.localBusinessCount : "—"}</strong>
        <span className="muted" style={{ fontSize: 13 }}>{report.osmAvailable ? `negocios similares · ${sourceLabel}` : "Sin conteo disponible ahora"}</span>
      </article>
      <article className="card stack" style={{ gap: 5 }}>
        <span className="muted" style={{ fontSize: 12 }}>Señal del sector</span>
        <strong style={{ fontSize: 22 }}>{report.demandTrend}</strong>
        <span className="muted" style={{ fontSize: 13 }}>es una señal para investigar, no una recomendación</span>
      </article>
    </section>

    <section className="card stack" style={{ gap: 12 }}>
      <div><span className="step-resource-kicker">Qué mirar antes de decidir</span><h2 style={{ margin: "4px 0 0" }}>La lectura para tu caso</h2></div>
      <div className="stack" style={{ gap: 10 }}>{takeaways.map((takeaway, index) => <p key={index} style={{ margin: 0 }}>{takeaway}</p>)}</div>
      <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Tlacuachic organiza información para que decidas con criterio; no decide la zona ni el negocio por ti.</p>
    </section>

    <details className="card report-advanced">
      <summary>Ver datos avanzados</summary>
      <div className="stack" style={{ gap: 16, paddingTop: 16 }}>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>Indicadores para contrastar con un contador, mentor o visita de campo. Las estimaciones no son cifras oficiales.</p>
        <div className="grid-3">
          <div className="stack" style={{ gap: 3 }}><span className="muted" style={{ fontSize: 12 }}>Crecimiento del sector</span><strong>+{report.sectorGrowthPercent}%</strong><span className="muted" style={{ fontSize: 12 }}>{report.sectorGrowthPeriod} · estimación</span></div>
          <div className="stack" style={{ gap: 3 }}><span className="muted" style={{ fontSize: 12 }}>Ingreso mensual de referencia</span><strong>${report.avgMonthlyRevenue.toLocaleString()} MXN</strong><span className="muted" style={{ fontSize: 12 }}>estimación según tu presupuesto</span></div>
          <div className="stack" style={{ gap: 3 }}><span className="muted" style={{ fontSize: 12 }}>Supervivencia a 5 años</span><strong>{report.survivalRate5Years}%</strong><span className="muted" style={{ fontSize: 12 }}>estimación, no estadística oficial</span></div>
        </div>
        {(report.sources?.length ?? 0) > 0 && <div className="stack" style={{ gap: 7, borderTop: "1px solid var(--mainBorder)", paddingTop: 12 }}><strong style={{ fontSize: 13 }}>Fuentes disponibles</strong>{report.sources?.map((source) => source.url.startsWith("#") ? <span className="muted" style={{ fontSize: 13 }} key={source.name}>{source.name} · {source.publisher}, {source.year}</span> : <a key={source.name} href={source.url} target="_blank" rel="noreferrer">{source.name} · {source.publisher}, {source.year}</a>)}</div>}
      </div>
    </details>

    <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
      <button className="btn btn-secondary" onClick={() => navigate("/mapa-calor")}>Explorar zonas</button>
      <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>Empezar mi ruta</button>
    </div>
  </div>;
}
