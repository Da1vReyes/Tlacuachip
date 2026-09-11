import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import { useApp } from "../context/AppContext";
import { useCityCenter } from "../hooks/useCityCenter";
import { useDensity } from "../hooks/useDensity";
import { useCountUp } from "../hooks/useCountUp";
import { IconTrendUp, IconRoute, IconChat, IconMap, IconUsers, IconHelp } from "../components/icons";
import { buildMinimizedProfile } from "../lib/privacy";
import { providerKindLabel, rankProviders } from "../lib/matching";

const ROW_OFFSET = [-0.011, 0, 0.011];
const COL_OFFSET = [-0.014, 0, 0.014];

function supplyColor(value: number) { return value >= 72 ? "#c8583a" : value >= 54 ? "#e09b4c" : value >= 36 ? "#e0c76a" : "#92ad94"; }

function KpiValue({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const animated = useCountUp(value);
  return (
    <span className="kpi-value">
      {prefix}
      {animated.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { businessForm, report, steps, progress, preferences, savePreferences, catalogProviders: providers } = useApp();
  const { center } = useCityCenter(businessForm);
  const { data: density } = useDensity(center, businessForm?.category ?? null);

  const revenueSeries = useMemo(() => {
    if (!report) return [];
    const base = report.avgMonthlyRevenue * 0.55;
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return months.map((m, i) => ({
      month: m,
      ingreso: Math.round(base + (report.avgMonthlyRevenue - base) * Math.min(1, i / 8) + Math.sin(i) * base * 0.06),
    }));
  }, [report]);

  const ready = Boolean(businessForm && report);

  useEffect(() => {
    if (!ready) navigate("/formulario", { replace: true });
    else if (!preferences.onboardingComplete) navigate("/onboarding/mapa", { replace: true });
  }, [ready, preferences.onboardingComplete, navigate]);

  if (!businessForm || !report || !preferences.onboardingComplete) {
    return null;
  }

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const nextStep = steps.find((s) => s.status === "available" || s.status === "in-progress");
  const formalizationPct = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;
  const marketCount = density?.totalPoints ?? null;
  const teamPicks = rankProviders(buildMinimizedProfile(businessForm, preferences, steps), providers, steps).slice(0, 3);
  const lowestSupplyZone = density ? [...density.zones].sort((a, b) => a.supplyScore - b.supplyScore)[0] : null;
  const zonePositions =
    center && density
      ? density.zones.map((z) => ({ ...z, lat: center[0] + ROW_OFFSET[z.row], lng: center[1] + COL_OFFSET[z.col] }))
      : [];

  return (
    <div className="stack" style={{ gap: 20 }}>
      {!preferences.tutorialSeen && (
        <div className="card row" style={{ alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", background: "var(--navItemActiveBg)", borderColor: "var(--accentBlue)" }}>
          <div className="row" style={{ alignItems: "center", gap: 10 }}>
            <IconHelp size={18} />
            <span style={{ fontSize: 13.5 }}>¿Primera vez aquí? Un recorrido de 2 minutos por el flujo completo y cómo funciona tu equipo.</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary" onClick={() => navigate("/tutorial")}>Ver tutorial</button>
            <button className="btn btn-ghost" onClick={() => savePreferences({ tutorialSeen: true })}>Ya lo vi</button>
          </div>
        </div>
      )}

      <div className="stack" style={{ gap: 4 }}>
        <span className="pill">{businessForm.location.city}, {businessForm.location.state}</span>
        <h1>Centro de lanzamiento: {businessForm.businessType}</h1>
        <p>Una lectura operable de tu mercado, formalización y red. Empieza por la acción que mueve tu negocio hoy.</p>
      </div>

      <section className="launch-command-center" aria-label="Estado de lanzamiento">
        <div className="launch-primary">
          <span className="launch-eyebrow">Tu siguiente movimiento</span>
          <h2>{nextStep?.title ?? "Tu ruta está al día"}</h2>
          <p>{nextStep ? nextStep.description : "Has documentado todos los pasos disponibles en esta versión de la ruta."}</p>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            {nextStep && <button className="btn btn-primary" onClick={() => navigate(`/paso/${nextStep.id}`)}>Abrir siguiente paso</button>}
            <button className="btn btn-secondary" onClick={() => navigate("/mapa-calor")}>Revisar mi zona</button>
          </div>
        </div>
        <div className="launch-signal-grid">
          <div className="launch-signal"><span>Oferta local</span><strong>{marketCount === null ? "…" : marketCount.toLocaleString()}</strong><small>{density?.source === "inegi_denue_snapshot" ? "establecimientos DENUE en el área" : "lugares similares encontrados"}</small></div>
          <div className="launch-signal"><span>Ruta formal</span><strong>{formalizationPct}%</strong><small>{completedCount} de {steps.length} pasos documentados</small></div>
          <div className="launch-signal"><span>Red disponible</span><strong>{providers.length}</strong><small>{providers.length === 1 ? "perfil real para contactar" : "perfiles reales para contactar"}</small></div>
        </div>
        <div className="launch-evidence"><span className="data-proof"><i />Evidencia activa</span><p><strong>Fuente de mercado:</strong> {density?.source === "inegi_denue_snapshot" ? "DENUE / INEGI, snapshot local de CDMX" : density ? "OpenStreetMap" : "cargando fuente"}. Lo que no está respaldado por fuente se marca como hipótesis, no como dato.</p></div>
      </section>

      <div className="grid-4 stagger">
        <div className="card card-hover">
          <div className="muted">Ingreso mensual proyectado</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            <KpiValue value={report.avgMonthlyRevenue} prefix="$" suffix=" MXN" />
          </div>
          <div className="row" style={{ alignItems: "center", gap: 4, marginTop: 4 }}>
            <span style={{ color: "var(--success)" }}>
              <IconTrendUp size={14} />
            </span>
            <span className="muted">+{report.sectorGrowthPercent}% sector</span>
          </div>
        </div>
        <div className="card card-hover">
          <div className="muted">Negocios similares</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            <KpiValue value={report.localBusinessCount} />
          </div>
          <div className="muted" style={{ marginTop: 4 }}>en tu zona</div>
        </div>
        <div className="card card-hover">
          <div className="muted">Sobrevive 5 años</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            <KpiValue value={report.survivalRate5Years} suffix="%" />
          </div>
          <div className="muted" style={{ marginTop: 4 }}>tasa histórica del sector</div>
        </div>
        <div className="card card-hover">
          <div className="muted">Tu progreso</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            <KpiValue value={completedCount} suffix={` / ${steps.length}`} />
          </div>
          <div className="muted" style={{ marginTop: 4 }}>pasos completados · Nivel {progress.level}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, alignItems: "start" }}>
        <div className="card">
          <h2>Proyección de ingresos</h2>
          <p style={{ marginBottom: 8 }}>Estimado mensual basado en tu presupuesto y el crecimiento del sector.</p>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3870e3" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3870e3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.5)" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip
              formatter={(v) => [`$${Number(v ?? 0).toLocaleString()} MXN`, "Ingreso"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid var(--cardBorder)", fontSize: 12.5 }}
                />
                <Area
                  type="monotone"
                  dataKey="ingreso"
                  stroke="#3870e3"
                  strokeWidth={2.5}
                  fill="url(#revFill)"
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card stack"><h2>Tu presupuesto inicial</h2><p>No repartimos tu dinero con porcentajes inventados. Cuando tengas cotizaciones reales, aquí podrás compararlas contra tu presupuesto de ${businessForm.budget.toLocaleString()} MXN.</p><button className="btn btn-secondary" onClick={() => navigate("/equipo")}>Buscar apoyo financiero</button></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, alignItems: "start" }}>
        <button type="button" className="card card-clickable card-button" style={{ padding: 0, overflow: "hidden" }} onClick={() => navigate("/mapa-calor")}>
          <div style={{ height: 160 }}>
            {center && density ? (
              <MapContainer center={center} zoom={13} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} attributionControl={false} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {zonePositions.map((z) => (
                  <CircleMarker
                    key={z.id}
                    center={[z.lat, z.lng]}
                    radius={z.id === preferences.selectedZoneId ? 16 : 12}
                    pathOptions={{ color: "#fff", weight: 1.5, fillColor: supplyColor(z.supplyScore), fillOpacity: 0.8 }}
                  />
                ))}
              </MapContainer>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="muted">Cargando mapa…</span>
              </div>
            )}
          </div>
          <div className="stack" style={{ padding: 16, gap: 4 }}>
            <div className="row" style={{ alignItems: "center", gap: 6 }}>
              <IconMap size={15} />
              <h2>Mapa de calor</h2>
            </div>
            {lowestSupplyZone && <p>Menor concentración: <strong style={{ color: "var(--primaryText)" }}>{lowestSupplyZone.name}</strong> ({lowestSupplyZone.supplyScore}/100)</p>}
          </div>
        </button>

        <button type="button" className="card card-clickable card-button" onClick={() => navigate("/roadmap")}>
          <div className="row" style={{ alignItems: "center", gap: 6 }}>
            <IconRoute size={15} />
            <h2>Tu camino</h2>
          </div>
          <div className="stack" style={{ gap: 10, marginTop: 10 }}>
            <div className="progress-track">
              <div className="progress-fill" style={{ transform: `scaleX(${completedCount / Math.max(steps.length, 1)})` }} />
            </div>
            <span className="muted">
              {completedCount} de {steps.length} pasos completados
            </span>
            {steps.find((s) => s.status === "available") && (
              <div className="pop-in pill pill-warn" style={{ marginTop: 4 }}>
                Siguiente: {steps.find((s) => s.status === "available")?.title}
              </div>
            )}
          </div>
        </button>

        <div className="card">
          <div className="row" style={{ alignItems: "center", gap: 6, justifyContent: "space-between" }}>
            <div className="row" style={{ alignItems: "center", gap: 6 }}>
              <IconChat size={15} />
              <h2>Comunidad</h2>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate("/comunidad")}>
              Ver todo
            </button>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>Publica una duda o responde a alguien que ya recorrió un paso parecido. La conversación se guarda en tu cuenta, no es contenido de muestra.</p>
        </div>
      </div>

      {teamPicks.length > 0 && (
        <div className="card stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div className="row" style={{ alignItems: "center", gap: 6 }}>
              <IconUsers size={15} />
              <h2>Tu equipo para el siguiente paso</h2>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate("/equipo")}>Ver recomendación completa</button>
          </div>
          <div className="grid-3 stagger">
            {teamPicks.map(({ provider, reason }) => (
              <div key={provider.id} className="stack" style={{ gap: 4, paddingTop: 8, borderTop: "1px solid var(--mainBorder)" }}>
                <div className="row" style={{ gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13 }}>{provider.name}</strong>
                  <span className="pill">{providerKindLabel[provider.kind]}</span>
                  {provider.isAI && <span className="pill pill-warn">IA</span>}
                  {provider.isDemo && <span className="pill">Demo</span>}
                </div>
                <span className="muted" style={{ fontSize: 12.5 }}>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card stack">
        <h2>Lo que dicen los datos de tu sector</h2>
        <div className="grid-3 stagger" style={{ marginTop: 4 }}>
          {report.insights.map((insight, i) => (
            <div key={i} className="card" style={{ background: "var(--secondaryBg)", boxShadow: "none" }}>
              <p style={{ color: "var(--primaryText)" }}>{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
