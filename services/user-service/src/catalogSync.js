// Best-effort sync into catalog-service's public provider roster. Fire-and-
// log, never fire-and-throw: if catalog-service is down, the user's own
// provider profile still saved fine in this service — we don't want a sync
// hiccup to fail their save. Matches the app's established
// graceful-degradation pattern.

const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || "http://localhost:4200";
const INTERNAL_API_KEY = process.env.CATALOG_INTERNAL_API_KEY;

export async function syncProviderToCatalog(userId, profile) {
  if (!INTERNAL_API_KEY) {
    console.warn("[user-service] CATALOG_INTERNAL_API_KEY not set — skipping catalog sync");
    return;
  }
  try {
    const res = await fetch(`${CATALOG_SERVICE_URL}/api/providers/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-internal-key": INTERNAL_API_KEY },
      body: JSON.stringify(profile),
    });
    if (!res.ok) console.warn(`[user-service] catalog sync failed: ${res.status}`);
  } catch (err) {
    console.warn("[user-service] catalog sync failed:", err.message);
  }
}

export async function removeProviderFromCatalog(userId) {
  if (!INTERNAL_API_KEY) return;
  try {
    const res = await fetch(`${CATALOG_SERVICE_URL}/api/providers/${userId}`, {
      method: "DELETE",
      headers: { "x-internal-key": INTERNAL_API_KEY },
    });
    if (!res.ok && res.status !== 404) console.warn(`[user-service] catalog removal failed: ${res.status}`);
  } catch (err) {
    console.warn("[user-service] catalog removal failed:", err.message);
  }
}
