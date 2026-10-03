import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { closeTestDb, testDbUrl, useTestDb } from "@/tests/db";
import { resetRateLimiter } from "@/lib/rate-limit";

const EMAIL = "security-admin@example.com";
const PASSWORD = "SyntheticPassword123!";
const BASE = "http://localhost:3000";
let prisma: PrismaClient;
let adminId: string;
let auth: typeof import("@/lib/auth");
let sessions: typeof import("@/lib/sessions");
let limits: typeof import("@/lib/login-limit");
let login: typeof import("@/app/api/admin/login/route");

function loginRequest(body: unknown, extraHeaders: Record<string, string> = {}): NextRequest {
  return new NextRequest(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  // These helpers only connect to prisma/test.db. They never read the application's
  // configured database or bootstrap real credentials.
  vi.stubEnv("DATABASE_URL", testDbUrl());
  vi.stubEnv("BOOKING_LINK_SECRET", "synthetic-auth-test-secret-at-least-32-characters");
  vi.stubEnv("ADMIN_SESSION_COOKIE", "mbc_admin_session");
  (globalThis as unknown as { prisma?: unknown }).prisma = undefined;
  prisma = await useTestDb();
  auth = await import("@/lib/auth");
  sessions = await import("@/lib/sessions");
  limits = await import("@/lib/login-limit");
  login = await import("@/app/api/admin/login/route");
  const passwordHash = await auth.hashPassword(PASSWORD);
  const admin = await prisma.adminUser.upsert({
    where: { email: EMAIL },
    update: { passwordHash },
    create: { email: EMAIL, passwordHash, name: "Synthetic admin" },
  });
  adminId = admin.id;
});

beforeEach(async () => {
  vi.restoreAllMocks();
  resetRateLimiter();
  await prisma.adminSession.deleteMany({ where: { adminId } });
  await prisma.loginFailure.deleteMany();
});

afterAll(async () => {
  vi.restoreAllMocks();
  const runtimePrisma = (globalThis as unknown as { prisma?: PrismaClient }).prisma;
  await runtimePrisma?.$disconnect();
  (globalThis as unknown as { prisma?: unknown }).prisma = undefined;
  await closeTestDb();
  vi.unstubAllEnvs();
});

describe("admin login security", () => {
  it("uses a valid cost-12 bcrypt hash for an unknown account", async () => {
    const compare = vi.spyOn(bcrypt, "compare");
    const response = await login.POST(loginRequest({ email: "unknown@example.com", password: PASSWORD }));
    expect(response.status).toBe(401);
    const hash = compare.mock.calls[0][1] as string;
    expect(hash).toHaveLength(60);
    expect(bcrypt.getRounds(hash)).toBe(12);
    expect(compare).toHaveBeenCalledOnce();
  });

  it("rejects cross-origin and simple form requests before checking passwords", async () => {
    const credentials = { email: EMAIL, password: PASSWORD };
    const compare = vi.spyOn(bcrypt, "compare");
    expect((await login.POST(loginRequest(credentials, { origin: "https://untrusted.example" }))).status).toBe(403);
    expect((await login.POST(loginRequest(credentials, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await login.POST(loginRequest(credentials, { "content-type": "text/plain" }))).status).toBe(400);
    expect(compare).not.toHaveBeenCalled();
  });

  it("allows same-origin JSON login and sets an HttpOnly SameSite cookie", async () => {
    const response = await login.POST(loginRequest({ email: EMAIL, password: PASSWORD }, { origin: BASE }));
    expect(response.status).toBe(200);
    const cookie = response.cookies.get("mbc_admin_session");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect((await sessions.getSession(cookie?.value))?.adminId).toBe(adminId);
  });

  it("rejects bcrypt password truncation including multibyte inputs", async () => {
    await expect(auth.hashPassword("x".repeat(73))).rejects.toThrow("72-byte");
    await expect(auth.hashPassword("é".repeat(37))).rejects.toThrow("72-byte");
    const hash = await auth.hashPassword("x".repeat(72));
    expect(await auth.verifyPassword("x".repeat(72), hash)).toBe(true);
    expect(await auth.verifyPassword("x".repeat(72) + "different-suffix", hash)).toBe(false);
  });
});

describe("atomic account login lockouts", () => {
  it("locks after five concurrent failures without losing increments", async () => {
    await Promise.all(Array.from({ length: 5 }, () => limits.recordFailedLogin(EMAIL)));
    const state = await limits.accountLockState(EMAIL);
    expect(state.locked).toBe(true);
    expect(state.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets failures after the fixed window rather than accumulating old failures", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    await limits.recordFailedLogin(EMAIL);
    await limits.recordFailedLogin(EMAIL);
    await limits.recordFailedLogin(EMAIL);
    await limits.recordFailedLogin(EMAIL);
    vi.spyOn(Date, "now").mockReturnValue(now + limits.LOGIN_LIMIT_CONSTANTS.WINDOW_MS);
    expect((await limits.recordFailedLogin(EMAIL)).locked).toBe(false);
    const row = await prisma.loginFailure.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(row.attempts).toBe(1);
    expect(row.windowStart.getTime()).toBe(now + limits.LOGIN_LIMIT_CONSTANTS.WINDOW_MS);
  });

  it("preserves a live lock deadline and permits attempts after it expires", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    for (let i = 0; i < 5; i++) await limits.recordFailedLogin(EMAIL);
    const first = await prisma.loginFailure.findUniqueOrThrow({ where: { email: EMAIL } });
    vi.spyOn(Date, "now").mockReturnValue(now + 60_000);
    await limits.recordFailedLogin(EMAIL);
    const second = await prisma.loginFailure.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(second.lockedUntil).toEqual(first.lockedUntil);
    vi.spyOn(Date, "now").mockReturnValue(first.lockedUntil!.getTime());
    expect((await limits.recordFailedLogin(EMAIL)).locked).toBe(false);
    expect((await prisma.loginFailure.findUniqueOrThrow({ where: { email: EMAIL } })).attempts).toBe(1);
  });
});

describe("admin session lifecycle", () => {
  it("keeps one live session across concurrent sign-ins", async () => {
    const issued = await Promise.all([sessions.createSession(adminId), sessions.createSession(adminId)]);
    expect(await prisma.adminSession.count({ where: { adminId } })).toBe(1);
    const resolved = await Promise.all(issued.map(({ token }) => sessions.getSession(token)));
    expect(resolved.filter(Boolean)).toHaveLength(1);
  });

  it("binds CSRF to its session and revokes tokens on logout", async () => {
    const first = await sessions.createSession(adminId);
    const firstCsrf = sessions.sessionCsrfToken(first.info);
    const second = await sessions.createSession(adminId);
    expect(sessions.sessionCsrfValid(second.info, firstCsrf)).toBe(false);
    expect(sessions.sessionCsrfValid(second.info, sessions.sessionCsrfToken(second.info))).toBe(true);
    expect(await sessions.getSession(first.token)).toBeNull();
    await sessions.deleteSession(second.token);
    await sessions.deleteSession(second.token);
    expect(await sessions.getSession(second.token)).toBeNull();
  });

  it("expires sessions on the server regardless of retained cookies", async () => {
    const issued = await sessions.createSession(adminId);
    await prisma.adminSession.update({ where: { tokenHash: issued.info.tokenHash }, data: { expiresAt: new Date(0) } });
    expect(await sessions.getSession(issued.token)).toBeNull();
  });

  it("returns a generic error when logout cannot revoke the session", async () => {
    const issued = await sessions.createSession(adminId);
    const runtimePrisma = (globalThis as unknown as { prisma: PrismaClient }).prisma;
    vi.spyOn(runtimePrisma.adminSession, "deleteMany").mockRejectedValueOnce(new Error("synthetic-database-failure"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const logout = await import("@/app/api/admin/logout/route");
    const request = new NextRequest(`${BASE}/api/admin/logout`, {
      method: "POST",
      headers: {
        cookie: `mbc_admin_session=${issued.token}`,
        "x-admin-csrf": sessions.sessionCsrfToken(issued.info),
      },
    });
    const response = await logout.POST(request);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "INTERNAL", message: "Something went wrong." });
    expect(response.cookies.get("mbc_admin_session")).toBeUndefined();
    expect(await sessions.getSession(issued.token)).not.toBeNull();
  });

  it("revokes all sessions and clears lockouts when bootstrap resets a password", async () => {
    const issued = await sessions.createSession(adminId);
    for (let i = 0; i < 5; i++) await limits.recordFailedLogin(EMAIL);
    const { resetInitialAdminPassword } = await import("@/lib/admin-password");
    await resetInitialAdminPassword(prisma, EMAIL, PASSWORD);
    expect(await sessions.getSession(issued.token)).toBeNull();
    expect((await limits.accountLockState(EMAIL)).locked).toBe(false);
    expect(await prisma.adminSession.count({ where: { adminId } })).toBe(0);
  });

  it("rejects an old-password login when reset commits before session issuance", async () => {
    const { resetInitialAdminPassword } = await import("@/lib/admin-password");
    const originalCreateSession = sessions.createSession;
    // This runs after the route verifies PASSWORD, before its transaction begins.
    vi.spyOn(sessions, "createSession").mockImplementationOnce(async (id, verifiedHash) => {
      await resetInitialAdminPassword(prisma, EMAIL, "ReplacementSynthetic123!");
      return originalCreateSession(id, verifiedHash);
    });
    try {
      const response = await login.POST(loginRequest({ email: EMAIL, password: PASSWORD }));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "INVALID_CREDENTIALS", message: "Invalid email or password." });
      expect(response.cookies.get("mbc_admin_session")).toBeUndefined();
      expect(await prisma.adminSession.count({ where: { adminId } })).toBe(0);
    } finally {
      await resetInitialAdminPassword(prisma, EMAIL, PASSWORD);
    }
  });

  it("rolls back session revocation if verified credentials are stale", async () => {
    const issued = await sessions.createSession(adminId);
    await expect(sessions.createSession(adminId, "stale-synthetic-hash"))
      .rejects.toBeInstanceOf(sessions.SessionCredentialsChangedError);
    expect((await sessions.getSession(issued.token))?.adminId).toBe(adminId);
    expect(await prisma.adminSession.count({ where: { adminId } })).toBe(1);
  });
});
