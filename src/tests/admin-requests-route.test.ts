/**
 * Route-layer tests for the admin Requests view:
 *   - GET    /api/admin/requests              (list, PENDING first, status filter)
 *   - POST   /api/admin/requests/[id]/confirm (confirm, conflict guard, duplicate race)
 *   - POST   /api/admin/requests/[id]/decline (decline with optional reason)
 *
 * Every handler goes through the same auth chain as production: a session cookie whose
 * token hash lives in AdminSession, plus an x-admin-csrf header that must be the HMAC of
 * that session. Unauthenticated and token-less calls are rejected before any data moves.
 * Each mutation also writes an AuditLog row, which these tests assert on.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { useTestDb, seedTestSalon, closeTestDb, testDbUrl } from "@/tests/db";
import { hashPassword, csrfTokenFor } from "@/lib/auth";
import { localToUtc, parseDayKey, toLocalMinutes } from "@/lib/datetime";
import type { PrismaClient } from "@prisma/client";

const DEV_DB_PATH = path.join(process.cwd(), "prisma", "dev.db");
const COOKIE = "mbc_admin_session";

let prisma: PrismaClient;
let salon: { serviceId: string; staffId: string };
let sessionToken: string;
let csrfToken: string;
let devDbSizeBefore = 0;

let requestsRoute: typeof import("@/app/api/admin/requests/route");
let confirmRoute: typeof import("@/app/api/admin/requests/[id]/confirm/route");
let declineRoute: typeof import("@/app/api/admin/requests/[id]/decline/route");
let sessions: typeof import("@/lib/sessions");
let notifications: typeof import("@/lib/notifications");

/**
 * A genuinely future working day. The confirm route validates against the real clock (no
 * injected time at the route layer), so the suite stays valid whenever it runs.
 */
function nextWorkingDayKey(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  do {
    d.setDate(d.getDate() + 1);
  } while (![2, 3, 4, 5, 6].includes(d.getDay()));
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

const DAY_KEY = nextWorkingDayKey();
const T_1000 = 10 * 60; // 10:00-11:00 for the 60-minute test service
const T_1030 = 10 * 60 + 30; // 10:30-11:30, partial overlap with 10:00
const T_1300 = 13 * 60; // 13:00-14:00, clear of the lunch break

let dayKey = DAY_KEY;

/** A PENDING request fixture written through the same library the public flow uses. */
async function createPendingRequest(startMinutes: number, email: string, note?: string) {
  const { year, month, day } = parseDayKey(dayKey);
  const startUtc = localToUtc(year, month, day, startMinutes);
  const service = await prisma.service.findFirstOrThrow();
  const customer = await prisma.customer.create({
    data: { name: "Admin Test Guest", email, phone: "+1 555 0100" },
  });
  return prisma.booking.create({
    data: {
      ref: "MBC-TEST-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
      customerId: customer.id,
      serviceId: salon.serviceId,
      staffId: salon.staffId,
      startUtc,
      endUtc: new Date(startUtc.getTime() + service.duration * 60_000),
      status: "PENDING",
      priceTotal: service.price,
      note: note ?? null,
    },
    include: { customer: true, service: true, staff: true },
  });
}

function authedGet(url: string): NextRequest {
  return new NextRequest(url, {
    method: "GET",
    headers: { cookie: `${COOKIE}=${sessionToken}` },
  });
}

function authedPost(url: string, body: unknown, csrf = csrfToken): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${COOKIE}=${sessionToken}`,
      "x-admin-csrf": csrf,
    },
    body: JSON.stringify(body),
  });
}

function unauthedPost(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  process.env.DATABASE_URL = testDbUrl();
  if (!process.env.ADMIN_INITIAL_EMAIL) process.env.ADMIN_INITIAL_EMAIL = "admin@example.com";
  // The route modules memoize their client on globalThis; clear any client an earlier test
  // file left behind so this file binds a fresh one to the test database.
  (globalThis as unknown as { prisma?: unknown }).prisma = undefined;

  prisma = await useTestDb();
  salon = await seedTestSalon(prisma);

  // upsert: the test DB file survives a schema re-push, so the row may already exist.
  const admin = await prisma.adminUser.upsert({
    where: { email: "admin-test@example.com" },
    update: { passwordHash: await hashPassword("Password123!"), name: "Test Admin" },
    create: {
      email: "admin-test@example.com",
      passwordHash: await hashPassword("Password123!"),
      name: "Test Admin",
    },
  });
  sessions = await import("@/lib/sessions");
  notifications = await import("@/lib/notifications");
  const created = await sessions.createSession(admin.id);
  sessionToken = created.token;
  csrfToken = csrfTokenFor(created.info.tokenHash);

  requestsRoute = await import("@/app/api/admin/requests/route");
  confirmRoute = await import("@/app/api/admin/requests/[id]/confirm/route");
  declineRoute = await import("@/app/api/admin/requests/[id]/decline/route");

  devDbSizeBefore = fs.statSync(DEV_DB_PATH).size;
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
});

describe("auth and CSRF", () => {
  it("rejects an unauthenticated GET with 401 and leaks no bookings", async () => {
    const res = await requestsRoute.GET(
      new NextRequest("http://localhost:3000/api/admin/requests", { method: "GET" }),
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("UNAUTHORIZED");
  });

  it("rejects an unauthenticated confirm with 401", async () => {
    const booking = await createPendingRequest(T_1000, "noauth@example.com");
    const res = await confirmRoute.POST(
      unauthedPost(`http://localhost:3000/api/admin/requests/${booking.id}/confirm`, {
        dayKey,
        startMinutes: T_1000,
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(res.status).toBe(401);
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("PENDING");
  });

  it("rejects an authenticated confirm without a CSRF token with 403", async () => {
    const booking = await createPendingRequest(T_1000, "nocsrf@example.com");
    const res = await confirmRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${booking.id}/confirm`, {
        dayKey,
        startMinutes: T_1000,
      }, ""),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("FORBIDDEN");
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("PENDING");
  });
});

describe("GET /api/admin/requests", () => {
  it("lists PENDING requests first, then confirmed ones", async () => {
    const confirmed = await createPendingRequest(T_1300, "list-confirmed@example.com");
    await prisma.booking.update({ where: { id: confirmed.id }, data: { status: "CONFIRMED" } });
    const pending = await createPendingRequest(T_1000, "list-pending@example.com");

    const res = await requestsRoute.GET(authedGet("http://localhost:3000/api/admin/requests"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bookings[0].id).toBe(pending.id);
    expect(json.bookings[0].status).toBe("PENDING");
    expect(json.bookings[1].id).toBe(confirmed.id);
    // Localized fields the date/time pickers in the UI rely on.
    expect(json.bookings[0].dayKey).toBe(dayKey);
    expect(json.bookings[0].startMinutes).toBe(T_1000);
    expect(json.staff.length).toBeGreaterThan(0);
  });

  it("filters DECLINED (salon-declined) separately from customer CANCELLED", async () => {
    const declined = await createPendingRequest(T_1000, "declined@example.com");
    await declineRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${declined.id}/decline`, {
        reason: "Fully booked",
      }),
      { params: Promise.resolve({ id: declined.id }) },
    );
    const cancelledByCustomer = await createPendingRequest(T_1030, "cust-cancel@example.com");
    await prisma.booking.update({
      where: { id: cancelledByCustomer.id },
      data: { status: "CANCELLED", note: "Customer changed plans" },
    });
    // A cancelled request with NO note must still appear under CANCELLED (NOT (note LIKE ...)
    // is not TRUE for a NULL note in SQL, so this is a regression guard).
    const cancelledNoNote = await createPendingRequest(T_1300, "cust-cancel-silent@example.com");
    await prisma.booking.update({
      where: { id: cancelledNoNote.id },
      data: { status: "CANCELLED", note: null },
    });

    const declinedRes = await requestsRoute.GET(
      authedGet("http://localhost:3000/api/admin/requests?status=DECLINED"),
    );
    const declinedJson = await declinedRes.json();
    expect(declinedJson.bookings.map((b: { id: string }) => b.id)).toEqual([declined.id]);
    expect(declinedJson.bookings[0].declined).toBe(true);

    const cancelledRes = await requestsRoute.GET(
      authedGet("http://localhost:3000/api/admin/requests?status=CANCELLED"),
    );
    const cancelledJson = await cancelledRes.json();
    expect(cancelledJson.bookings.map((b: { id: string }) => b.id)).toEqual([
      cancelledByCustomer.id,
      cancelledNoNote.id,
    ]);
    expect(cancelledJson.bookings[0].declined).toBe(false);
  });
});

describe("POST /api/admin/requests/[id]/confirm", () => {
  it("confirms a pending request, notifies the customer, and writes an audit entry", async () => {
    const sendEmail = vi.spyOn(notifications.notificationProvider, "sendEmail");
    const sendSms = vi.spyOn(notifications.notificationProvider, "sendSms");
    const booking = await createPendingRequest(T_1000, "confirm-ok@example.com", "Please call on arrival");

    const res = await confirmRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${booking.id}/confirm`, {
        dayKey,
        startMinutes: T_1000,
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.alreadyConfirmed).toBe(false);
    expect(json.booking.status).toBe("CONFIRMED");

    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(stored.status).toBe("CONFIRMED");
    expect(toLocalMinutes(stored.startUtc)).toBe(T_1000);

    // Customer notification: one email + one SMS, to the customer, about THIS booking.
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendSms).toHaveBeenCalledTimes(1);
    const emailArg = sendEmail.mock.calls[0][0];
    expect(emailArg.to).toBe(booking.customer.email);
    expect(emailArg.subject).toContain(booking.ref);

    const audit = await prisma.auditLog.findMany({ where: { targetId: booking.id } });
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe("booking.confirm");
    expect(audit[0].detail).toContain("CONFIRMED");

    sendEmail.mockRestore();
    sendSms.mockRestore();
  });

  it("confirms with an adjusted time and keeps the moved slot", async () => {
    const booking = await createPendingRequest(T_1000, "confirm-move@example.com");

    const res = await confirmRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${booking.id}/confirm`, {
        dayKey,
        startMinutes: T_1300,
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );

    expect(res.status).toBe(200);
    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(toLocalMinutes(stored.startUtc)).toBe(T_1300);
  });

  it("reports a conflict (409) when the slot overlaps a CONFIRMED booking and leaves it PENDING", async () => {
    const sendEmail = vi.spyOn(notifications.notificationProvider, "sendEmail");
    const first = await createPendingRequest(T_1000, "conflict-a@example.com");
    const second = await createPendingRequest(T_1030, "conflict-b@example.com");

    const okRes = await confirmRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${first.id}/confirm`, {
        dayKey,
        startMinutes: T_1000,
      }),
      { params: Promise.resolve({ id: first.id }) },
    );
    expect(okRes.status).toBe(200);

    const conflictRes = await confirmRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${second.id}/confirm`, {
        dayKey,
        startMinutes: T_1030,
      }),
      { params: Promise.resolve({ id: second.id }) },
    );
    expect(conflictRes.status).toBe(409);
    expect((await conflictRes.json()).error).toBe("CONFLICT");

    // The conflicting request must stay exactly where it was, unconfirmed.
    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: second.id } });
    expect(stored.status).toBe("PENDING");
    expect(toLocalMinutes(stored.startUtc)).toBe(T_1030);

    // The rejected attempt must not have notified the customer of a confirmation.
    expect(sendEmail).toHaveBeenCalledTimes(1);
    sendEmail.mockRestore();
  });

  it("lets the admin resolve a conflict by moving the time before confirming", async () => {
    const first = await createPendingRequest(T_1000, "resolve-a@example.com");
    const second = await createPendingRequest(T_1030, "resolve-b@example.com");

    await confirmRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${first.id}/confirm`, {
        dayKey,
        startMinutes: T_1000,
      }),
      { params: Promise.resolve({ id: first.id }) },
    );

    // Same conflict, but this time the admin picks the free 13:00 slot.
    const res = await confirmRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${second.id}/confirm`, {
        dayKey,
        startMinutes: T_1300,
      }),
      { params: Promise.resolve({ id: second.id }) },
    );
    expect(res.status).toBe(200);
    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: second.id } });
    expect(stored.status).toBe("CONFIRMED");
    expect(toLocalMinutes(stored.startUtc)).toBe(T_1300);
  });

  it("treats a duplicate confirm as an idempotent no-op (no second notification)", async () => {
    const sendEmail = vi.spyOn(notifications.notificationProvider, "sendEmail");
    const booking = await createPendingRequest(T_1000, "dup-confirm@example.com");

    const first = await confirmRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${booking.id}/confirm`, {
        dayKey,
        startMinutes: T_1000,
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(first.status).toBe(200);

    // A second admin (or a double-click) confirms the same request again.
    const second = await confirmRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${booking.id}/confirm`, {
        dayKey,
        startMinutes: T_1000,
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(second.status).toBe(200);
    expect((await second.json()).alreadyConfirmed).toBe(true);

    // Exactly one customer notification for one real status change.
    expect(sendEmail).toHaveBeenCalledTimes(1);
    // Both attempts are recorded in the audit trail.
    const audit = await prisma.auditLog.count({
      where: { action: "booking.confirm", targetId: booking.id },
    });
    expect(audit).toBe(2);

    sendEmail.mockRestore();
  });

  it("returns 404 for an unknown booking id", async () => {
    const res = await confirmRoute.POST(
      authedPost("http://localhost:3000/api/admin/requests/no-such-id/confirm", {
        dayKey,
        startMinutes: T_1000,
      }),
      { params: Promise.resolve({ id: "no-such-id" }) },
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("NOT_FOUND");
  });

  it("rejects an invalid time adjust with 400 VALIDATION", async () => {
    const booking = await createPendingRequest(T_1000, "bad-time@example.com");
    const res = await confirmRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${booking.id}/confirm`, {
        dayKey: "not-a-date",
        startMinutes: T_1000,
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("VALIDATION");
  });
});

describe("POST /api/admin/requests/[id]/decline", () => {
  it("declines a request, notifies the customer with the reason, and audits", async () => {
    const sendEmail = vi.spyOn(notifications.notificationProvider, "sendEmail");
    const booking = await createPendingRequest(T_1000, "decline-ok@example.com");

    const res = await declineRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${booking.id}/decline`, {
        reason: "We are fully booked that day",
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );

    expect(res.status).toBe(200);
    expect((await res.json()).booking.status).toBe("CANCELLED");

    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(stored.status).toBe("CANCELLED");
    expect(stored.note).toContain("[declined]");
    expect(stored.note).toContain("We are fully booked that day");

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailArg = sendEmail.mock.calls[0][0];
    expect(emailArg.to).toBe(booking.customer.email);
    expect(emailArg.body).toContain("We are fully booked that day");

    const audit = await prisma.auditLog.findMany({ where: { targetId: booking.id } });
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe("booking.decline");

    sendEmail.mockRestore();
  });

  it("declines without a reason (optional) and still notifies", async () => {
    const sendEmail = vi.spyOn(notifications.notificationProvider, "sendEmail");
    const booking = await createPendingRequest(T_1000, "decline-no-reason@example.com");

    const res = await declineRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${booking.id}/decline`, {}),
      { params: Promise.resolve({ id: booking.id }) },
    );

    expect(res.status).toBe(200);
    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(stored.status).toBe("CANCELLED");
    expect(stored.note).toContain("[declined]");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    sendEmail.mockRestore();
  });

  it("is idempotent on an already-declined request", async () => {
    const booking = await createPendingRequest(T_1000, "decline-twice@example.com");
    const ctx = { params: Promise.resolve({ id: booking.id }) };

    const first = await declineRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${booking.id}/decline`, {}),
      ctx,
    );
    expect(first.status).toBe(200);
    const second = await declineRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${booking.id}/decline`, {}),
      ctx,
    );
    expect(second.status).toBe(200);
    expect((await second.json()).booking.status).toBe("CANCELLED");
  });

  it("requires a session (401) even with a valid-looking body", async () => {
    const booking = await createPendingRequest(T_1000, "decline-noauth@example.com");
    const res = await declineRoute.POST(
      unauthedPost(`http://localhost:3000/api/admin/requests/${booking.id}/decline`, {}),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(res.status).toBe(401);
    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(stored.status).toBe("PENDING");
  });
});

describe("test database isolation", () => {
  it("routes all writes to the test DB, never dev.db", async () => {
    expect(process.env.DATABASE_URL).toBe(testDbUrl());
    const booking = await createPendingRequest(T_1000, "isolation2@example.com");
    const res = await confirmRoute.POST(
      authedPost(`http://localhost:3000/api/admin/requests/${booking.id}/confirm`, {
        dayKey,
        startMinutes: T_1000,
      }),
      { params: Promise.resolve({ id: booking.id }) },
    );
    expect(res.status).toBe(200);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status,
    ).toBe("CONFIRMED");
    expect(fs.statSync(DEV_DB_PATH).size).toBe(devDbSizeBefore);
  });
});
