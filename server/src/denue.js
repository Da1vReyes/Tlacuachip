import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const paths = [
  resolve(import.meta.dirname, "../data/denue-snapshot.json"),
  resolve(import.meta.dirname, "../data/denue-pilot.json"),
];
let snapshot = null;

function load() {
  if (snapshot) return snapshot;
  const path = paths.find(existsSync);
  if (!path) return null;
  try { snapshot = JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { console.warn("[denue] could not read snapshot:", error.message); }
  return snapshot;
}

export function denuePointsFor(bbox, category) {
  const data = load();
  if (!data) return null;
  if (Array.isArray(data.categories) && !data.categories.includes(category)) return null;
  const [minLat, minLng, maxLat, maxLng] = bbox;
  const points = data.points.filter((point) => point.category === category && point.lat >= minLat && point.lat <= maxLat && point.lng >= minLng && point.lng <= maxLng);
  return { points, source: "inegi_denue_snapshot", capturedAt: data.importedAt.slice(0, 10) };
}
