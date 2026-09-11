import { tagsForCategory } from "./categories.js";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function cacheKey(lat, lng, category) {
  return `${lat.toFixed(3)}:${lng.toFixed(3)}:${category}`;
}

function buildQuery(bbox, tags) {
  const [minLat, minLon, maxLat, maxLon] = bbox;
  const clauses = tags
    .map(({ key, value }) => {
      const filter = value === "*" ? `["${key}"]` : `["${key}"="${value}"]`;
      return `  node${filter}(${minLat},${minLon},${maxLat},${maxLon});\n  way${filter}(${minLat},${minLon},${maxLat},${maxLon});`;
    })
    .join("\n");
  return `[out:json][timeout:20];\n(\n${clauses}\n);\nout center;`;
}

/**
 * Fetches real OpenStreetMap points of interest for a category inside a
 * bounding box. Returns named points so the client can render the actual
 * places behind a supply reading, not only an aggregated score.
 * or throws so the caller can fall back to an estimate.
 */
async function fetchOnce(query, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
        "User-Agent": "tlacuachic-hackathon/1.0",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRealPoints(bbox, category) {
  const key = cacheKey(bbox[0], bbox[1], category);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const query = buildQuery(bbox, tagsForCategory(category));

  // A single connection-level failure (ETIMEDOUT/ECONNRESET) is often
  // transient on Overpass's shared public instance — worth one quick retry
  // before giving up and letting the caller fall back to an estimate.
  let json;
  try {
    json = await fetchOnce(query, 15000);
  } catch (firstErr) {
    try {
      json = await fetchOnce(query, 15000);
    } catch {
      throw firstErr;
    }
  }

  const points = (json.elements ?? [])
    .map((el) => {
      const name = el.tags?.name ?? "Negocio similar";
      const kind = el.tags?.amenity ?? el.tags?.shop ?? "negocio";
      if (el.type === "node") return { lat: el.lat, lng: el.lon, name, kind };
      if (el.center) return { lat: el.center.lat, lng: el.center.lon, name, kind };
      return null;
    })
    .filter(Boolean);

  const data = { points, source: "osm" };
  cache.set(key, { data, at: Date.now() });
  return data;
}
