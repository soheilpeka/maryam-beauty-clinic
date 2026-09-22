/**
 * Route-layer tests for the current public booking surface:
 *   - POST   /api/bookings        (submit a request)
 *   - DELETE /api/bookings/[ref]  (cancel via the secure manage link)
 *
 * These call the real Next route handlers, so they also guard the request plumbing. The
 * secure link uses the booking *ref* in the URL while the signed token carries the booking
 * *id* + customer id, so a token minted for one booking cannot touch another. Public
 * rescheduling was removed together with the slot engine, so there is no PATCH handler to
 * test anymore; cancel remains and is covered below.
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
// Unambiguously in the past relative to the real clock, for the "preferred time must be
// future" check.
const PAST_DAY_KEY = "2020-01-01";

let prisma: PrismaClient;
let salon: { serviceId: string; staffId: string };
let devDbSizeBefore = 0;
// Imported after DATABASE_URL points at the test DB (see beforeAll) so the modules'
// memoized PrismaClient talks to the throwaway database instead of dev.db.
let refRoute: typeof import("@/app/api/bookings/[ref]/route");
let bookingsRoute: typeof import("@/app/api/bookings/route");

/**
 * A genuinely future working day (staff works Tue-Sat) derived from the real clock: the
 * POST route validates the preferred time against actual "now" (there is no injected
 * clock at the route layer), so the test stays valid whenever the suite runs.
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

const START_A = 10 * 60; // 10:00-11:00 for the 60-min test service
const START_FREE = 13 * 60; // 13:00-14:00, clear of the 12:00-12:30 lunch break

let dayKey: string;

/** Insert a booking row directly, bypassing request validation (fixture setup). */
async function createBookingRow(
  startMinutes: number,
  email: string,
  status: "PENDING" | "CONFIRMED" = "PENDING",
) {
  const { year, month, day } = parseDayKey(dayKey);
  const startUtc = localToUtc(year, month, day, startMinutes);
  const service = await prisma.service.findFirstOrThrow();
  const customer = await prisma.customer.create({
    data: { name: "Route Guest", email, phone: "+1 555 0100" },
  });
  return prisma.booking.create({
    data: {
      ref: "MBC-TEST-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
      customerId: customer.id,
      serviceId: salon.serviceId,
      staffId: salon.staffId,
      startUtc,
      endUtc: new Date(startUtc.getTime() + service.duration * 60_000),
      status,
      priceTotal: service.price,
    },
    include: { customer: true },
  });
}

function validRequestBody(startMinutes = START_A, email = "route@example.com") {
  return {
    serviceId: salon.serviceId,
    staffId: salon.staffId,
    dayKey,
    startMinutes,
    customer: { name: "Route Guest", email, phone: "+1 555 0100" },
  };
}

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteRequest(ref: string, token: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/bookings/" + ref, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

beforeAll(async () => {
  process.env.DATABASE_URL = testDbUrl();
  // The POST route reads the admin address to notify the salon; supply one if the
  // environment did not.
  if (!process.env.ADMIN_INITIAL_EMAIL) {
    process.env.ADMIN_INITIAL_EMAIL = "admin@example.com";
  }
  // The route modules memoize their client on globalThis; clear any client an earlier test
  // file left behind so this file binds a fresh one to the test database.
  (globalThis as unknown as { prisma?: unknown }).prisma = undefined;

  prisma = await useTestDb();
  salon = await seedTestSalon(prisma);
  dayKey = nextWorkingDayKey();
  refRoute = await import("@/app/api/bookings/[ref]/route");
  bookingsRoute = await import("@/app/api/bookings/route");
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

describe("POST /api/bookings (public request submission)", () => {
  it("records a PENDING request and returns the secure manage link", async () => {
    const res = await bookingsRoute.POST(postRequest(validRequestBody()));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.booking.status).toBe("PENDING");
    expect(json.booking.ref).toMatch(/^MBC-/);
    // The customer's cancel link carries the signed token for this exact booking.
    expect(json.manageUrl).toContain("/booking/" + json.booking.ref + "?t=");

    const stored = await prisma.booking.findUniqueOrThrow({ where: { ref: json.booking.ref } });
    expect(stored.status).toBe("PENDING");
  });

  it("accepts two requests for the same preferred time (availability is enforced only at confirm time)", async () => {
    const first = await bookingsRoute.POST(postRequest(validRequestBody(START_A, "a@example.com")));
    const second = await bookingsRoute.POST(
      postRequest(validRequestBody(START_A, "b@example.com")),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await prisma.booking.count()).toBe(2);
  });

  it("rejects a body with missing fields (400 VALIDATION)", async () => {
    const res = await bookingsRoute.POST(postRequest({ serviceId: salon.serviceId }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("VALIDATION");
  });

  it("rejects an unknown service (404 NOT_FOUND)", async () => {
    const res = await bookingsRoute.POST(
      postRequest({ ...validRequestBody(), serviceId: "no-such-service" }),
    );

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("NOT_FOUND");
  });

  it("rejects a preferred time in the past (400 PAST_TIME)", async () => {
    const res = await bookingsRoute.POST(
      postRequest({ ...validRequestBody(), dayKey: PAST_DAY_KEY }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("PAST_TIME");
  });

  it("rate-limits repeated submissions (429)", async () => {
    // The endpoint allows 5 submissions per minute per IP; the sixth is blocked.
    for (let i = 0; i < 5; i++) {
      const res = await bookingsRoute.POST(
        postRequest(validRequestBody(START_A, "rl-" + i + "@example.com")),
      );
      expect(res.status).toBe(200);
    }

    const blocked = await bookingsRoute.POST(
      postRequest(validRequestBody(START_A, "rl-extra@example.com")),
    );
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toBe("TOO_MANY_REQUESTS");
  });
});

describe("DELETE /api/bookings/[ref] (cancel via secure link)", () => {
  it("cancels a confirmed booking", async () => {
    const booking = await createBookingRow(START_A, "cancel-confirmed@example.com", "CONFIRMED");
    const token = await signBookingToken({ sub: booking.id, cust: booking.customerId });

    const res = await refRoute.DELETE(deleteRequest(booking.ref, token), {
      params: Promise.resolve({ ref: booking.ref }),
    });

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("CANCELLED");

    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("CANCELLED");
  });

  it("cancels a pending request", async () => {
    const booking = await createBookingRow(START_A, "cancel-pending@example.com");
    const token = await signBookingToken({ sub: booking.id, cust: booking.customerId });

    const res = await refRoute.DELETE(deleteRequest(booking.ref, token), {
      params: Promise.resolve({ ref: booking.ref }),
    });

    expect(res.status).toBe(200);
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("CANCELLED");
  });

  it("is idempotent on an already-cancelled booking", async () => {
    const booking = await createBookingRow(START_A, "cancel-again@example.com");
    const token = await signBookingToken({ sub: booking.id, cust: booking.customerId });
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });

    const res = await refRoute.DELETE(deleteRequest(booking.ref, token), {
      params: Promise.resolve({ ref: booking.ref }),
    });

    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("CANCELLED");
  });

  it("rejects an invalid token (403) and leaves the booking untouched", async () => {
    const booking = await createBookingRow(START_A, "bad-token@example.com");

    const res = await refRoute.DELETE(deleteRequest(booking.ref, "not-a-real-token"), {
      params: Promise.resolve({ ref: booking.ref }),
    });

    expect(res.status).toBe(403);
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("PENDING");
  });

  it("rejects a missing token (403)", async () => {
    const booking = await createBookingRow(START_A, "no-token@example.com");

    const res = await refRoute.DELETE(deleteRequest(booking.ref, ""), {
      params: Promise.resolve({ ref: booking.ref }),
    });

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("INVALID_TOKEN");
  });

  it("rejects a token issued for a different booking (403) and leaves it untouched", async () => {
    const owner = await createBookingRow(START_A, "owner@example.com");
    const other = await createBookingRow(START_FREE, "other@example.com");
    // A perfectly valid token - but for `other`. It must not touch `owner`'s booking.
    const token = await signBookingToken({ sub: other.id, cust: other.customerId });

    const res = await refRoute.DELETE(deleteRequest(owner.ref, token), {
      params: Promise.resolve({ ref: owner.ref }),
    });

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("INVALID_TOKEN");

    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: owner.id } });
    expect(reloaded.status).toBe("PENDING");
    expect(toLocalMinutes(reloaded.startUtc)).toBe(START_A);
  });

  it("rejects a token whose customer does not match the booking (403)", async () => {
    const booking = await createBookingRow(START_A, "cust-mismatch@example.com");
    // Right booking, wrong customer: the link is bound to its original recipient.
    const token = await signBookingToken({ sub: booking.id, cust: "someone-else" });

    const res = await refRoute.DELETE(deleteRequest(booking.ref, token), {
      params: Promise.resolve({ ref: booking.ref }),
    });

    expect(res.status).toBe(403);
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("PENDING");
  });
});

describe("test database isolation", () => {
  it("routes all reads and writes to the test DB, never dev.db", async () => {
    // The routes cache their client on globalThis, so correctness depends on it having been
    // created while DATABASE_URL pointed at the throwaway test database.
    expect(process.env.DATABASE_URL).toBe(testDbUrl());

    // Behavioral proof the routes and the test client share one database: the handler
    // writes a row the test client reads back.
    const booking = await createBookingRow(START_A, "isolation@example.com");
    const token = await signBookingToken({ sub: booking.id, cust: booking.customerId });
    const res = await refRoute.DELETE(deleteRequest(booking.ref, token), {
      params: Promise.resolve({ ref: booking.ref }),
    });
    expect(res.status).toBe(200);
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(reloaded.status).toBe("CANCELLED");

    // The production database was left untouched by the entire file.
    expect(fs.statSync(DEV_DB_PATH).size).toBe(devDbSizeBefore);
  });
});
