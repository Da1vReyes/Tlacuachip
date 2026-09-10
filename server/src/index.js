import express from "express";
import cors from "cors";
import { fetchRealPoints } from "./overpass.js";
import { zoneCenters, boundingBox, bucketPoints, scoreFromCount } from "./zones.js";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4000;

app.get("/", (_req, res) => {
  res.json({
    name: "tlacuachip-server",
    endpoints: ["/api/health", "/api/density?lat=&lng=&category="],
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// GET /api/density?lat=19.43&lng=-99.13&category=cafeteria
// Real point-of-interest density per zone, sourced from OpenStreetMap.
app.get("/api/density", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const category = String(req.query.category ?? "otro");

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng are required numbers" });
  }

  const zones = zoneCenters(lat, lng);
  const bbox = boundingBox(zones);

  try {
    const { points, source } = await fetchRealPoints(bbox, category);
    const counts = bucketPoints(zones, points);

    const zonesOut = zones.map((z) => ({
      id: z.id,
      name: z.name,
      row: z.row,
      col: z.col,
      businessCount: counts[z.id],
      supplyScore: scoreFromCount(counts[z.id]),
    }));

    res.json({ source, category, center: { lat, lng }, totalPoints: points.length, zones: zonesOut });
  } catch (err) {
    console.error("[density] Overpass fetch failed:", err.message);
    res.status(502).json({ error: "upstream_unavailable", message: "Could not reach OpenStreetMap Overpass API" });
  }
});

app.listen(PORT, () => {
  console.log(`tlacuachip-server listening on http://localhost:${PORT}`);
});
