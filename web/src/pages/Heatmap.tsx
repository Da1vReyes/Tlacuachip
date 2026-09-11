import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import { useApp } from "../context/AppContext";
import { generateMockHeatmap } from "../data/mockData";
import { useCityCenter } from "../hooks/useCityCenter";
import { useDensity } from "../hooks/useDensity";
import type { ZoneMetrics } from "../types";

type Metric = "opportunityScore" | "demand" | "supply" | "cost";

const metricMeta: Record<Metric, { label: string; low: string; high: string; goodIsHigh: boolean; detail: string }> = {
  opportunityScore: { label: "Oportunidad", low: "Menor oportunidad", high: "Mayor oportunidad", goodIsHigh: true, detail: "Cruza demanda estimada, competencia real y costo operativo relativo." },
  demand: { label: "Demanda", low: "Menor demanda", high: "Mayor demanda", goodIsHigh: true, detail: "Estimación de oportunidad de consumo por área. Úsala como una hipótesis a validar." },
  supply: { label: "Oferta", low: "Más competencia", high: "Menos competencia", goodIsHigh: false, detail: "Los puntos son negocios similares encontrados en OpenStreetMap; el halo resume su concentración." },
  cost: { label: "Costos", low: "Más costoso", high: "Más accesible", goodIsHigh: false, detail: "Estimación de presión de renta y operación relativa por área." },
};

const ROW_OFFSET = [-0.011, 0, 0.011];
const COL_OFFSET = [-0.014, 0, 0.014];

function heatColor(value: number, goodIsHigh: boolean) {
  const score = goodIsHigh ? value : 100 - value;
  if (score >= 72) return "#1f6feb";
  if (score >= 54) return "#77a4e8";
  if (score >= 36) return "#e4c866";
  return "#d67b55";
}

function MapFocus({ target, zoom }: { target: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo(target, zoom, { duration: 0.9 }); }, [map, target, zoom]);
  return null;
}

export default function Heatmap() {
  const navigate = useNavigate();
  const { businessForm, preferences } = useApp();
  const [metric, setMetric] = useState<Metric>("opportunityScore");
  const [selected, setSelected] = useState<ZoneMetrics | null>(null);
  const { center, status: geoStatus } = useCityCenter(businessForm);
  const { data: density, status: densityStatus } = useDensity(center, businessForm?.category ?? null);

  const heatmap = useMemo(() => {
    if (!businessForm) return null;
    const base = generateMockHeatmap(businessForm);
    const realZones = new Map(density?.zones.map((zone) => [zone.id, zone]) ?? []);
    return {
      ...base,
      zones: base.zones.map((zone) => {
        const real = realZones.get(zone.id);
        const supply = real?.supplyScore ?? zone.supply;
        return { ...zone, supply, opportunityScore: Math.max(0, Math.min(100, Math.round(zone.demand * .55 - supply * .35 - zone.cost * .15 + 45))) };
      }),
    };
  }, [businessForm, density]);

  useEffect(() => {
    if (!businessForm) navigate("/formulario", { replace: true });
    else if (!preferences.onboardingComplete) navigate("/onboarding/mapa", { replace: true });
  }, [businessForm, navigate, preferences.onboardingComplete]);

  if (!businessForm || !heatmap || !preferences.onboardingComplete) return null;

  const meta = metricMeta[metric];
  const isRealSupply = densityStatus === "ok";
  const supplyStatusLabel = isRealSupply
    ? `${density?.totalPoints} lugares similares encontrados`
    : densityStatus === "error"
      ? "Puntos reales no disponibles ahora"
      : "Buscando lugares similares";
  const points = density?.points ?? [];
  const zones = center ? heatmap.zones.map((zone) => ({ ...zone, lat: center[0] + ROW_OFFSET[zone.row], lng: center[1] + COL_OFFSET[zone.col] })) : [];
  const bestZone = [...heatmap.zones].sort((a, b) => b.opportunityScore - a.opportunityScore)[0];

  return (
    <div className="heatmap-page">
      <header className="heatmap-heading">
        <div>
          <span className="pill">Análisis de ubicación · {heatmap.centerLabel}</span>
          <h1>Encuentra señales antes de elegir una zona.</h1>
          <p>Explora capas separadas: la oferta usa lugares reales de OpenStreetMap; demanda y costos son estimaciones visibles como tales.</p>
        </div>
        <div className={`heatmap-proof${densityStatus === "error" ? " unavailable" : ""}`}><span />{supplyStatusLabel}</div>
      </header>

      <div className="heatmap-tabs" role="tablist" aria-label="Capas del análisis">
        {(Object.keys(metricMeta) as Metric[]).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={metric === item} className={metric === item ? "active" : ""} onClick={() => { setMetric(item); setSelected(null); }}>
            {metricMeta[item].label}
          </button>
        ))}
      </div>

      <section className="heatmap-workspace">
        <div className="heatmap-map">
          {center ? (
            <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
              <MapFocus target={center} zoom={14} />
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {zones.map((zone) => {
                const selectedZone = selected?.id === zone.id;
                return (
                  <Circle key={zone.id} center={[zone.lat, zone.lng]} radius={720} pathOptions={{ stroke: false, fillColor: heatColor(zone[metric], meta.goodIsHigh), fillOpacity: selectedZone ? .44 : .25 }} eventHandlers={{ click: () => setSelected(zone) }} />
                );
              })}
              {metric === "supply" && points.slice(0, 120).map((point, index) => (
                <CircleMarker key={`${point.lat}-${point.lng}-${index}`} center={[point.lat, point.lng]} radius={5} pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: "#1f6feb", fillOpacity: .95 }}>
                  <LeafletTooltip direction="top" offset={[0, -7]}>{point.name} · {point.kind}</LeafletTooltip>
                </CircleMarker>
              ))}
              {metric !== "supply" && zones.map((zone) => <CircleMarker key={`label-${zone.id}`} center={[zone.lat, zone.lng]} radius={selected?.id === zone.id ? 11 : 8} pathOptions={{ color: "#fff", weight: 1.5, fillColor: heatColor(zone[metric], meta.goodIsHigh), fillOpacity: 1 }} eventHandlers={{ click: () => setSelected(zone) }}><LeafletTooltip direction="top">{zone.name} · {zone[metric]}/100</LeafletTooltip></CircleMarker>)}
            </MapContainer>
          ) : <div className="heatmap-loading">Ubicando {businessForm.location.city}…</div>}
          <div className="heatmap-map-label"><strong>{meta.label}</strong><span>{metric === "supply" ? "Puntos reales + concentración" : "Estimación por área"}</span></div>
          {metric === "supply" && <div className="heatmap-map-note">Toca un punto para ver el lugar registrado.</div>}
        </div>

        <aside className="heatmap-insight">
          <div className="heatmap-scale"><span>{meta.low}</span><div><i /><i /><i /><i /></div><span>{meta.high}</span></div>
          <div className="heatmap-copy"><span>Capa actual</span><h2>{meta.label}</h2><p>{meta.detail}</p></div>
          {selected ? (
            <div className="heatmap-zone-report">
              <span>Área seleccionada</span><h3>{selected.name}</h3>
              <b>{selected[metric]}/100</b>
              <dl><div><dt>Demanda</dt><dd>{selected.demand}</dd></div><div><dt>Oferta{isRealSupply ? " real" : ""}</dt><dd>{selected.supply}</dd></div><div><dt>Costos</dt><dd>{selected.cost}</dd></div></dl>
              <p>Oportunidad estimada: <strong>{selected.opportunityScore}/100</strong></p>
            </div>
          ) : (
            <div className="heatmap-empty"><strong>Selecciona un área</strong><span>Verás el reporte comparativo para esa zona.</span></div>
          )}
          <div className="heatmap-best"><span>Mejor oportunidad estimada</span><strong>{bestZone.name}</strong><p>{bestZone.opportunityScore}/100 · demanda favorable con costo y oferta comparados.</p></div>
          <button className="btn btn-primary" onClick={() => navigate("/roadmap")}>Ver mi siguiente paso</button>
        </aside>
      </section>
      {geoStatus === "fallback" && <p className="heatmap-disclaimer">No pudimos ubicar tu ciudad exacta; la lectura usa una zona de referencia.</p>}
    </div>
  );
}
