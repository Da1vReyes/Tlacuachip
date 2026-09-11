// Small, read-only OpenStreetMap/Nominatim snapshot for the hackathon demo.
// It is only used when Overpass is unavailable and only around CDMX for a
// cafe search. The UI receives an explicit `osm_snapshot` source and date.
export const CDMX_CAFE_SNAPSHOT = {
  capturedAt: "2026-09-11",
  points: [
    { lat: 19.4182486, lng: -99.1647551, name: "Sanborns Café", kind: "restaurant" },
    { lat: 19.4164071, lng: -99.1589185, name: "Libertario Coffee Roasters - Roma Norte", kind: "cafe" },
    { lat: 19.3727688, lng: -99.1758691, name: "Sanborns Cafe", kind: "restaurant" },
    { lat: 19.3655532, lng: -99.185965, name: "Cafe del Abuelo", kind: "cafe" },
    { lat: 19.374147, lng: -99.1628891, name: "El Ocho_Cafe recreativo", kind: "cafe" },
    { lat: 19.3602754, lng: -99.1519455, name: "Fandango Cafe", kind: "cafe" },
  ],
};

export function matchingDemoSnapshot(bbox, category) {
  if (category !== "cafeteria") return null;
  const [minLat, minLng, maxLat, maxLng] = bbox;
  const aroundCdmx = minLat < 19.47 && maxLat > 19.34 && minLng < -99.12 && maxLng > -99.20;
  if (!aroundCdmx) return null;
  return { points: CDMX_CAFE_SNAPSHOT.points, source: "osm_snapshot", capturedAt: CDMX_CAFE_SNAPSHOT.capturedAt };
}
