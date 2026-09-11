import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import { useApp } from "../context/AppContext";
import { generateMockHeatmap } from "../data/mockData";
import { useCityCenter } from "../hooks/useCityCenter";
import { useDensity } from "../hooks/useDensity";
import type { ZoneMetrics } from "../types";

type Metric = "demand" | "supply" | "cost";

const metricMeta: Record<Metric, { label: string; low: string; high: string; detail: string }> = {
  demand: { label: "Demanda", low: "Menor demanda", high: "Mayor demanda", detail: "Estimación de oportunidad de consumo por área. Úsala como una hipótesis a validar." },
  supply: { label: "Oferta", low: "Menos competencia", high: "Más competencia", detail: "Los puntos son negocios similares encontrados en OpenStreetMap; el halo resume su concentración." },
  cost: { label: "Costos", low: "Menor costo", high: "Mayor costo", detail: "Estimación de presión de renta y operación relativa por área." },
};

const ROW_OFFSET = [-0.011, 0, 0.011];
const COL_OFFSET = [-0.014, 0, 0.014];

function heatColor(metric: Metric, value: number) {
  if (metric === "supply") {
    if (value >= 72) return "#d84331";
    if (value >= 54) return "#eb8654";
    if (value >= 36) return "#efc567";
    return "#dfe5d8";
  }
  if (metric === "cost") {
    if (value >= 72) return "#8a4fa3";
    if (value >= 54) return "#bd7eaa";
    if (value >= 36) return "#e1b6aa";
    return "#e8e3db";
  }
  if (value >= 72) return "#087f6a";
  if (value >= 54) return "#59ae8c";
  if (value >= 36) return "#c6cf6a";
  return "#e7d5a0";
}

function MapFocus({ target, zoom }: { target: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo(target, zoom, { duration: 0.9 }); }, [map, target, zoom]);
  return null;
}

export default function Heatmap() {
  const navigate = useNavigate();
  const { businessForm, preferences } = useApp();
  const [metric, setMetric] = useState<Metric>("demand");
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
  const focusZone = selected ?? bestZone;
  const highestZone = [...heatmap.zones].sort((a, b) => b[metric] - a[metric])[0];
  const lowestZone = [...heatmap.zones].sort((a, b) => a[metric] - b[metric])[0];
  const layerReading = metric === "supply"
    ? `La competencia se concentra más en ${highestZone.name}. ${focusZone.name} tiene ${focusZone.supply}/100 de oferta${isRealSupply ? ", calculada con lugares mapeados" : " estimada mientras se restablece la fuente"}.`
    : metric === "demand"
      ? `${highestZone.name} concentra la señal de consumo más alta. ${focusZone.name} marca ${focusZone.demand}/100: una pista para validar con visitas y conversación local.`
      : `${highestZone.name} concentra la presión operativa más alta. ${lowestZone.name} es la señal más ligera; ${focusZone.name} marca ${focusZone.cost}/100.`;

  return (
    <div className="heatmap-page">
      <header className="heatmap-heading">
        <div>
          <span className="pill">Análisis de ubicación · {heatmap.centerLabel}</span>
          <h1>Oferta, demanda y costos por zona</h1>
          <p>Cambia de capa para entender cada señal. La oferta usa lugares reales de OpenStreetMap; demanda y costos son estimaciones del prototipo.</p>
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
                  <Circle key={zone.id} center={[zone.lat, zone.lng]} radius={760} pathOptions={{ className: "heatmap-field", stroke: false, fillColor: heatColor(metric, zone[metric]), fillOpacity: selectedZone ? .48 : .30 }} eventHandlers={{ click: () => setSelected(zone) }} />
                );
              })}
              {metric === "supply" && points.slice(0, 120).map((point, index) => (
                <CircleMarker key={`${point.lat}-${point.lng}-${index}`} center={[point.lat, point.lng]} radius={5} pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: "#1f6feb", fillOpacity: .95 }}>
                  <LeafletTooltip direction="top" offset={[0, -7]}>{point.name} · {point.kind}</LeafletTooltip>
                </CircleMarker>
              ))}
              {metric !== "supply" && zones.map((zone) => <CircleMarker key={`label-${zone.id}`} center={[zone.lat, zone.lng]} radius={selected?.id === zone.id ? 11 : 8} pathOptions={{ color: "#fff", weight: 1.5, fillColor: heatColor(metric, zone[metric]), fillOpacity: 1 }} eventHandlers={{ click: () => setSelected(zone) }}><LeafletTooltip direction="top">{zone.name} · {zone[metric]}/100</LeafletTooltip></CircleMarker>)}
            </MapContainer>
          ) : <div className="heatmap-loading">Ubicando {businessForm.location.city}…</div>}
          <div className="heatmap-map-label"><strong>{meta.label}</strong><span>{metric === "supply" ? "Puntos reales + concentración" : "Estimación por área"}</span></div>
          {metric === "supply" && <div className="heatmap-map-note">Toca un punto para ver el lugar registrado.</div>}
        </div>

        <aside className="heatmap-insight">
          <div className={`heatmap-scale heatmap-scale-${metric}`}><span>{meta.low}</span><div><i /><i /><i /><i /></div><span>{meta.high}</span></div>
          <div className="heatmap-copy"><span>Interpretación del mapa</span><h2>{meta.label}</h2><p>{meta.detail}</p></div>
          <div className="heatmap-layer-reading"><strong>Qué revela esta capa</strong><p>{layerReading}</p></div>
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
          <div className="heatmap-general-reading"><span>Interpretación general · las 3 señales</span><strong>{bestZone.name} es la zona más equilibrada.</strong><p>Su oportunidad estimada es {bestZone.opportunityScore}/100, combinando demanda {bestZone.demand}, oferta {bestZone.supply} y costos {bestZone.cost}. La recomendación no sustituye validar el lugar en persona.</p></div>
          <button className="btn btn-primary" onClick={() => navigate("/roadmap")}>Ver mi siguiente paso</button>
        </aside>
      </section>
      {geoStatus === "fallback" && <p className="heatmap-disclaimer">No pudimos ubicar tu ciudad exacta; la lectura usa una zona de referencia.</p>}
    </div>
  );
}
