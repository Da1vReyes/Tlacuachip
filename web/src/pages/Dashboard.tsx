import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import { useApp } from "../context/AppContext";
import { useCityCenter } from "../hooks/useCityCenter";
import { useDensity } from "../hooks/useDensity";
import { IconRoute, IconChat, IconMap, IconUsers, IconHelp } from "../components/icons";
import { buildMinimizedProfile } from "../lib/privacy";
import { providerKindLabel, rankProviders } from "../lib/matching";

const ROW_OFFSET = [-0.011, 0, 0.011];
const COL_OFFSET = [-0.014, 0, 0.014];

function supplyColor(value: number) { return value >= 72 ? "#c8583a" : value >= 54 ? "#e09b4c" : value >= 36 ? "#e0c76a" : "#92ad94"; }

export default function Dashboard() {
  const navigate = useNavigate();
  const { businessForm, report, steps, preferences, savePreferences, catalogProviders: providers } = useApp();
  const { center } = useCityCenter(businessForm, preferences.selectedLocation);
  const { data: density } = useDensity(center, businessForm?.category ?? null);

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
        <h1>{businessForm.businessType}</h1>
        <p>Tu negocio tiene un solo foco ahora: completar el siguiente paso con la información y las personas que necesites.</p>
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

    </div>
  );
}
