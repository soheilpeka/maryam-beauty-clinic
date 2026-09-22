import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createBookingRequest,
  confirmBookingRequest,
  declineBookingRequest,
  BookingConflictError,
  BookingNotFoundError,
  BookingStateError,
  bookingsOverlap,
} from "@/lib/booking";
import { useTestDb, seedTestSalon, resetBookings, closeTestDb, FAR_FUTURE_NOW } from "@/tests/db";
import { localToUtc, toLocalMinutes } from "@/lib/datetime";
import type { PrismaClient, Booking } from "@prisma/client";

// Tuesday 2026-03-10 (staff works Tue-Sat). The public site no longer computes slots: a
// request carries a preferred day + preferred time in salon-local minutes, and the only
// availability check runs later, when the salon confirms.
const DAY_KEY = "2026-03-10";
const START_A = 10 * 60; // 10:00-11:00
const START_B = START_A + 30; // 10:30-11:30 (partial overlap with A)
const START_BACK_TO_BACK = START_A + 60; // 11:00-12:00 (touches A exactly, allowed)
const START_FREE = 13 * 60; // 13:00-14:00

let prisma: PrismaClient;
let serviceId: string;
let staffId: string;

function requestInput(
  startMinutes: number,
  email = "guest@example.com",
  dayKey = DAY_KEY,
  note?: string,
) {
  return {
    serviceId,
    staffId,
    dayKey,
    startMinutes,
    customer: { name: "Test Guest", email, phone: "+1 555 0100", note },
    locale: "en" as const,
    now: FAR_FUTURE_NOW,
  };
}

function confirmInput(booking: Booking, startMinutes: number, dayKey = DAY_KEY) {
  return { bookingId: booking.id, staffId, dayKey, startMinutes, now: FAR_FUTURE_NOW };
}

// Shared setup for every test in this file: a clean, deterministic salon and a reset
// booking table before each case (hooks are file-level so all describes stay isolated).
beforeAll(async () => {
  prisma = await useTestDb();
  const salon = await seedTestSalon(prisma);
  serviceId = salon.serviceId;
  staffId = salon.staffId;
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetBookings(prisma);
});

describe("request submission (no availability check at request time)", () => {
  it("records a PENDING request with the derived end time and price", async () => {
    const result = await createBookingRequest(prisma, requestInput(START_A));

    expect(result.booking.status).toBe("PENDING");
    expect(result.booking.startUtc.toISOString()).toBe(
      localToUtc(2026, 2, 10, START_A).toISOString(),
    );
    expect(result.booking.endUtc.toISOString()).toBe(
      localToUtc(2026, 2, 10, START_A + 60).toISOString(),
    );
    expect(result.booking.priceTotal).toBe(result.service.price);
  });

  it("allows two requests for the same preferred time: both land PENDING", async () => {
    // Availability is only enforced at confirm time, so overlapping preferences are both
    // recorded for the salon to arbitrate.
    await createBookingRequest(prisma, requestInput(START_A, "a@example.com"));
    await createBookingRequest(prisma, requestInput(START_A, "b@example.com"));

    const bookings = await prisma.booking.findMany();
    expect(bookings).toHaveLength(2);
    expect(bookings.every((b) => b.status === "PENDING")).toBe(true);
  });

  it("accepts a note and upserts the customer (new vs returning)", async () => {
    const first = await createBookingRequest(
      prisma,
      requestInput(START_A, "repeat@example.com", DAY_KEY, "please call before arriving"),
    );
    expect(first.isNewCustomer).toBe(true);
    expect(first.booking.note).toBe("please call before arriving");

    const second = await createBookingRequest(
      prisma,
      requestInput(START_FREE, "repeat@example.com"),
    );
    expect(second.isNewCustomer).toBe(false);
    expect(second.customer.id).toBe(first.customer.id);
    expect(await prisma.customer.count()).toBe(1);
  });

  it("rejects a preferred time in the past", async () => {
    await expect(
      createBookingRequest(prisma, requestInput(START_A, "past@example.com", "2025-06-01")),
    ).rejects.toThrow(BookingStateError);

    expect(await prisma.booking.count()).toBe(0);
  });

  it("rejects an unknown service or staff", async () => {
    await expect(
      createBookingRequest(prisma, { ...requestInput(START_A), serviceId: "no-such-service" }),
    ).rejects.toThrow(BookingNotFoundError);

    await expect(
      createBookingRequest(prisma, { ...requestInput(START_A), staffId: "no-such-staff" }),
    ).rejects.toThrow(BookingNotFoundError);

    expect(await prisma.booking.count()).toBe(0);
  });
});

describe("overlap prevention at confirm time", () => {
  it("confirms a pending request", async () => {
    const created = await createBookingRequest(prisma, requestInput(START_A));

    const confirmed = await confirmBookingRequest(prisma, confirmInput(created.booking, START_A));

    expect(confirmed.alreadyConfirmed).toBe(false);
    expect(confirmed.booking.status).toBe("CONFIRMED");
    expect(confirmed.booking.startUtc.toISOString()).toBe(
      localToUtc(2026, 2, 10, START_A).toISOString(),
    );
  });

  it("rejects confirming onto an identical confirmed slot", async () => {
    const first = await createBookingRequest(prisma, requestInput(START_A, "a@example.com"));
    await confirmBookingRequest(prisma, confirmInput(first.booking, START_A));

    const second = await createBookingRequest(prisma, requestInput(START_A, "b@example.com"));
    await expect(
      confirmBookingRequest(prisma, confirmInput(second.booking, START_A)),
    ).rejects.toThrow(BookingConflictError);

    // The loser stays PENDING so the salon can offer another time.
    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: second.booking.id } });
    expect(reloaded.status).toBe("PENDING");
    expect(await prisma.booking.count({ where: { status: "CONFIRMED" } })).toBe(1);
  });

  it("rejects a partial overlap at confirm time (10:00-11:00 vs 10:30-11:30)", async () => {
    const first = await createBookingRequest(prisma, requestInput(START_A, "a@example.com"));
    const second = await createBookingRequest(prisma, requestInput(START_B, "b@example.com"));
    await confirmBookingRequest(prisma, confirmInput(first.booking, START_A));

    await expect(
      confirmBookingRequest(prisma, confirmInput(second.booking, START_B)),
    ).rejects.toThrow(BookingConflictError);

    expect(await prisma.booking.count({ where: { status: "CONFIRMED" } })).toBe(1);
  });

  it("allows back-to-back confirmed bookings (11:00 starts exactly when 10:00 ends)", async () => {
    const first = await createBookingRequest(prisma, requestInput(START_A, "a@example.com"));
    const second = await createBookingRequest(
      prisma,
      requestInput(START_BACK_TO_BACK, "b@example.com"),
    );

    await confirmBookingRequest(prisma, confirmInput(first.booking, START_A));
    const confirmed = await confirmBookingRequest(
      prisma,
      confirmInput(second.booking, START_BACK_TO_BACK),
    );

    expect(confirmed.booking.status).toBe("CONFIRMED");
    expect(await prisma.booking.count({ where: { status: "CONFIRMED" } })).toBe(2);
  });

  it("moves a request to a free slot while confirming (admin time adjust)", async () => {
    const created = await createBookingRequest(prisma, requestInput(START_A));

    const confirmed = await confirmBookingRequest(
      prisma,
      confirmInput(created.booking, START_FREE),
    );

    expect(confirmed.booking.startUtc.toISOString()).toBe(
      localToUtc(2026, 2, 10, START_FREE).toISOString(),
    );

    // The originally preferred 10:00 slot is free again for another request.
    const other = await createBookingRequest(prisma, requestInput(START_A, "other@example.com"));
    const otherConfirmed = await confirmBookingRequest(
      prisma,
      confirmInput(other.booking, START_A),
    );
    expect(otherConfirmed.booking.status).toBe("CONFIRMED");
  });

  it("ignores CANCELLED bookings when checking overlap", async () => {
    const first = await createBookingRequest(prisma, requestInput(START_A, "a@example.com"));
    await confirmBookingRequest(prisma, confirmInput(first.booking, START_A));
    await declineBookingRequest(prisma, { bookingId: first.booking.id });

    // Confirming another request at the same slot is allowed: the cancelled one no longer
    // blocks.
    const second = await createBookingRequest(prisma, requestInput(START_A, "b@example.com"));
    const confirmed = await confirmBookingRequest(prisma, confirmInput(second.booking, START_A));
    expect(confirmed.booking.status).toBe("CONFIRMED");
  });

  it("refuses to confirm a cancelled request", async () => {
    const created = await createBookingRequest(prisma, requestInput(START_A));
    await declineBookingRequest(prisma, { bookingId: created.booking.id });

    await expect(
      confirmBookingRequest(prisma, confirmInput(created.booking, START_FREE)),
    ).rejects.toThrow(BookingStateError);

    const reloaded = await prisma.booking.findUniqueOrThrow({ where: { id: created.booking.id } });
    expect(reloaded.status).toBe("CANCELLED");
  });

  it("treats a duplicate confirm of the same request as idempotent", async () => {
    const created = await createBookingRequest(prisma, requestInput(START_A));

    const first = await confirmBookingRequest(prisma, confirmInput(created.booking, START_A));
    const second = await confirmBookingRequest(prisma, confirmInput(created.booking, START_A));

    expect(first.alreadyConfirmed).toBe(false);
    // A second admin confirming the same request is a clean no-op, not an error.
    expect(second.alreadyConfirmed).toBe(true);
    expect(await prisma.booking.count({ where: { status: "CONFIRMED" } })).toBe(1);
  });

  it("lets two overlapping requests race to confirm: exactly one wins", async () => {
    // Two PENDING requests for overlapping times, confirmed together. The atomic
    // conditional UPDATE must serialize them: one wins, the other hits the overlap guard.
    const a = await createBookingRequest(prisma, requestInput(START_A, "racer1@example.com"));
    const b = await createBookingRequest(prisma, requestInput(START_B, "racer2@example.com"));

    const attempts = await Promise.allSettled([
      confirmBookingRequest(prisma, confirmInput(a.booking, START_A)),
      confirmBookingRequest(prisma, confirmInput(b.booking, START_B)),
    ]);

    const fulfilled = attempts.filter((r) => r.status === "fulfilled");
    const rejected = attempts.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(BookingConflictError);

    expect(await prisma.booking.count({ where: { status: "CONFIRMED" } })).toBe(1);
  });

  it("does not block unrelated slots when a confirm race loser loses", async () => {
    // A parallel confirm for a non-overlapping slot (13:00) must succeed even though it
    // races in the same window as a confirm for 10:00.
    const a = await createBookingRequest(prisma, requestInput(START_A, "a@example.com"));
    const c = await createBookingRequest(prisma, requestInput(START_FREE, "c@example.com"));

    const [first, second] = await Promise.all([
      confirmBookingRequest(prisma, confirmInput(a.booking, START_A)),
      confirmBookingRequest(prisma, confirmInput(c.booking, START_FREE)),
    ]);

    expect(first.booking.startUtc).not.toEqual(second.booking.startUtc);
    expect(await prisma.booking.count({ where: { status: "CONFIRMED" } })).toBe(2);
  });
});

describe("decline / cancel", () => {
  it("declines a pending request and appends the reason to the customer note", async () => {
    const created = await createBookingRequest(prisma, requestInput(START_A));

    const declined = await declineBookingRequest(prisma, {
      bookingId: created.booking.id,
      reason: "Fully booked that day",
    });

    expect(declined.status).toBe("CANCELLED");
    expect(declined.note).toContain("[declined] Fully booked that day");
  });

  it("preserves an existing customer note when appending a decline reason", async () => {
    const created = await createBookingRequest(
      prisma,
      requestInput(START_A, "note@example.com", DAY_KEY, "doorbell is broken"),
    );

    const declined = await declineBookingRequest(prisma, {
      bookingId: created.booking.id,
      reason: "Please pick another day",
    });

    expect(declined.note).toContain("doorbell is broken");
    expect(declined.note).toContain("[declined] Please pick another day");
  });

  it("is idempotent on an already-cancelled booking", async () => {
    const created = await createBookingRequest(prisma, requestInput(START_A));

    const first = await declineBookingRequest(prisma, {
      bookingId: created.booking.id,
      reason: "No availability",
    });
    const second = await declineBookingRequest(prisma, {
      bookingId: created.booking.id,
      reason: "No availability",
    });

    expect(second.status).toBe("CANCELLED");
    // A re-decline must not duplicate the reason annotation.
    expect(second.note).toBe(first.note);
  });

  it("declining a confirmed booking frees the slot for another request", async () => {
    const first = await createBookingRequest(prisma, requestInput(START_A, "a@example.com"));
    await confirmBookingRequest(prisma, confirmInput(first.booking, START_A));
    await declineBookingRequest(prisma, { bookingId: first.booking.id });

    const second = await createBookingRequest(prisma, requestInput(START_A, "b@example.com"));
    const confirmed = await confirmBookingRequest(prisma, confirmInput(second.booking, START_A));
    expect(confirmed.booking.status).toBe("CONFIRMED");
  });

  it("rejects an unknown booking id", async () => {
    await expect(
      declineBookingRequest(prisma, { bookingId: "does-not-exist" }),
    ).rejects.toThrow(BookingNotFoundError);
  });
});

describe("DST correctness of the confirmed time", () => {
  // The confirm guard converts salon-local minutes to UTC; on the 2026 America/Toronto
  // boundary days the offset must still be right (the slot engine is gone, but the same
  // conversion now runs at confirm time).
  it("spring forward: confirming 09:00 local on 2026-03-08 lands at 13:00 UTC", async () => {
    const created = await createBookingRequest(
      prisma,
      requestInput(540, "dst-a@example.com", "2026-03-08"),
    );
    const confirmed = await confirmBookingRequest(
      prisma,
      confirmInput(created.booking, 540, "2026-03-08"),
    );

    expect(confirmed.booking.startUtc.toISOString()).toBe("2026-03-08T13:00:00.000Z");
    expect(confirmed.booking.endUtc.toISOString()).toBe("2026-03-08T14:00:00.000Z");
  });

  it("fall back: confirming 09:00 local on 2026-11-01 lands at 14:00 UTC", async () => {
    const created = await createBookingRequest(
      prisma,
      requestInput(540, "dst-b@example.com", "2026-11-01"),
    );
    const confirmed = await confirmBookingRequest(
      prisma,
      confirmInput(created.booking, 540, "2026-11-01"),
    );

    expect(confirmed.booking.startUtc.toISOString()).toBe("2026-11-01T14:00:00.000Z");
    expect(confirmed.booking.endUtc.toISOString()).toBe("2026-11-01T15:00:00.000Z");
  });

  it("keeps the same local wall time across both transitions while UTC shifts by an hour", async () => {
    const spring = await createBookingRequest(
      prisma,
      requestInput(540, "dst-c@example.com", "2026-03-08"),
    );
    const springC = await confirmBookingRequest(
      prisma,
      confirmInput(spring.booking, 540, "2026-03-08"),
    );
    const fall = await createBookingRequest(
      prisma,
      requestInput(540, "dst-d@example.com", "2026-11-01"),
    );
    const fallC = await confirmBookingRequest(prisma, confirmInput(fall.booking, 540, "2026-11-01"));

    // Same salon-local wall time on both transition days...
    expect(toLocalMinutes(springC.booking.startUtc)).toBe(540);
    expect(toLocalMinutes(fallC.booking.startUtc)).toBe(540);
    // ...one hour apart in UTC, exactly the DST offset change between the two days.
    expect(fallC.booking.startUtc.getUTCHours() - springC.booking.startUtc.getUTCHours()).toBe(1);
  });
});

describe("bookingsOverlap predicate", () => {
  const iv = (s: number, e: number) => ({ startUtc: new Date(s), endUtc: new Date(e) });

  it("treats touching intervals as non-overlapping", () => {
    expect(bookingsOverlap(iv(0, 60), iv(60, 120))).toBe(false);
  });
  it("detects partial overlap in both directions", () => {
    expect(bookingsOverlap(iv(0, 60), iv(30, 90))).toBe(true);
    expect(bookingsOverlap(iv(30, 90), iv(0, 60))).toBe(true);
  });
  it("detects containment", () => {
    expect(bookingsOverlap(iv(0, 120), iv(30, 60))).toBe(true);
  });
  it("treats identical intervals as overlapping", () => {
    expect(bookingsOverlap(iv(0, 60), iv(0, 60))).toBe(true);
  });
});
