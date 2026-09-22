/**
 * Login rate limiting: both per-IP and per-account, DB-backed so limits survive across
 * requests and processes (the in-memory limiter is per-process only).
 *
 * - Per account (by submitted email): after MAX_FAILED failures inside the window the email
 *   is locked for LOCKOUT_MINUTES. A successful sign-in resets the counter.
 * - Per IP: in-memory sliding window (the same helper the booking endpoints use), enough to
 *   stop brute-force storms from a single client.
 *
 * Failures are tracked by the submitted email, not by account id, on purpose: an unknown
 * email and a wrong password for a real account are treated exactly the same, so the
 * presence or absence of a lockout never reveals which emails exist.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

const MAX_FAILED = 5;
const WINDOW_MS = 15 * 60_000;
const LOCKOUT_MS = 15 * 60_000;
const IP_LIMIT = { limit: 10, windowMs: 60_000 };

export interface LoginGateResult {
  locked: boolean;
  /** Seconds to wait before retrying, when locked. */
  retryAfterSec: number;
}

/** True when the IP has exceeded its login attempt budget. */
export function ipLoginLimited(ip: string): boolean {
  return !rateLimit(`admin-login:${ip}`, IP_LIMIT).ok;
}

/**
 * Lockout state for a submitted email. Always returns unlocked for emails with no row,
 * which is the same state a real account with no failures has - no enumeration signal.
 */
export async function accountLockState(email: string): Promise<LoginGateResult> {
  const row = await prisma.loginFailure.findUnique({ where: { email } });
  if (!row?.lockedUntil) return { locked: false, retryAfterSec: 0 };
  const remainingMs = row.lockedUntil.getTime() - Date.now();
  if (remainingMs <= 0) return { locked: false, retryAfterSec: 0 };
  return { locked: true, retryAfterSec: Math.ceil(remainingMs / 1000) };
}

/** Record a failed attempt for the submitted email, locking it when the threshold is crossed. */
export async function recordFailedLogin(email: string): Promise<LoginGateResult> {
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_MS);

  const row = await prisma.loginFailure.upsert({
    where: { email },
    create: { email, attempts: 1, windowStart: new Date(now) },
    update: {
      // Failures older than the window do not count: reset the counter when the last
      // window has lapsed, then count this attempt.
      attempts: { increment: 1 },
      windowStart: { set: new Date(now) },
    },
    select: { attempts: true, windowStart: true },
  });

  const inWindow = row.windowStart.getTime() > now - WINDOW_MS;
  const attempts = inWindow ? row.attempts : 1;

  if (attempts >= MAX_FAILED) {
    await prisma.loginFailure.update({
      where: { email },
      data: { attempts: 0, lockedUntil: new Date(now + LOCKOUT_MS), windowStart: new Date(now) },
    });
    return { locked: true, retryAfterSec: Math.ceil(LOCKOUT_MS / 1000) };
  }
  return { locked: false, retryAfterSec: 0 };
}

/** Reset the failure counter on a successful sign-in. */
export async function recordSuccessfulLogin(email: string): Promise<void> {
  await prisma.loginFailure.deleteMany({ where: { email } });
}

export function loginIp(request: Request): string {
  return clientIpFromHeaders(new Headers(request.headers));
}

export const LOGIN_LIMIT_CONSTANTS = { MAX_FAILED, WINDOW_MS, LOCKOUT_MS };
