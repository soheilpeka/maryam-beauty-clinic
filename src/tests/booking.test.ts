import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createBooking,
  rescheduleBooking,
  BookingConflictError,
  BookingNotFoundError,
  SlotUnavailableError,
  bookingsOverlap,
} from "@/lib/booking";
import { useTestDb, seedTestSalon, resetBookings, closeTestDb, FAR_FUTURE_NOW } from "@/tests/db";
import { localToUtc } from "@/lib/datetime";
import type { PrismaClient } from "@prisma/client";

// Tuesday 2026-03-10 (staff works Tue-Sat). Slots are computed in salon-local minutes.
const DAY_KEY = "2026-03-10";
// 10:00 local, 30-min grid for a 60-min service.
const START_A = 10 * 60; // 10:00-11:00
const START_B = START_A + 30; // 10:30-11:30 (partial overlap with A)
const START_BACK_TO_BACK = START_A + 60; // 11:00-12:00 (touches A exactly, allowed)

let prisma: PrismaClient;
let serviceId: string;
let staffId: string;

function baseInput(startMinutes: number, email = "guest@example.com") {
  return {
    serviceId,
    staffId,
    dayKey: DAY_KEY,
    startMinutes,
    customer: { name: "Test Guest", email, phone: "+1 555 0100" },
    locale: "en" as const,
    slotIntervalMin: 30,
    now: FAR_FUTURE_NOW,
  };
}

// Shared setup for every test in this file: a clean, deterministic salon and a reset
// booking table before each case (hooks are file-level so both describes stay isolated).
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

/** A booking rejected at any layer is still a rejected booking. */
async function expectRejected(input: ReturnType<typeof baseInput>) {
  await expect(createBooking(prisma, input)).rejects.toThrow(
    expect.objectContaining({
      name: expect.stringMatching(/^(SlotUnavailableError|BookingConflictError)$/),
    }),
  );
}

describe("double-booking prevention", () => {
  it("rejects an identical start time for the same staff", async () => {
    await createBooking(prisma, baseInput(START_A));

    await expectRejected(baseInput(START_A));

    const count = await prisma.booking.count();
    expect(count).toBe(1);
  });

  it("rejects a partial overlap (10:00-11:00 vs 10:30-11:30)", async () => {
    await createBooking(prisma, baseInput(START_A));

    await expectRejected(baseInput(START_B));

    const bookings = await prisma.booking.findMany({ orderBy: { startUtc: "asc" } });
    expect(bookings).toHaveLength(1);
    expect(bookings[0].startUtc.toISOString()).toBe(
      localToUtc(2026, 2, 10, START_A).toISOString(),
    );
  });

  it("allows back-to-back bookings (11:00 starts exactly when 10:00 ends)", async () => {
    await createBooking(prisma, baseInput(START_A));

    const second = await createBooking(prisma, baseInput(START_BACK_TO_BACK));

    expect(second.booking.startUtc.toISOString()).toBe(
      localToUtc(2026, 2, 10, START_BACK_TO_BACK).toISOString(),
    );
    const count = await prisma.booking.count();
    expect(count).toBe(2);
  });

  it("lets two concurrent requests race for one slot: exactly one wins", async () => {
    // Two in-flight bookings for the same slot, started together. The atomic conditional
    // INSERT must serialize them: one succeeds, the other is rejected.
    const attempts = await Promise.allSettled([
      createBooking(prisma, baseInput(START_A, "racer1@example.com")),
      createBooking(prisma, baseInput(START_A, "racer2@example.com")),
    ]);

    const fulfilled = attempts.filter((r) => r.status === "fulfilled");
    const rejected = attempts.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.name).toMatch(
      /^(SlotUnavailableError|BookingConflictError)$/,
    );

    const bookings = await prisma.booking.findMany();
    expect(bookings).toHaveLength(1);
  });

  it("lets concurrent requests for overlapping slots through only one", async () => {
    // Partial overlap under concurrency: 10:00-11:00 vs 10:30-11:30. Only the overlap
    // guard (not any (staffId,startUtc) uniqueness) can block this, since the start
    // times differ.
    const attempts = await Promise.allSettled([
      createBooking(prisma, baseInput(START_A, "ov1@example.com")),
      createBooking(prisma, baseInput(START_B, "ov2@example.com")),
    ]);

    const fulfilled = attempts.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);
    expect(await prisma.booking.count()).toBe(1);
  });

  it("does not block unrelated slots when a race loser loses", async () => {
    // A parallel attempt for a non-overlapping slot (13:00) must succeed even though it
    // races in the same window as a booking for 10:00.
    const [first, second] = await Promise.all([
      createBooking(prisma, baseInput(START_A)),
      createBooking(prisma, baseInput(13 * 60)),
    ]);

    expect(first.booking.startUtc).not.toEqual(second.booking.startUtc);
    expect(await prisma.booking.count()).toBe(2);
  });

  it("ignores CANCELLED bookings when checking overlap", async () => {
    const created = await createBooking(prisma, baseInput(START_A));
    await prisma.booking.update({ where: { id: created.booking.id }, data: { status: "CANCELLED" } });

    // Re-booking the same slot is allowed because the cancelled one no longer blocks.
    const rebooked = await createBooking(prisma, baseInput(START_A));
    expect(rebooked.booking.status).toBe("PENDING");

    const active = await prisma.booking.findMany({ where: { status: "PENDING" } });
    expect(active).toHaveLength(1);
  });
});

describe("rescheduling", () => {
  it("moves a booking to a free slot and frees the old one", async () => {
    const created = await createBooking(prisma, baseInput(START_A));

    const moved = await rescheduleBooking(prisma, {
      bookingId: created.booking.id,
      staffId,
      dayKey: DAY_KEY,
      startMinutes: 13 * 60,
      slotIntervalMin: 30,
      now: FAR_FUTURE_NOW,
    });

    expect(moved.startUtc.toISOString()).toBe(localToUtc(2026, 2, 10, 13 * 60).toISOString());
    // The original 10:00 slot is free again.
    const rebooked = await createBooking(prisma, baseInput(START_A, "another@example.com"));
    expect(rebooked.booking.startUtc.toISOString()).toBe(
      localToUtc(2026, 2, 10, START_A).toISOString(),
    );
    expect(await prisma.booking.count()).toBe(2);
  });

  it("refuses to reschedule onto an overlapping booking", async () => {
    const first = await createBooking(prisma, baseInput(START_A, "a@example.com"));
    const second = await createBooking(prisma, baseInput(13 * 60, "b@example.com"));

    // Moving the second booking onto 10:30 (inside first's 10:00-11:00) must fail.
    await expect(
      rescheduleBooking(prisma, {
        bookingId: second.booking.id,
        staffId,
        dayKey: DAY_KEY,
        startMinutes: START_B,
        slotIntervalMin: 30,
        now: FAR_FUTURE_NOW,
      }),
    ).rejects.toThrow(SlotUnavailableError);

    // Unchanged.
    const still = await prisma.booking.findUniqueOrThrow({ where: { id: second.booking.id } });
    expect(still.startUtc.toISOString()).toBe(second.booking.startUtc.toISOString());
    expect(first.booking.startUtc).toBeDefined();
  });

  it("reschedules back-to-back with another booking", async () => {
    const first = await createBooking(prisma, baseInput(START_A, "a@example.com"));
    const second = await createBooking(prisma, baseInput(START_BACK_TO_BACK, "b@example.com"));

    // Moving the second booking onto 13:00 is free; the first still owns 10:00-11:00.
    const moved = await rescheduleBooking(prisma, {
      bookingId: second.booking.id,
      staffId,
      dayKey: DAY_KEY,
      startMinutes: 13 * 60,
      slotIntervalMin: 30,
      now: FAR_FUTURE_NOW,
    });
    expect(moved.startUtc.toISOString()).toBe(localToUtc(2026, 2, 10, 13 * 60).toISOString());
    expect(first.booking.id).toBeDefined();
  });

  it("rejects rescheduling a cancelled booking", async () => {
    const created = await createBooking(prisma, baseInput(START_A));
    await prisma.booking.update({
      where: { id: created.booking.id },
      data: { status: "CANCELLED" },
    });

    await expect(
      rescheduleBooking(prisma, {
        bookingId: created.booking.id,
        staffId,
        dayKey: DAY_KEY,
        startMinutes: 13 * 60,
        slotIntervalMin: 30,
        now: FAR_FUTURE_NOW,
      }),
    ).rejects.toThrow(BookingNotFoundError);
  });

  it("lets concurrent reschedules onto the same new slot resolve to one winner", async () => {
    const a = await createBooking(prisma, baseInput(START_A, "a@example.com"));
    const b = await createBooking(prisma, baseInput(13 * 60, "b@example.com"));

    // Both race onto 15:00; only one can land there.
    const attempts = await Promise.allSettled([
      rescheduleBooking(prisma, { bookingId: a.booking.id, staffId, dayKey: DAY_KEY, startMinutes: 15 * 60, slotIntervalMin: 30, now: FAR_FUTURE_NOW }),
      rescheduleBooking(prisma, { bookingId: b.booking.id, staffId, dayKey: DAY_KEY, startMinutes: 15 * 60, slotIntervalMin: 30, now: FAR_FUTURE_NOW }),
    ]);

    const ok = attempts.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);

    const at15 = await prisma.booking.findMany({
      where: { startUtc: localToUtc(2026, 2, 10, 15 * 60) },
    });
    expect(at15).toHaveLength(1);
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
