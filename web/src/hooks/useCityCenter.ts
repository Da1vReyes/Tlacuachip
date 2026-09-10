import { useEffect, useState } from "react";
import type { BusinessFormData } from "../types";

const FALLBACK_CENTER: [number, number] = [19.4326, -99.1332]; // CDMX

export function useCityCenter(form: BusinessFormData | null) {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "fallback">("loading");

  useEffect(() => {
    if (!form) return;
    let cancelled = false;
    setStatus("loading");
    const query = `${form.location.city}, ${form.location.state}, ${form.location.country}`;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((results: { lat: string; lon: string }[]) => {
        if (cancelled) return;
        if (results[0]) {
          setCenter([parseFloat(results[0].lat), parseFloat(results[0].lon)]);
          setStatus("ok");
        } else {
          setCenter(FALLBACK_CENTER);
          setStatus("fallback");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCenter(FALLBACK_CENTER);
        setStatus("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, [form]);

  return { center, status };
}

export { FALLBACK_CENTER };
