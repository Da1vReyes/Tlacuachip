import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer, Tooltip as LeafletTooltip } from "react-leaflet";
import { useApp } from "../context/AppContext";
import { generateMockHeatmap } from "../data/mockData";
import { useCityCenter } from "../hooks/useCityCenter";
import { useDensity } from "../hooks/useDensity";
import type { ZoneMetrics } from "../types";

type Signal = "supply" | "demand" | "cost";

const ROW_OFFSET = [-0.011, 0, 0.011];
const COL_OFFSET = [-0.014, 0, 0.014];

const copy: Record<Signal, { label: string; source: string; question: string; summary: (z: ZoneMetrics) => string }> = {
  supply: {
    label: "Oferta",
    source: "Dato real: negocios similares registrados en OpenStreetMap.",
    question: "¿Cuánta competencia ya existe?",
    summary: (z) => `${z.name} tiene un nivel de oferta de ${z.supply}/100. ${z.supply < 40 ? "Hay espacio para diferenciarte." : "Necesitarías una propuesta muy clara para competir."}`,
  },
  demand: {
    label: "Demanda",
    source: "Estimación del prototipo basada en patrones del sector y la zona.",
    question: "¿Qué tanta oportunidad de consumo existe?",
    summary: (z) => `${z.name} tiene una demanda estimada de ${z.demand}/100. ${z.demand >= 60 ? "Es una señal favorable para validar más a fondo." : "Conviene comprobar el flujo de personas antes de decidir."}`,
  },
  cost: {
    label: "Costos",
    source: "Estimación del prototipo de renta y operación relativa.",
    question: "¿Qué tan pesado sería operar aquí?",
    summary: (z) => `${z.name} tiene un costo operativo estimado de ${z.cost}/100. ${z.cost <= 45 ? "Te deja más margen para arrancar." : "Pide una proyección de flujo de efectivo más conservadora."}`,
  },
};

function color(value: number, signal: Signal) {
  const useful = signal === "cost" || signal === "supply" ? 100 - value : value;
  if (useful >= 70) return "#1f6feb";
  if (useful >= 48) return "#7fa8ef";
  return "#d8dce2";
}

export default function MapOnboarding() {
  const navigate = useNavigate();
  const { businessForm, preferences, savePreferences } = useApp();
  const [signal, setSignal] = useState<Signal>("supply");
  const [selected, setSelected] = useState<ZoneMetrics | null>(null);
  const { center, status: geoStatus } = useCityCenter(businessForm);
  const { data: density, status: densityStatus } = useDensity(center, businessForm?.category ?? null);

  const heatmap = useMemo(() => {
    if (!businessForm) return null;
    const base = generateMockHeatmap(businessForm);
    const realZones = new Map(density?.zones.map((zone) => [zone.id, zone]) ?? []);
    return base.zones.map((zone) => ({
      ...zone,
      supply: realZones.get(zone.id)?.supplyScore ?? zone.supply,
    }));
  }, [businessForm, density]);

  useEffect(() => {
    if (!businessForm) navigate("/formulario", { replace: true });
  }, [businessForm, navigate]);

  if (!businessForm || !heatmap) return null;

  const selectedZone = selected ?? heatmap.find((zone) => zone.id === preferences.selectedZoneId) ?? heatmap[4];
  const positions = center ? heatmap.map((zone) => ({ ...zone, lat: center[0] + ROW_OFFSET[zone.row], lng: center[1] + COL_OFFSET[zone.col] })) : [];
  const realCount = densityStatus === "ok" ? density?.totalPoints : undefined;
  const complete = () => {
    savePreferences({ onboardingComplete: true, selectedZoneId: selectedZone.id });
    navigate("/dashboard");
  };

  return (
    <div className="map-onboarding">
      <header className="onboarding-header">
        <div className="onboarding-brand">Tlacuachip</div>
        <span>Decisión de zona · 1 de 1</span>
      </header>

      <main className="map-onboarding-main">
        <section className="map-onboarding-intro">
          <h1>Lee tu zona con tres señales.</h1>
          <p>Primero mira la competencia, después la oportunidad de consumo y finalmente el costo de operar. No te vamos a decir qué hacer: te damos contexto para decidir.</p>
        </section>

        <section className="signal-tabs" aria-label="Capas del mapa">
          {(Object.keys(copy) as Signal[]).map((item, index) => (
            <button key={item} className={`signal-tab${signal === item ? " active" : ""}`} onClick={() => setSignal(item)}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{copy[item].label}</strong>
              {signal === item && <small>Ver capa</small>}
            </button>
          ))}
        </section>

        <section className="map-decision-grid">
          <div className="map-canvas">
            {center ? (
              <MapContainer center={center} zoom={14} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {positions.map((zone) => (
                  <CircleMarker
                    key={zone.id}
                    center={[zone.lat, zone.lng]}
                    radius={zone.id === selectedZone.id ? 29 : 20}
                    pathOptions={{ color: zone.id === selectedZone.id ? "#0b1220" : "#ffffff", weight: zone.id === selectedZone.id ? 2 : 1, fillColor: color(zone[signal], signal), fillOpacity: 0.78 }}
                    eventHandlers={{ click: () => setSelected(zone) }}
                  >
                    <LeafletTooltip direction="top" offset={[0, -10]} permanent>{zone.name}</LeafletTooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            ) : <div className="map-loading">Ubicando tu ciudad…</div>}
            <div className="map-layer-caption"><strong>{copy[signal].label}</strong><span>{copy[signal].source}</span></div>
          </div>

          <aside className="decision-panel">
            <h2>{copy[signal].question}</h2>
            {realCount !== undefined && signal === "supply" && <div className="data-proof"><span />{realCount} negocios similares detectados</div>}
            {geoStatus === "loading" && <p>Estamos ubicando tu ciudad para mostrar las zonas cercanas.</p>}
            <div className="zone-reading">
              <div><span>Zona seleccionada</span><strong>{selectedZone.name}</strong></div>
              <b>{selectedZone[signal]}/100</b>
            </div>
            <p>{copy[signal].summary(selectedZone)}</p>
            <button className="text-action" onClick={() => setSelected(null)}>Usar mi zona actual</button>
          </aside>
        </section>

        <section className="location-choice">
          <div>
            <h2>¿Cómo vas a usar este análisis?</h2>
          </div>
          <label className={`choice-row${preferences.locationMode === "explore" ? " selected" : ""}`}>
            <input type="radio" checked={preferences.locationMode !== "existing"} onChange={() => savePreferences({ locationMode: "explore" })} />
            <span><strong>Estoy buscando ubicación</strong><small>Usaré estas señales para comparar zonas antes de elegir un local.</small></span>
          </label>
          <label className={`choice-row${preferences.locationMode === "existing" ? " selected" : ""}`}>
            <input type="radio" checked={preferences.locationMode === "existing"} onChange={() => savePreferences({ locationMode: "existing" })} />
            <span><strong>Ya tengo un local o una zona</strong><small>Usaré el análisis para validar mi decisión y priorizar los siguientes pasos.</small></span>
          </label>
          <button className="btn btn-primary" onClick={complete}>Abrir mi dashboard</button>
        </section>
      </main>
    </div>
  );
}
