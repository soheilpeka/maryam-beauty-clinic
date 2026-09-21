/**
 * Booking creation and rescheduling with server-side double-booking prevention.
 *
 * Defense in depth:
 *   1. Re-verify availability at write time (no trust in client-selected slots).
 *   2. Single $transaction with an atomic conditional write (see below).
 *
 * RACE SAFETY NOTE: @prisma/adapter-libsql starts transactions with
 * client.transaction("deferred"). A deferred SQLite transaction only acquires the
 * write lock at the first WRITE statement, so a "SELECT overlap check, then write"
 * inside one transaction still has a check/act gap two concurrent requests can both
 * slip through. We therefore express the overlap check and the write as ONE statement:
 *   - create:     INSERT ... SELECT ... WHERE NOT EXISTS (overlap subquery)
 *   - reschedule: UPDATE ... WHERE NOT EXISTS (overlap subquery)
 * SQLite holds the write lock for the whole statement, so the check and the write are
 * atomic and partial overlaps are rejected exactly like identical start times. The
 * overlap predicate is the same half-open interval used by computeSlots, so the DB
 * guard and the slot engine can never disagree.
 *
 * NOTE on @@unique([staffId, startUtc]): it is deliberately absent from the schema.
 * A plain unique index cannot express overlap at all (it only blocks identical start
 * times) and it would also block re-booking a slot after a cancellation, because the
 * index counts CANCELLED rows too. The atomic conditional write above is strictly
 * stronger, so the index was removed.
 */
import { Prisma } from "@prisma/client";
import type { PrismaClient, Booking, Service, Staff, Customer } from "@prisma/client";
import { localToUtc, parseDayKey } from "@/lib/datetime";
import { computeSlots, loadStaffDay } from "@/lib/availability";
import { bookingMutationSchema, rescheduleSchema } from "@/lib/validation";

export class SlotUnavailableError extends Error {
  constructor() {
    super("The selected time is no longer available");
    this.name = "SlotUnavailableError";
  }
}
export class BookingConflictError extends Error {
  constructor() {
    super("Booking conflict");
    this.name = "BookingConflictError";
  }
}
export class BookingNotFoundError extends Error {
  constructor() {
    super("Booking not found");
    this.name = "BookingNotFoundError";
  }
}

export interface CreateBookingInput {
  serviceId: string;
  staffId: string;
  dayKey: string;
  startMinutes: number;
  customer: { name: string; email: string; phone: string; note?: string };
  locale: string;
  /** Slot interval from business settings, used for re-validation */
  slotIntervalMin: number;
  /** Skip the future-only check for tests */
  now?: Date;
}

export interface RescheduleInput {
  bookingId: string;
  /** The staff member of the booking; the new slot must not overlap their other work */
  staffId: string;
  dayKey: string;
  startMinutes: number;
  slotIntervalMin: number;
  /** Skip the future-only check for tests */
  now?: Date;
}

export interface CreateBookingResult {
  booking: Booking;
  service: Service;
  staff: Staff;
  customer: Customer;
  isNewCustomer: boolean;
}

function generateBookingRef(): string {
  // MBC-YYYYMMDD-XXXXX: unique enough for the public reference shown to customers
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MBC-${ymd}-${rand}`;
}

/**
 * Two bookings conflict when their [start, end) intervals overlap for the same staff
 * member. Half-open intervals mean back-to-back appointments (one ends exactly when
 * the other starts) are allowed, matching how computeSlots fits slots.
 * CANCELLED bookings never block, since they are not counted as busy.
 */
export function bookingsOverlap(
  a: { startUtc: Date; endUtc: Date },
  b: { startUtc: Date; endUtc: Date },
): boolean {
  return a.startUtc.getTime() < b.endUtc.getTime() && b.startUtc.getTime() < a.endUtc.getTime();
}

/**
 * Create a booking atomically. Throws SlotUnavailableError if the slot is gone and
 * BookingConflictError if a concurrent request won the race (overlap).
 */
export async function createBooking(
  prisma: PrismaClient,
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const parsed = bookingMutationSchema.safeParse({
    serviceId: input.serviceId,
    staffId: input.staffId,
    dayKey: input.dayKey,
    startMinutes: input.startMinutes,
    customer: input.customer,
  });
  if (!parsed.success) {
    throw new TypeError("Invalid booking input");
  }
  const data = parsed.data;

  const { year, month, day } = parseDayKey(data.dayKey);
  const desiredStartUtc = localToUtc(year, month, day, data.startMinutes);

  // Step 1: availability re-check (also enforces "any" staff choice made earlier upstream).
  // This is the friendly/error path for normal flows; the atomic insert below is the
  // authoritative race-safe guard for the moment of truth.
  const avail = await loadStaffDay(prisma, {
    serviceId: data.serviceId,
    staffId: data.staffId,
    dayKey: data.dayKey,
  });
  const slot = computeSlots(
    avail,
    { serviceId: data.serviceId, staffId: data.staffId, dayKey: data.dayKey },
    { slotIntervalMin: input.slotIntervalMin, now: input.now ?? new Date() },
  ).find((s) => s.startUtc.getTime() === desiredStartUtc.getTime());

  if (!slot) throw new SlotUnavailableError();

  const service = avail.service;
  const endUtc = localToUtc(year, month, day, data.startMinutes + service.duration);

  // Step 2: transaction with an atomic conditional insert. The NOT EXISTS subquery and
  // the INSERT execute as a single statement under SQLite's write lock, so a concurrent
  // request can never interleave between the overlap check and the write. When the row
  // is not inserted (overlap), the affected count is 0 -> BookingConflictError, which
  // also rolls back the customer upsert in the same transaction.
  const result = await prisma.$transaction(async (tx) => {
    const existingCustomer = await tx.customer.findUnique({
      where: { email: data.customer.email },
      select: { id: true },
    });
    const isNewCustomer = existingCustomer === null;

    const customer = await tx.customer.upsert({
      where: { email: data.customer.email },
      update: { name: data.customer.name, phone: data.customer.phone },
      create: {
        email: data.customer.email,
        name: data.customer.name,
        phone: data.customer.phone,
      },
    });

    const bookingId = `bk-${generateBookingRef()}-${Math.random().toString(36).slice(2, 8)}`;
    const ref = generateBookingRef();
    const now = new Date();

    // INSERT ... SELECT ... WHERE NOT EXISTS: the overlap predicate below is the same
    // half-open interval used by computeSlots (and bookingsOverlap above), so the slot
    // engine and the database guard can never diverge.
    const inserted = await tx.$executeRaw`
      INSERT INTO "Booking" (
        "id", "ref", "customerId", "serviceId", "staffId",
        "startUtc", "endUtc", "status", "priceTotal", "note", "createdAt", "updatedAt"
      )
      SELECT
        ${bookingId}, ${ref}, ${customer.id}, ${service.id}, ${data.staffId},
        ${slot.startUtc}, ${endUtc}, 'PENDING', ${service.price}, ${data.customer.note || null},
        ${now}, ${now}
      WHERE NOT EXISTS (
        SELECT 1 FROM "Booking" AS "existing"
        WHERE "existing"."staffId" = ${data.staffId}
          AND "existing"."status" <> 'CANCELLED'
          AND "existing"."startUtc" < ${endUtc}
          AND "existing"."endUtc" > ${slot.startUtc}
      )
    `;

    if (inserted === 0) {
      throw new BookingConflictError();
    }

    const booking = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    return { booking, customer, isNewCustomer };
  });

  const staff = await prisma.staff.findUniqueOrThrow({ where: { id: data.staffId } });
  return {
    booking: result.booking,
    service,
    staff,
    customer: result.customer,
    isNewCustomer: result.isNewCustomer,
  };
}

/**
 * Move an existing booking to a new slot. Same atomic-overlap guarantee as
 * createBooking: the UPDATE and its NOT EXISTS overlap check run as one statement, and
 * the booking's own row is excluded so it never blocks itself. Throws
 * SlotUnavailableError if the new slot is not bookable, BookingConflictError if a
 * concurrent request took it, and BookingNotFoundError if the booking is gone.
 */
export async function rescheduleBooking(
  prisma: PrismaClient,
  input: RescheduleInput,
): Promise<Booking> {
  const parsed = rescheduleSchema.safeParse({
    dayKey: input.dayKey,
    startMinutes: input.startMinutes,
  });
  if (!parsed.success) {
    throw new TypeError("Invalid reschedule input");
  }
  const data = parsed.data;

  const current = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { service: true },
  });
  if (!current || current.status === "CANCELLED") {
    throw new BookingNotFoundError();
  }

  const { year, month, day } = parseDayKey(data.dayKey);
  const desiredStartUtc = localToUtc(year, month, day, data.startMinutes);

  // The new slot must be genuinely available for this staff + service, just like a new
  // booking. computeSlots treats the booking's own current slot as busy, so a move to a
  // free slot is allowed while a move onto another booking is rejected; the atomic
  // UPDATE below excludes the booking itself explicitly to stay race-safe.
  const avail = await loadStaffDay(prisma, {
    serviceId: current.serviceId,
    staffId: input.staffId,
    dayKey: data.dayKey,
  });
  const slot = computeSlots(
    avail,
    { serviceId: current.serviceId, staffId: input.staffId, dayKey: data.dayKey },
    { slotIntervalMin: input.slotIntervalMin, now: input.now ?? new Date() },
  ).find((s) => s.startUtc.getTime() === desiredStartUtc.getTime());

  if (!slot) throw new SlotUnavailableError();

  const endUtc = localToUtc(year, month, day, data.startMinutes + current.service.duration);

  // Atomic conditional UPDATE: the NOT EXISTS subquery excludes the booking itself and
  // any overlapping non-cancelled booking for the same staff. Affected count 0 means a
  // concurrent request won the slot -> BookingConflictError.
  const updated = await prisma.$executeRaw`
    UPDATE "Booking"
    SET "startUtc" = ${slot.startUtc}, "endUtc" = ${endUtc}, "updatedAt" = ${new Date()}
    WHERE "id" = ${input.bookingId}
      AND "status" <> 'CANCELLED'
      AND NOT EXISTS (
        SELECT 1 FROM "Booking" AS "existing"
        WHERE "existing"."staffId" = ${input.staffId}
          AND "existing"."id" <> ${input.bookingId}
          AND "existing"."status" <> 'CANCELLED'
          AND "existing"."startUtc" < ${endUtc}
          AND "existing"."endUtc" > ${slot.startUtc}
      )
  `;

  if (updated === 0) {
    // Either the booking was cancelled concurrently, or the slot was taken.
    const stillThere = await prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!stillThere || stillThere.status === "CANCELLED") throw new BookingNotFoundError();
    throw new BookingConflictError();
  }

  return prisma.booking.findUniqueOrThrow({ where: { id: input.bookingId } });
}
