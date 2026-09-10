import { useEffect, useState } from "react";
import type { BusinessCategory } from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface DensityZone {
  id: string;
  businessCount: number;
  supplyScore: number;
}

interface DensityResponse {
  source: string;
  totalPoints: number;
  zones: DensityZone[];
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
