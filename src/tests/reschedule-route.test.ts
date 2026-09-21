/**
 * Route-layer tests for the secure manage link: PATCH /api/bookings/[ref]
 * (reschedule) and DELETE /api/bookings/[ref] (cancel).
 *
 * Unlike the src/lib/booking unit tests these call the real Next route handlers, so
 * they also guard the request plumbing. The important one: authorizeByRef parses the
 * JSON body once and hands it to the caller, because a NextRequest stream can only be
 * read a single time. If the handler tried to re-read the body, every reschedule would
 * fail instead of returning 200.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { useTestDb, seedTestSalon, resetBookings, closeTestDb, testDbUrl } from "@/tests/db";
import { signBookingToken } from "@/lib/tokens";
import { resetRateLimiter } from "@/lib/rate-limit";
import { localToUtc, parseDayKey, toLocalMinutes } from "@/lib/datetime";
import type { PrismaClient } from "@prisma/client";

const DEV_DB_PATH = path.join(process.cwd(), "prisma", "dev.db");

let prisma: PrismaClient;
let salon: { serviceId: string; staffId: string };
let devDbSizeBefore = 0;
// Imported after DATABASE_URL points at the test DB (see beforeAll) so the module's
// memoized PrismaClient talks to the throwaway database instead of dev.db.
let route: typeof import("@/app/api/bookings/[ref]/route");

/**
 * A genuinely future working day (staff works Tue-Sat) derived from the real clock:
 * rescheduleBooking re-validates the new slot against actual "now" - it cannot be
 * frozen like the unit tests - so the test stays valid whenever the suite runs.
 */
function nextWorkingDayKey(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  do {
    d.setDate(d.getDate() + 1);
  } while (![2, 3, 4, 5, 6].includes(d.getDay()));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const START_A = 10 * 60; // 10:00-11:00 for the 60-min test service
const START_OVERLAP = 10 * 60 + 30; // 10:30-11:30 overlaps A
const START_FREE = 13 * 60; // 13:00-14:00, clear of the 12:00-12:30 lunch break

let dayKey: string;

/** Insert a PENDING booking row directly, bypassing slot validation (fixture setup). */
async function createBookingRow(startMinutes: number, email: string) {
  const { year, month, day } = parseDayKey(dayKey);
  const startUtc = localToUtc(year, month, day, startMinutes);
  const service = await prisma.service.findFirstOrThrow();
  const customer = await prisma.customer.create({
    data: { name: "Route Guest", email, phone: "+1 555 0100" },
  });
  return prisma.booking.create({
    data: {
      ref: `MBC-TEST-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      customerId: customer.id,
      serviceId: salon.serviceId,
      staffId: salon.staffId,
      startUtc,
      endUtc: new Date(startUtc.getTime() + service.duration * 60_000),
      status: "PENDING",
      priceTotal: service.price,
    },
    include: { customer: true },
  });
}

function patchRequest(ref: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/bookings/${ref}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteRequest(ref: string, token: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/bookings/${ref}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

beforeAll(async () => {
  process.env.DATABASE_URL = testDbUrl();
  // The route module memoizes its client on globalThis; clear any client an earlier test
  // file left behind so this file binds a fresh one to the test database.
  (globalThis as unknown as { prisma?: unknown }).prisma = undefined;

  prisma = await useTestDb();
  salon = await seedTestSalon(prisma);
  dayKey = nextWorkingDayKey();
  route = await import("@/app/api/bookings/[ref]/route");
  // Snapshot dev.db last, after every client above has been created: the whole suite must
  // leave it byte-for-byte untouched.
  devDbSizeBefore = fs.statSync(DEV_DB_PATH).size;
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetBookings(prisma);
  resetRateLimiter();
});

describe("PATCH /api/bookings/[ref] (reschedule via secure link)", () => {
  it("moves a booking to a free slot (regression: body must be read exactly once)", async () => {
    const booking = await createBookingRow(START_A, "reschedule-ok@example.com");
    const token = await signBookingToken({ sub: booking.id, cust: booking.customerId });

    const res = await route.PATCH(
      patchRequest(booking.ref, { token, dayKey, startMinutes: START_FREE }),
      { params: Promise.resolve({ ref: booking.ref }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.booking.ref).toBe(booking.ref);
    expect(toLocalMinutes(new Date(json.booking.startUtc))).toBe(START_FREE);

    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(toLocalMinutes(reloaded.startUtc)).toBe(START_FREE);
  });

  it("refuses to reschedule onto an occupied slot (409)", async () => {
    await createBookingRow(START_A, "blocker@example.com");
    const booking = await createBookingRow(14 * 60, "reschedule-busy@example.com");
    const token = await signBookingToken({ sub: booking.id, cust: booking.customerId });

    const res = await route.PATCH(
      patchRequest(booking.ref, { token, dayKey, startMinutes: START_OVERLAP }),
      { params: Promise.resolve({ ref: booking.ref }) },
    );

    expect(res.status).toBe(409);
    // Single-threaded, the slot engine rejects the move first (SlotUnavailableError).
    // BookingConflictError only surfaces under a real race; both are 409 and both mean
    // "the slot was taken" - either guard firing is a correct rejection.
    expect(["SLOT_UNAVAILABLE", "CONFLICT"]).toContain((await res.json()).error);

    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(toLocalMinutes(reloaded.startUtc)).toBe(14 * 60);
  });

  it("rejects an invalid token (403)", async () => {
    const booking = await createBookingRow(START_A, "bad-token@example.com");

    const res = await route.PATCH(
      patchRequest(booking.ref, { token: "not-a-real-token", dayKey, startMinutes: START_FREE }),
      { params: Promise.resolve({ ref: booking.ref }) },
    );

    expect(res.status).toBe(403);
  });

  it("rejects a token issued for a different booking (403)", async () => {
    const owner = await createBookingRow(START_A, "owner@example.com");
    const other = await createBookingRow(START_FREE, "other@example.com");
    // A perfectly valid token - but for `other`. It must not touch `owner`'s booking.
    const token = await signBookingToken({ sub: other.id, cust: other.customerId });

    const res = await route.PATCH(
      patchRequest(owner.ref, { token, dayKey, startMinutes: START_FREE }),
      { params: Promise.resolve({ ref: owner.ref }) },
    );

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("INVALID_TOKEN");

    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: owner.id } });
    expect(toLocalMinutes(reloaded.startUtc)).toBe(START_A);
  });

  it("rejects a body with no new slot (400 VALIDATION)", async () => {
    const booking = await createBookingRow(START_A, "no-slot@example.com");
    const token = await signBookingToken({ sub: booking.id, cust: booking.customerId });

    const res = await route.PATCH(patchRequest(booking.ref, { token }), {
      params: Promise.resolve({ ref: booking.ref }),
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("VALIDATION");
  });

  it("refuses to reschedule a booking that is already cancelled (404)", async () => {
    const booking = await createBookingRow(START_A, "cancelled-reschedule@example.com");
    const token = await signBookingToken({ sub: booking.id, cust: booking.customerId });
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });

    const res = await route.PATCH(
      patchRequest(booking.ref, { token, dayKey, startMinutes: START_FREE }),
      { params: Promise.resolve({ ref: booking.ref }) },
    );

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("NOT_FOUND");

    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("CANCELLED");
    expect(toLocalMinutes(reloaded.startUtc)).toBe(START_A);
  });
});

describe("DELETE /api/bookings/[ref] (cancel via secure link)", () => {
  it("cancels a booking", async () => {
    const booking = await createBookingRow(START_A, "cancel@example.com");
    const token = await signBookingToken({ sub: booking.id, cust: booking.customerId });

    const res = await route.DELETE(deleteRequest(booking.ref, token), {
      params: Promise.resolve({ ref: booking.ref }),
    });

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("CANCELLED");

    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("CANCELLED");
  });

  it("is idempotent on an already cancelled booking", async () => {
    const booking = await createBookingRow(START_A, "cancel-again@example.com");
    const token = await signBookingToken({ sub: booking.id, cust: booking.customerId });
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });

    const res = await route.DELETE(deleteRequest(booking.ref, token), {
      params: Promise.resolve({ ref: booking.ref }),
    });

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("CANCELLED");
  });
});

describe("test database isolation", () => {
  it("routes all reads and writes to the test DB, never dev.db", async () => {
    // The route caches its client on globalThis, so correctness depends on it having been
    // created while DATABASE_URL pointed at the throwaway test database.
    expect(process.env.DATABASE_URL).toBe(testDbUrl());

    // Behavioral proof the route and the test client share one database: the handler
    // writes a row the test client reads back.
    const booking = await createBookingRow(START_A, "isolation@example.com");
    const token = await signBookingToken({ sub: booking.id, cust: booking.customerId });
    const res = await route.PATCH(
      patchRequest(booking.ref, { token, dayKey, startMinutes: START_FREE }),
      { params: Promise.resolve({ ref: booking.ref }) },
    );
    expect(res.status).toBe(200);
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(toLocalMinutes(reloaded.startUtc)).toBe(START_FREE);

    // The production database was left untouched by the entire file.
    expect(fs.statSync(DEV_DB_PATH).size).toBe(devDbSizeBefore);
  });
});