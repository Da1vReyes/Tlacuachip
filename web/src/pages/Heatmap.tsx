import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";
import { useApp } from "../context/AppContext";
import { generateMockHeatmap } from "../data/mockData";
import { useCityCenter } from "../hooks/useCityCenter";
import { useDensity } from "../hooks/useDensity";
import type { ZoneMetrics } from "../types";

type Metric = "opportunityScore" | "demand" | "supply" | "cost";

const metricMeta: Record<Metric, { label: string; low: string; high: string; goodIsHigh: boolean }> = {
  opportunityScore: { label: "Oportunidad", low: "Baja", high: "Alta", goodIsHigh: true },
  demand: { label: "Demanda", low: "Baja", high: "Alta", goodIsHigh: true },
  supply: { label: "Oferta (competencia)", low: "Poca", high: "Mucha", goodIsHigh: false },
  cost: { label: "Costo de operar", low: "Bajo", high: "Alto", goodIsHigh: false },
};

function colorFor(value: number, goodIsHigh: boolean) {
  const score = goodIsHigh ? value : 100 - value;
  if (score >= 70) return "#238c63";
  if (score >= 55) return "#6fa98a";
  if (score >= 40) return "#e0c76a";
  if (score >= 25) return "#e0a15b";
  return "#c8583a";
}

function opportunityFrom(demand: number, supply: number, cost: number) {
  return Math.max(0, Math.min(100, Math.round(demand * 0.55 - supply * 0.35 - cost * 0.15 + 45)));
}

const ROW_OFFSET = [-0.011, 0, 0.011];
const COL_OFFSET = [-0.014, 0, 0.014];

export default function Heatmap() {
  const navigate = useNavigate();
  const { businessForm, preferences } = useApp();
  const [metric, setMetric] = useState<Metric>("opportunityScore");
  const [selected, setSelected] = useState<ZoneMetrics | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const { center, status: geoStatus } = useCityCenter(businessForm);
  const { data: density, status: densityStatus } = useDensity(center, businessForm?.category ?? null);

  const mockHeatmap = useMemo(() => (businessForm ? generateMockHeatmap(businessForm) : null), [businessForm]);

  const heatmap = useMemo(() => {
    if (!mockHeatmap) return null;
    if (!density) return mockHeatmap;
    const byId = new Map(density.zones.map((z) => [z.id, z]));
    return {
      ...mockHeatmap,
      zones: mockHeatmap.zones.map((z) => {
        const real = byId.get(z.id);
        if (!real) return z;
        const opportunityScore = opportunityFrom(z.demand, real.supplyScore, z.cost);
        return { ...z, supply: real.supplyScore, opportunityScore };
      }),
    };
  }, [mockHeatmap, density]);

  const isReal = densityStatus === "ok" && !!density;

  useEffect(() => {
    setRevealedCount(0);
    if (!heatmap) return;
    const timers = heatmap.zones.map((_, i) => setTimeout(() => setRevealedCount((c) => Math.max(c, i + 1)), 90 * i));
    return () => timers.forEach(clearTimeout);
  }, [heatmap, center]);

  useEffect(() => {
    if (!businessForm) navigate("/formulario", { replace: true });
    else if (!preferences.onboardingComplete) navigate("/onboarding/mapa", { replace: true });
  }, [businessForm, preferences.onboardingComplete, navigate]);

  if (!businessForm || !heatmap || !preferences.onboardingComplete) {
    return null;
  }

  const meta = metricMeta[metric];
  const bestZone = [...heatmap.zones].sort((a, b) => b.opportunityScore - a.opportunityScore)[0];
  const scanning = geoStatus === "loading" || (center && densityStatus === "loading");

  const zonePositions: (ZoneMetrics & { lat: number; lng: number })[] = center
    ? heatmap.zones.map((z) => ({
        ...z,
        lat: center[0] + ROW_OFFSET[z.row],
        lng: center[1] + COL_OFFSET[z.col],
      }))
    : [];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="stack" style={{ gap: 4 }}>
        <div className="row" style={{ alignItems: "center", gap: 8 }}>
          <span className="pill">Mapa de calor · {heatmap.centerLabel}</span>
          {isReal && (
            <span className="pill pill-success">
              {density!.totalPoints} negocios reales detectados · OpenStreetMap
            </span>
          )}
        </div>
        <h1>Oferta, demanda y costo por zona</h1>
        <p>
          La oferta se calcula con negocios reales mapeados en tu zona (OpenStreetMap); demanda y costo son
          estimaciones del sector para orientarte, no un consejo financiero.
          {geoStatus === "fallback" && " No pudimos ubicar tu ciudad exacta, mostramos una zona de referencia."}
        </p>
      </div>

      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(metricMeta) as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className="pill"
            style={{
              border: "none",
              cursor: "pointer",
              background: metric === m ? "var(--accentBlue)" : "var(--navItemActiveBg)",
              color: metric === m ? "#fff" : "var(--navItemTextActive)",
            }}
          >
            {metricMeta[m].label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, alignItems: "start" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
          {center ? (
            <MapContainer
              key={`${center[0]}-${center[1]}`}
              center={center}
              zoom={14}
              scrollWheelZoom={false}
              style={{ height: 460, width: "100%", borderRadius: "var(--radius)" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {zonePositions.map((z, i) => {
                const revealed = i < revealedCount;
                const finalRadius = z.name === "Tu zona" ? 30 : 24;
                return (
                  <CircleMarker
                    key={z.id}
                    center={[z.lat, z.lng]}
                    radius={revealed ? finalRadius : 2}
                    pathOptions={{
                      color: z.name === "Tu zona" ? "#1F1A15" : "#ffffff",
                      weight: z.name === "Tu zona" ? 2.5 : 1.5,
                      fillColor: colorFor(z[metric], meta.goodIsHigh),
                      fillOpacity: revealed ? 0.75 : 0,
                    }}
                    eventHandlers={{ click: () => setSelected(z) }}
                  >
                    {revealed && (
                      <LeafletTooltip direction="top" offset={[0, -10]} permanent>
                        {z.name} · {z[metric]}
                      </LeafletTooltip>
                    )}
                  </CircleMarker>
                );
              })}
            </MapContainer>
          ) : (
            <div style={{ height: 460 }} />
          )}

          {scanning && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.88)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
              }}
            >
              <div style={{ position: "relative", width: 64, height: 64 }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    border: "2.5px solid var(--accentBlue)",
                    opacity: 0.5,
                  }}
                />
                <div
                  className="pulse-ring"
                  style={{
                    position: "absolute",
                    inset: 14,
                    borderRadius: "50%",
                    background: "var(--accentBlue)",
                  }}
                />
              </div>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                {geoStatus === "loading" ? `Ubicando ${businessForm.location.city}…` : "Analizando negocios reales cerca de ti…"}
              </span>
              <span className="muted">Consultando OpenStreetMap</span>
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="card stack">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted">{meta.low}</span>
              <div className={`map-scale${meta.goodIsHigh ? "" : " reverse"}`} aria-hidden="true">
                <span /><span /><span />
              </div>
              <span className="muted">{meta.high}</span>
            </div>
          </div>

          {selected && (
            <div className="card stack pop-in">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h2>{selected.name}</h2>
                <button className="btn btn-ghost" style={{ padding: 0 }} onClick={() => setSelected(null)}>
                  Cerrar
                </button>
              </div>
              <div className="row">
                <div className="stack" style={{ flex: 1, gap: 2 }}>
                  <span className="muted">Demanda</span>
                  <span style={{ fontWeight: 700 }}>{selected.demand}/100</span>
                </div>
                <div className="stack" style={{ flex: 1, gap: 2 }}>
                  <span className="muted">Oferta{isReal ? " (real)" : ""}</span>
                  <span style={{ fontWeight: 700 }}>{selected.supply}/100</span>
                </div>
                <div className="stack" style={{ flex: 1, gap: 2 }}>
                  <span className="muted">Costo</span>
                  <span style={{ fontWeight: 700 }}>{selected.cost}/100</span>
                </div>
              </div>
              <p>
                Puntaje de oportunidad: <strong style={{ color: "var(--primaryText)" }}>{selected.opportunityScore}/100</strong>
              </p>
            </div>
          )}

          <div className="card">
            <span className="muted">Mejor oportunidad estimada</span>
            <h2 style={{ marginTop: 4 }}>{bestZone.name}</h2>
            <p>
              Demanda alta{bestZone.supply < 45 ? " y baja competencia" : ""}, puntaje de {bestZone.opportunityScore}/100.
            </p>
          </div>

          <button className="btn btn-primary" onClick={() => navigate("/roadmap")}>
            Continuar con mi negocio
          </button>
        </div>
      </div>
    </div>
  );
}
