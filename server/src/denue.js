import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(import.meta.dirname, "../data/denue-snapshot.json");
let snapshot = null;

function load() {
  if (snapshot || !existsSync(path)) return snapshot;
  try { snapshot = JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { console.warn("[denue] could not read snapshot:", error.message); }
  return snapshot;
}

export function denuePointsFor(bbox, category) {
  const data = load();
  if (!data) return null;
  const [minLat, minLng, maxLat, maxLng] = bbox;
  const points = data.points.filter((point) => point.category === category && point.lat >= minLat && point.lat <= maxLat && point.lng >= minLng && point.lng <= maxLng);
  return { points, source: "inegi_denue_snapshot", capturedAt: data.importedAt.slice(0, 10) };
}
