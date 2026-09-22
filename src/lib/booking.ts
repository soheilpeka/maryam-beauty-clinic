/**
 * Booking request-and-approve logic.
 *
 * SCOPE (2026-09-22): the public site no longer computes available slots. A customer
 * SUBMITS A REQUEST (status PENDING) for a preferred date/time; availability is only
 * enforced later, when the salon confirms. This keeps the booking page dead simple while
 * still guaranteeing the salon never double-books.
 *
 * The overlap guard lives at confirm time and is race-safe by construction: the status
 * transition and the NOT EXISTS overlap check are expressed as ONE atomic UPDATE, so
 * SQLite holds the write lock across the check and the write. Two admins confirming two
 * overlapping requests can never both succeed. @@unique([staffId, startUtc]) is
 * deliberately absent from the schema (it cannot express overlap and would block
 * re-booking after a cancellation); the atomic conditional write is strictly stronger.
 *
 * Times are stored in UTC and rendered in the salon timezone (see src/lib/datetime.ts).
 */
import { Prisma } from "@prisma/client";
import type { PrismaClient, Booking, Service, Staff, Customer } from "@prisma/client";
import { localToUtc, parseDayKey } from "@/lib/datetime";
import { bookingRequestSchema } from "@/lib/validation";

export class BookingConflictError extends Error {
  constructor() {
    super("The requested time conflicts with another confirmed booking");
    this.name = "BookingConflictError";
  }
}
export class BookingNotFoundError extends Error {
  constructor() {
    super("Booking not found");
    this.name = "BookingNotFoundError";
  }
}
/** Thrown when a mutation is attempted on a booking whose status no longer allows it. */
export class BookingStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingStateError";
  }
}

export interface CreateRequestInput {
  serviceId: string;
  staffId: string;
  dayKey: string;
  startMinutes: number;
  customer: { name: string; email: string; phone: string; note?: string };
  locale: string;
  /** Skip the future-only check for tests */
  now?: Date;
}

export interface ConfirmRequestInput {
  bookingId: string;
  /** The staff who will perform the service (defaults to the booking's staff) */
  staffId?: string;
  dayKey: string;
  startMinutes: number;
  /** Skip the future-only check for tests */
  now?: Date;
}

export interface CreateRequestResult {
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
 * member. Half-open intervals mean back-to-back appointments (one ends exactly when the
 * other starts) are allowed. CANCELLED bookings never block, since they are not busy.
 * This predicate is the single source of truth for the admin confirm guard below.
 */
export function bookingsOverlap(
  a: { startUtc: Date; endUtc: Date },
  b: { startUtc: Date; endUtc: Date },
): boolean {
  return a.startUtc.getTime() < b.endUtc.getTime() && b.startUtc.getTime() < a.endUtc.getTime();
}

/**
 * Record a booking REQUEST. No availability check runs here: the customer asks for a
 * preferred time and the salon decides. The only constraints enforced are that the
 * requested time is within the bookable future and that the service/staff exist and are
 * active. The row is created as PENDING; endUtc is derived from the service duration.
 */
export async function createBookingRequest(
  prisma: PrismaClient,
  input: CreateRequestInput,
): Promise<CreateRequestResult> {
  const parsed = bookingRequestSchema.safeParse({
    serviceId: input.serviceId,
    staffId: input.staffId,
    dayKey: input.dayKey,
    startMinutes: input.startMinutes,
    customer: input.customer,
  });
  if (!parsed.success) {
    throw new TypeError("Invalid booking request input");
  }
  const data = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.active) throw new BookingNotFoundError();

  const staff = await prisma.staff.findUnique({ where: { id: data.staffId } });
  if (!staff || !staff.active) throw new BookingNotFoundError();

  const { year, month, day } = parseDayKey(data.dayKey);
  const startUtc = localToUtc(year, month, day, data.startMinutes);
  const endUtc = localToUtc(year, month, day, data.startMinutes + service.duration);
  const now = input.now ?? new Date();
  if (startUtc.getTime() <= now.getTime()) {
    throw new BookingStateError("The requested time must be in the future");
  }

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

    const booking = await tx.booking.create({
      data: {
        ref: generateBookingRef(),
        customerId: customer.id,
        serviceId: service.id,
        staffId: staff.id,
        startUtc,
        endUtc,
        status: "PENDING",
        priceTotal: service.price,
        note: data.customer.note || null,
      },
    });
    return { booking, customer, isNewCustomer };
  });

  return { booking: result.booking, service, staff, customer: result.customer, isNewCustomer: result.isNewCustomer };
}

/**
 * Confirm a booking request, optionally moving it to a different day/time first.
 *
 * Race safety: the status transition to CONFIRMED and the overlap check run as one atomic
 * UPDATE ... WHERE NOT EXISTS, so a concurrent confirm of a conflicting request cannot
 * slip between the check and the write. Returns `alreadyConfirmed: true` when the request
 * was confirmed concurrently with the same slot (idempotent), so a duplicate confirm by a
 * second admin is a clean no-op rather than an error. Throws BookingConflictError when the
 * (possibly adjusted) time overlaps another CONFIRMED booking for the same staff.
 */
export async function confirmBookingRequest(
  prisma: PrismaClient,
  input: ConfirmRequestInput,
): Promise<{ booking: Booking; alreadyConfirmed: boolean }> {
  const current = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { service: true },
  });
  if (!current) throw new BookingNotFoundError();
  if (current.status === "CANCELLED") {
    throw new BookingStateError("A cancelled request cannot be confirmed");
  }
  if (current.status === "CONFIRMED") {
    // Idempotent: another admin confirmed this request first.
    return { booking: current, alreadyConfirmed: true };
  }

  const service = current.service;
  const staffId = input.staffId ?? current.staffId;
  const { year, month, day } = parseDayKey(input.dayKey);
  const startUtc = localToUtc(year, month, day, input.startMinutes);
  const endUtc = localToUtc(year, month, day, input.startMinutes + service.duration);
  const now = input.now ?? new Date();
  if (startUtc.getTime() <= now.getTime()) {
    throw new BookingStateError("The requested time must be in the future");
  }

  // Atomic conditional UPDATE: transition PENDING -> CONFIRMED only when no other
  // CONFIRMED booking overlaps the same staff. The statement excludes the booking itself.
  const updated = await prisma.$executeRaw`
    UPDATE "Booking"
    SET "status" = 'CONFIRMED', "staffId" = ${staffId},
        "startUtc" = ${startUtc}, "endUtc" = ${endUtc}, "updatedAt" = ${new Date()}
    WHERE "id" = ${input.bookingId}
      AND "status" = 'PENDING'
      AND NOT EXISTS (
        SELECT 1 FROM "Booking" AS "existing"
        WHERE "existing"."staffId" = ${staffId}
          AND "existing"."id" <> ${input.bookingId}
          AND "existing"."status" = 'CONFIRMED'
          AND "existing"."startUtc" < ${endUtc}
          AND "existing"."endUtc" > ${startUtc}
      )
  `;

  if (updated === 0) {
    const after = await prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (after && after.status === "CONFIRMED") {
      // A concurrent confirm won this request; treat as success.
      return { booking: after, alreadyConfirmed: true };
    }
    throw new BookingConflictError();
  }

  return {
    booking: await prisma.booking.findUniqueOrThrow({ where: { id: input.bookingId } }),
    alreadyConfirmed: false,
  };
}

/**
 * Decline a request (or cancel a confirmed one) on the admin side. Status moves to
 * CANCELLED and the optional reason is appended to the customer-visible note. Idempotent
 * for an already-cancelled booking.
 */
export async function declineBookingRequest(
  prisma: PrismaClient,
  input: { bookingId: string; reason?: string },
): Promise<Booking> {
  const current = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!current) throw new BookingNotFoundError();
  if (current.status === "CANCELLED") return current;

  const reason = input.reason?.trim();
  const note = reason ? (current.note ? `${current.note}\n[declined] ${reason}` : `[declined] ${reason}`) : current.note;

  await prisma.booking.update({
    where: { id: input.bookingId },
    data: { status: "CANCELLED", note },
  });
  return prisma.booking.findUniqueOrThrow({ where: { id: input.bookingId } });
}
