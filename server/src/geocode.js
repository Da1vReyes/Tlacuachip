const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const FALLBACK_CENTER = { lat: 19.4326, lng: -99.1332 }; // CDMX

const cache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Geocodes a city/state/country to coordinates via OpenStreetMap Nominatim.
 * Mirrors web/src/hooks/useCityCenter.ts so the server can build a report
 * without waiting on the client to resolve a location first. Never throws —
 * falls back to Mexico City so a slow/unknown place still gets a report.
 */
export async function geocodeCity(city, state, country) {
  const key = `${city}|${state}|${country}`.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const query = [city, state, country].filter(Boolean).join(", ");
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "tlacuachic-hackathon/1.0", Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const results = await res.json();
    const first = results[0];
    const data = first
      ? { lat: parseFloat(first.lat), lng: parseFloat(first.lon), source: "ok" }
      : { ...FALLBACK_CENTER, source: "fallback" };
    cache.set(key, { data, at: Date.now() });
    return data;
  } catch {
    return { ...FALLBACK_CENTER, source: "fallback" };
  } finally {
    clearTimeout(timeout);
  }
}
