/**
 * Login rate limiting: account failures and production IP budgets are DB-backed.
 *
 * - Per account (by submitted email): after MAX_FAILED failures inside the window the email
 *   is locked for LOCKOUT_MINUTES. A successful sign-in resets the counter.
 * - Per IP: shared database sliding window in production (memory only in development/tests),
 *   using the same fail-closed helper as public forms.
 *
 * Failures are tracked by the submitted email, not by account id, on purpose: an unknown
 * email and a wrong password for a real account are treated exactly the same, so the
 * presence or absence of a lockout never reveals which emails exist.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, clientIpFromHeaders, type RateLimitResult } from "@/lib/rate-limit";

const MAX_FAILED = 5;
const WINDOW_MS = 15 * 60_000;
const LOCKOUT_MS = 15 * 60_000;
const IP_LIMIT = { limit: 10, windowMs: 60_000 };

export interface LoginGateResult {
  locked: boolean;
  /** Seconds to wait before retrying, when locked. */
  retryAfterSec: number;
}

/** Consume one login attempt and return the budget or storage-unavailable result. */
export function ipLoginBudget(ip: string): Promise<RateLimitResult> {
  return consumeRateLimit(`admin-login:${ip}`, IP_LIMIT);
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
  const timestamp = new Date(now);
  const cutoff = new Date(now - WINDOW_MS);
  const lockedUntil = new Date(now + LOCKOUT_MS);

  // One SQLite write counts the failure, resets an expired fixed window, and locks
  // at the threshold. Racing requests cannot lose increments or extend a live lock.
  await prisma.$executeRaw`
    INSERT INTO "LoginFailure" ("email", "attempts", "windowStart", "lockedUntil", "updatedAt")
    VALUES (${email}, 1, ${timestamp}, NULL, ${timestamp})
    ON CONFLICT ("email") DO UPDATE SET
      "attempts" = CASE
        WHEN "lockedUntil" > ${timestamp} THEN "attempts"
        WHEN "windowStart" <= ${cutoff} THEN 1
        ELSE MIN("attempts" + 1, ${MAX_FAILED})
      END,
      "lockedUntil" = CASE
        WHEN "lockedUntil" > ${timestamp} THEN "lockedUntil"
        WHEN "windowStart" > ${cutoff} AND "attempts" + 1 >= ${MAX_FAILED} THEN ${lockedUntil}
        ELSE NULL
      END,
      "windowStart" = CASE
        WHEN "lockedUntil" > ${timestamp} THEN "windowStart"
        WHEN "windowStart" <= ${cutoff} THEN ${timestamp}
        ELSE "windowStart"
      END,
      "updatedAt" = ${timestamp}
  `;
  return accountLockState(email);
}

/** Reset the failure counter on a successful sign-in. */
export async function recordSuccessfulLogin(email: string): Promise<void> {
  await prisma.loginFailure.deleteMany({ where: { email } });
}

export function loginIp(request: Request): string {
  return clientIpFromHeaders(new Headers(request.headers));
}

export const LOGIN_LIMIT_CONSTANTS = { MAX_FAILED, WINDOW_MS, LOCKOUT_MS };
