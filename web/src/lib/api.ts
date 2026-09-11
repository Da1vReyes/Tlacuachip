export const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:4000");

export interface AiStatus {
  configured: boolean;
  model: string | null;
}

export async function getAiStatus(): Promise<AiStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/ai/status`);
    if (!res.ok) return { configured: false, model: null };
    return (await res.json()) as AiStatus;
  } catch {
    return { configured: false, model: null };
  }
}

export async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${detail}`.trim());
  }
  return (await res.json()) as TResponse;
}
