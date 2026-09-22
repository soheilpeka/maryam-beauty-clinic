/**
 * Server-side session store backed by the AdminSession table.
 *
 * The cookie carries the raw token; only its sha256 digest is ever written to the DB, so a
 * database leak does not yield usable sessions. Sessions expire absolutely and are deleted
 * on logout, which invalidates them server-side even if the cookie value is kept.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import {
  csrfTokenFor,
  newSessionToken,
  sessionTokenHash,
  sha256,
  verifyCsrfToken,
} from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export interface AdminSessionInfo {
  adminId: string;
  email: string;
  name: string | null;
  role: string;
  /** sha256 digest of the raw token - never the raw token itself */
  tokenHash: string;
  expiresAt: Date;
}

function toInfo(row: {
  adminId: string;
  tokenHash: string;
  expiresAt: Date;
  admin: { email: string; name: string | null; role: string };
}): AdminSessionInfo {
  return {
    adminId: row.adminId,
    email: row.admin.email,
    name: row.admin.name,
    role: row.admin.role,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
  };
}

/**
 * Create a session for an admin and return the raw token (to go in the cookie) together with
 * the row info. Also revokes older sessions for the same admin so one sign-in invalidates
 * the previous one - a single concurrent session per account.
 */
export async function createSession(adminId: string): Promise<{
  token: string;
  info: AdminSessionInfo;
}> {
  const token = newSessionToken();
  const tokenHash = sessionTokenHash(token);
  const expiresAt = new Date(Date.now() + sessionTtl());

  // Single-session-per-account: drop any existing sessions for this admin first. Deleting
  // before inserting keeps at most one live row per admin, even though the two writes are
  // not in one transaction (SQLite is single-writer; the window cannot be double-booked).
  await prisma.adminSession.deleteMany({ where: { adminId } });

  const row = await prisma.adminSession.create({
    data: { adminId, tokenHash, csrfHash: sha256(csrfTokenFor(tokenHash)), expiresAt },
    include: { admin: { select: { email: true, name: true, role: true } } },
  });

  return { token, info: toInfo(row) };
}

/** Look up a session by its raw token, returning null when missing or expired. */
export async function getSession(token: string | undefined | null): Promise<AdminSessionInfo | null> {
  if (!token) return null;
  const row = await prisma.adminSession.findUnique({
    where: { tokenHash: sessionTokenHash(token) },
    include: { admin: { select: { email: true, name: true, role: true } } },
  });
  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    // Expired: clean it up so the row does not linger.
    await prisma.adminSession.delete({ where: { id: row.id } }).catch(() => {});
    return null;
  }
  return toInfo(row);
}

/** Delete a session by its raw token (logout). Missing tokens are a no-op. */
export async function deleteSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await prisma.adminSession
    .delete({ where: { tokenHash: sessionTokenHash(token) } })
    .catch(() => {});
}

/** True when the presented CSRF token matches the one bound to this session. */
export function sessionCsrfValid(info: AdminSessionInfo, presented: string | undefined | null): boolean {
  return verifyCsrfToken(info.tokenHash, presented);
}

/** The CSRF token to hand to the browser for this session. */
export function sessionCsrfToken(info: AdminSessionInfo): string {
  return csrfTokenFor(info.tokenHash);
}

function sessionTtl(): number {
  return 7 * 24 * 60 * 60 * 1000;
}

// Re-exported so route handlers build cookie options from one place.
export { sessionTtlSeconds } from "@/lib/auth";

export type { Prisma };
