import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Report() {
  const navigate = useNavigate();
  const { businessForm, report } = useApp();
  const ready = Boolean(businessForm && report);

  useEffect(() => {
    if (!ready) navigate("/formulario", { replace: true });
  }, [ready, navigate]);

  if (!businessForm || !report) {
    return null;
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: 6 }}>
        <span className="pill">Reporte de {businessForm.location.city}</span>
        <h1>Así está el mercado para "{businessForm.businessType}"</h1>
        <p>
          Esta información viene de fuentes públicas y oficiales. No es una recomendación,
          es contexto para que decidas con datos reales.
        </p>
      </div>

      <div className="grid-4">
        <div className="card">
          <div className="muted">Crecimiento del sector</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accentBlue)" }}>
            +{report.sectorGrowthPercent}%
          </div>
          <div className="muted">{report.sectorGrowthPeriod}</div>
        </div>
        <div className="card">
          <div className="muted">Negocios similares</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{report.localBusinessCount}</div>
          <div className="muted">registrados</div>
        </div>
        <div className="card">
          <div className="muted">Ingreso mensual prom.</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            ${report.avgMonthlyRevenue.toLocaleString()} MXN
          </div>
        </div>
        <div className="card">
          <div className="muted">Sobrevive 5 años</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{report.survivalRate5Years}%</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card stack">
          <h2>Lo que dicen los datos</h2>
          {report.insights.map((insight, i) => (
            <p key={i}>• {insight}</p>
          ))}
        </div>

        <div className="card stack">
          <h2>Fuentes</h2>
          {report.sources.map((s) => (
            <div key={s.name} className="stack" style={{ gap: 2 }}>
              <a href={s.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: 14 }}>
                {s.name}
              </a>
              <span className="muted">
                {s.publisher} · {s.year}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="row">
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
