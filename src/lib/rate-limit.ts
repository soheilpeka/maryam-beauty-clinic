/**
 * Simple in-memory sliding-window rate limiter for booking endpoints.
 * Per-IP counting; state lives in the current process. For multi-instance deployments,
 * swap this for a Redis-backed limiter with the same interface.
 */
interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window length in ms */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Requests remaining in the current window */
  remaining: number;
  /** ms until the oldest hit expires */
  retryAfterMs: number;
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  const cutoff = now - options.windowMs;
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= options.limit) {
    const oldest = bucket.hits[0];
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterMs: oldest + options.windowMs - now };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: Math.max(0, options.limit - bucket.hits.length), retryAfterMs: 0 };
}

/** Clear all buckets (used by tests). */
export function resetRateLimiter(): void {
  buckets.clear();
}

/** Extract a client IP from Next.js headers, preferring X-Forwarded-For. */
export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}