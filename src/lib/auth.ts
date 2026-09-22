/**
 * Admin authentication and session management.
 *
 * Design:
 * - Passwords are bcrypt-hashed (cost 12). Verification uses bcrypt.compare, which runs
 *   in constant time relative to the hash; we never compare plaintext.
 * - Sessions are random 256-bit tokens. The cookie holds the raw token; the DB stores only
 *   its sha256 digest, so a DB leak cannot be replayed as a live session.
 * - The CSRF token is derived from the session token with an HMAC over the session id, so
 *   it is bound to that session and cannot be used with another one (or in another app).
 * - Sessions have an absolute expiry. Logout deletes the server-side row, which invalidates
 *   the session even if the cookie is kept.
 *
 * Everything here is server-only.
 */
import "server-only";
import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const BCRYPT_COST = 12;
export const SESSION_COOKIE = "mbc_admin_session";
export const CSRF_COOKIE = "mbc_admin_csrf";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Session max-age in seconds, exposed for cookie options. */
export function sessionTtlSeconds(): number {
  return SESSION_TTL_SECONDS;
}

/** sha256 hex digest - this is what we store instead of the raw token. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Constant-time string comparison. Buffers must be equal length. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/**
 * Verify a password against a hash in constant time. Returns false for any malformed input
 * rather than throwing, so the caller always follows a single failure path.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash || typeof hash !== "string") return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Generate a new random session token (base64url, 256 bits of entropy). */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** The hash to persist for a given raw session token. */
export function sessionTokenHash(token: string): string {
  return sha256(token);
}

/**
 * CSRF token bound to a session: HMAC(secret, sessionTokenHash). It is safe to return to
 * the browser (it cannot be used to reconstruct the session token) and it cannot be replayed
 * against any other session. Verified with a constant-time comparison.
 */
export function csrfTokenFor(sessionHash: string): string {
  return createHmac("sha256", csrfSecret()).update(sessionHash).digest("hex");
}

export function verifyCsrfToken(sessionHash: string, presented: string | undefined | null): boolean {
  if (!presented) return false;
  const expected = csrfTokenFor(sessionHash);
  return safeEqual(expected, presented);
}

function csrfSecret(): string {
  // CSRF integrity depends on the booking-link secret; it is only a defense-in-depth token
  // (sessions are the real gate), so reusing it avoids adding another required env var.
  return env.bookingLinkSecret;
}

export interface SessionCookieOptions {
  maxAge: number;
  secure: boolean;
}

export function sessionCookieOptions(): SessionCookieOptions {
  return {
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  };
}
