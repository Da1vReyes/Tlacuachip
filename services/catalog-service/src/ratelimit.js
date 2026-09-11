// Tiny in-memory per-IP limiter, same pattern as the other services here.

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
