// Must mirror the frontend's zone grid (src/hooks + Heatmap.tsx in emprende-mvp)
// so ids line up when the client merges real supply data with its own
// demand/cost estimates.
export const ROW_OFFSET = [-0.011, 0, 0.011];
export const COL_OFFSET = [-0.014, 0, 0.014];

export const ZONE_NAMES = [
  ["Centro", "Norte", "Noreste"],
  ["Poniente", "Tu zona", "Oriente"],
  ["Suroeste", "Sur", "Sureste"],
];

export function zoneCenters(lat, lng) {
  const zones = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      zones.push({
        id: `${row}-${col}`,
        name: ZONE_NAMES[row][col],
        row,
        col,
        lat: lat + ROW_OFFSET[row],
        lng: lng + COL_OFFSET[col],
      });
    }
  }
  return zones;
}

export function boundingBox(zones, padDeg = 0.009) {
  const lats = zones.map((z) => z.lat);
  const lngs = zones.map((z) => z.lng);
  return [Math.min(...lats) - padDeg, Math.min(...lngs) - padDeg, Math.max(...lats) + padDeg, Math.max(...lngs) + padDeg];
}

function metersApprox(lat1, lng1, lat2, lng2) {
  const dLat = lat1 - lat2;
  const dLng = (lng1 - lng2) * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng) * 111_320;
}

const ZONE_RADIUS_M = 750;

/** Buckets raw OSM points into the nearest zone within ZONE_RADIUS_M. */
export function bucketPoints(zones, points) {
  const counts = Object.fromEntries(zones.map((z) => [z.id, 0]));
  for (const p of points) {
    let best = null;
    let bestDist = Infinity;
    for (const z of zones) {
      const d = metersApprox(p.lat, p.lng, z.lat, z.lng);
      if (d < bestDist) {
        bestDist = d;
        best = z;
      }
    }
    if (best && bestDist <= ZONE_RADIUS_M) {
      counts[best.id] += 1;
    }
  }
  return counts;
}

/** Simple, explainable 0-100 scaling: saturates around 7 nearby businesses. */
export function scoreFromCount(count) {
  return Math.max(0, Math.min(100, Math.round(count * 14)));
}
