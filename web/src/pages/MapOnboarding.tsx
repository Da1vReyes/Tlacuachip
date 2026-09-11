import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip as LeafletTooltip, useMap, useMapEvents } from "react-leaflet";
import { useApp } from "../context/AppContext";
import { useCityCenter } from "../hooks/useCityCenter";
import { useDensity } from "../hooks/useDensity";

const ROW_OFFSET = [-0.011, 0, 0.011];
const COL_OFFSET = [-0.014, 0, 0.014];
const heatColor = (score: number) => score >= 72 ? "#c8583a" : score >= 54 ? "#e09b4c" : score >= 36 ? "#e0c76a" : "#92ad94";
type PickedLocation = { lat: number; lng: number; label?: string };
type SearchResult = { place_id: number; display_name: string; lat: string; lon: string };

function MapClickPicker({ onPick }: { onPick: (location: PickedLocation) => void }) {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng, label: "Punto elegido en el mapa" }) });
  return null;
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 15, { animate: true }); }, [map, center]);
  return null;
}

export default function MapOnboarding() {
  const navigate = useNavigate();
  const { businessForm, preferences, savePreferences } = useApp();
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | undefined>(preferences.selectedLocation);
  const { center, status: geoStatus } = useCityCenter(businessForm, pickedLocation);
  const { data: density, status } = useDensity(center, businessForm?.category ?? null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>(preferences.selectedZoneId);
  const [query, setQuery] = useState(() => sessionStorage.getItem("tlacuachic-location-hint") ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  useEffect(() => { if (!businessForm) navigate("/formulario", { replace: true }); }, [businessForm, navigate]);
  if (!businessForm) return null;

  const zones = center ? (density?.zones ?? []).map((zone) => ({ ...zone, lat: center[0] + ROW_OFFSET[zone.row], lng: center[1] + COL_OFFSET[zone.col] })) : [];
  const selected = zones.find((zone) => zone.id === selectedZoneId) ?? zones[4] ?? zones[0];
  const sourceLabel = density?.source === "inegi_denue_snapshot" ? `DENUE de INEGI · ${density.capturedAt}` : density?.source === "osm" ? `OpenStreetMap en vivo · ${density.capturedAt}` : density?.source === "osm_snapshot" ? `Snapshot OpenStreetMap · ${density.capturedAt}` : "Consultando directorio";
  const search = async () => {
    if (query.trim().length < 3) { setSearchError("Escribe una calle, colonia o punto de referencia."); return; }
    setSearching(true); setSearchError(null);
    try {
      const area = `${query.trim()}, ${businessForm.location.city}, ${businessForm.location.state}, ${businessForm.location.country}`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(area)}`);
      if (!response.ok) throw new Error("search_failed");
      const found = await response.json() as SearchResult[];
      setResults(found);
      if (found.length === 0) setSearchError("No encontramos ese lugar. Prueba con colonia, calle o coloca el punto en el mapa.");
    } catch { setSearchError("No pudimos buscar ese lugar ahora. Puedes elegir el punto directamente en el mapa."); }
    finally { setSearching(false); }
  };
  const pickResult = (result: SearchResult) => {
    setPickedLocation({ lat: Number(result.lat), lng: Number(result.lon), label: result.display_name });
    setResults([]); setQuery(result.display_name.split(",").slice(0, 2).join(","));
  };
  const complete = () => {
    savePreferences({ onboardingComplete: true, selectedZoneId: selected?.id, selectedLocation: pickedLocation, locationMode: preferences.locationMode ?? "explore" });
    navigate("/dashboard");
  };

  return <div className="map-onboarding"><header className="onboarding-header"><div className="onboarding-brand">Tlacuachic</div><span>Paso final · confirma tu zona</span></header><main className="map-onboarding-main"><section className="map-onboarding-intro"><span className="pill">Tu punto de partida</span><h1>Confirma dónde quieres analizar.</h1><p>Es el último paso de tu perfil: busca una calle, colonia o referencia. Si no tienes dirección, haz clic en el mapa. Puedes cambiarlo después.</p></section><section className="location-picker card"><div className="stack" style={{ gap: 3 }}><h2>¿Dónde te gustaría operar?</h2><p className="muted" style={{ fontSize: 13, margin: 0 }}>No compartiremos este punto con la red de profesionales.</p></div><div className="row" style={{ gap: 8, alignItems: "center" }}><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void search()} placeholder="Ej. Santa Fe, CDMX o Avenida Reforma" aria-label="Buscar ubicación" /><button className="btn btn-primary" disabled={searching} onClick={() => void search()}>{searching ? "Buscando…" : "Buscar"}</button></div>{searchError && <span className="muted" role="status" style={{ color: "var(--warn)", fontSize: 13 }}>{searchError}</span>}{results.length > 0 && <div className="location-results" role="listbox">{results.map((result) => <button type="button" key={result.place_id} onClick={() => pickResult(result)}>{result.display_name}</button>)}</div>}{pickedLocation && <span className="location-picked" role="status">Punto elegido: {pickedLocation.label ?? `${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)}`}</span>}</section><section className="map-decision-grid"><div className="map-canvas">{center ? <MapContainer center={center} zoom={14} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}><MapRecenter center={center} /><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><MapClickPicker onPick={setPickedLocation} />{zones.map((zone) => <Circle key={zone.id} center={[zone.lat, zone.lng]} radius={720} pathOptions={{ stroke: false, fillColor: heatColor(zone.supplyScore), fillOpacity: zone.id === selected?.id ? .46 : .28 }} eventHandlers={{ click: () => setSelectedZoneId(zone.id) }} />)}{pickedLocation && <CircleMarker center={[pickedLocation.lat, pickedLocation.lng]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#1f6feb", fillOpacity: 1 }}><LeafletTooltip direction="top" permanent>Tu punto</LeafletTooltip></CircleMarker>}{(density?.points ?? []).map((point, index) => <CircleMarker key={`${point.lat}-${point.lng}-${index}`} center={[point.lat, point.lng]} radius={5} pathOptions={{ color: "#fff", weight: 1.5, fillColor: "#285f55", fillOpacity: .95 }}><LeafletTooltip direction="top">{point.name} · {point.kind}</LeafletTooltip></CircleMarker>)}</MapContainer> : <div className="map-loading">Ubicando {businessForm.location.city}…</div>}<div className="map-layer-caption"><strong>Oferta / competencia</strong><span>{sourceLabel}</span></div></div><aside className="decision-panel"><h2>Una primera lectura</h2>{status === "error" ? <p>No pudimos consultar lugares ahora. Puedes guardar tu punto y volver a intentar después.</p> : <><div className="data-proof"><span />{density?.totalPoints ?? 0} lugares similares encontrados</div><div className="zone-reading"><div><span>Área seleccionada</span><strong>{selected?.name ?? "Cargando áreas…"}</strong></div><b>{selected?.supplyScore ?? "—"}/100</b></div><p>Más concentración significa más lugares registrados cerca; úsalo para decidir qué visitar, no como una respuesta final.</p></>}</aside></section><section className="location-choice"><div><h2>¿Cómo usarás esta lectura?</h2></div><label className={`choice-row${preferences.locationMode === "existing" ? " selected" : ""}`}><input type="radio" checked={preferences.locationMode === "existing"} onChange={() => savePreferences({ locationMode: "existing" })} /><span><strong>Ya tengo zona o local</strong><small>La usaré para revisar la concentración cercana.</small></span></label><label className={`choice-row${preferences.locationMode !== "existing" ? " selected" : ""}`}><input type="radio" checked={preferences.locationMode !== "existing"} onChange={() => savePreferences({ locationMode: "explore" })} /><span><strong>Estoy explorando ubicación</strong><small>La usaré como una primera criba antes de visitar zonas.</small></span></label><button className="btn btn-primary" disabled={status === "loading" || (!selected && !pickedLocation)} onClick={complete}>Usar esta zona</button>{geoStatus === "fallback" && <p className="muted">Usamos una referencia cercana porque no pudimos ubicar la ciudad exacta.</p>}</section></main></div>;
}
