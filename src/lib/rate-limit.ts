/**
 * Sliding-window budgets. Development uses memory; production consumes the shared
 * SQLite/libSQL budget so restarts and separate application instances cannot reset it.
 */
import { isIP } from "node:net";
import { logServerError } from "@/lib/safe-log";

interface Bucket {
  hits: number[];
  expiresAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;
let nextSweepAt = 0;

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
  /** The shared store could not be checked; callers must refuse the operation. */
  unavailable?: boolean;
}

export async function consumeRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  if (process.env.NODE_ENV !== "production") return rateLimit(key, options);
  try {
    const [{ durableRateLimit }, { prisma }] = await Promise.all([
      import("@/lib/durable-rate-limit"), import("@/lib/prisma"),
    ]);
    return await durableRateLimit(prisma, key, options);
  } catch (error) {
    logServerError("shared request budget unavailable", error);
    return { ok: false, remaining: 0, retryAfterMs: options.windowMs, unavailable: true };
  }
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  if (now >= nextSweepAt || buckets.size >= MAX_BUCKETS) {
    for (const [storedKey, stored] of buckets) {
      if (stored.expiresAt <= now) buckets.delete(storedKey);
    }
    nextSweepAt = now + 60_000;
  }
  // Do not evict live budgets: eviction would reset an attacker's request allowance.
  if (!buckets.has(key) && buckets.size >= MAX_BUCKETS) {
    return { ok: false, remaining: 0, retryAfterMs: options.windowMs };
  }
  const bucket = buckets.get(key) ?? { hits: [], expiresAt: now + options.windowMs };
  const cutoff = now - options.windowMs;
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= options.limit) {
    const oldest = bucket.hits[0];
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterMs: oldest + options.windowMs - now };
  }
  bucket.hits.push(now);
  bucket.expiresAt = now + options.windowMs;
  buckets.set(key, bucket);
  return { ok: true, remaining: Math.max(0, options.limit - bucket.hits.length), retryAfterMs: 0 };
}

/** Clear all buckets (used by tests). */
export function resetRateLimiter(): void {
  buckets.clear();
  nextSweepAt = 0;
}

/** Trust only an explicitly configured header sanitized by the hosting reverse proxy. */
export function clientIpFromHeaders(headers: Headers): string {
  const trusted = process.env.TRUSTED_CLIENT_IP_HEADER?.toLowerCase();
  if (!trusted || !["x-forwarded-for", "x-real-ip", "cf-connecting-ip"].includes(trusted)) return "unknown";
  const raw = headers.get(trusted);
  // A proxy that appends to XFF puts its observed peer at the right, after client input.
  const ip = trusted === "x-forwarded-for" ? raw?.split(",").at(-1)?.trim() : raw?.trim();
  return ip && isIP(ip) ? ip : "unknown";
}
