import { useEffect, useState } from "react";
import type { BusinessCategory } from "../types";
import { API_BASE } from "../lib/api";

export interface DensityZone {
  id: string;
  name: string;
  row: number;
  col: number;
  businessCount: number;
  supplyScore: number;
  demandEstimate: number;
  costEstimate: number;
}

export interface DensityPoint {
  lat: number;
  lng: number;
  name: string;
  kind: string;
}

interface DensityResponse {
  source: string;
  capturedAt?: string;
  totalPoints: number;
  points: DensityPoint[];
  zones: DensityZone[];
  estimates?: { synthetic: boolean; method: string };
}

export function useDensity(center: [number, number] | null, category: BusinessCategory | null) {
  const [data, setData] = useState<DensityResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  useEffect(() => {
    if (!center || !category) return;
    let cancelled = false;
    setStatus("loading");
    setData(null);

    const url = `${API_BASE}/api/density?lat=${center[0]}&lng=${center[1]}&category=${encodeURIComponent(category)}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((json: DensityResponse) => {
        if (cancelled) return;
        setData(json);
        setStatus("ok");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [center, category]);

  return { data, status };
}
