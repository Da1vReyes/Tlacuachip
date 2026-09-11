// Tiny in-memory per-IP limiter for the AI routes. Enough to keep a demo
// (or a curious visitor) from burning the OpenRouter budget; swap for a
// shared store if this ever runs on more than one process.

const WINDOW_MS = 60_000;
const buckets = new Map();

export function rateLimit(maxPerMinute) {
  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.start > WINDOW_MS) {
      buckets.set(key, { start: now, count: 1 });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > maxPerMinute) {
      res.set("Retry-After", String(Math.ceil((bucket.start + WINDOW_MS - now) / 1000)));
      return res.status(429).json({ error: "rate_limited", message: "Too many requests, try again in a minute" });
    }
    next();
  };
}
