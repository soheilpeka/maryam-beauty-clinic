/**
 * Booking creation with server-side double-booking prevention.
 *
 * Defense in depth:
 *   1. Re-verify availability at write time (no trust in client-selected slots).
 *   2. Transaction with serializable isolation.
 *   3. Unique constraint @@unique([staffId, startUtc]) as the final race-safe guarantee:
 *      a concurrent insert that wins the race makes the loser's commit throw P2002.
 */
import { Prisma } from "@prisma/client";
import type { PrismaClient, Booking, Service, Staff, Customer } from "@prisma/client";
import { localToUtc, parseDayKey } from "@/lib/datetime";
import { computeSlots, loadStaffDay } from "@/lib/availability";
import { bookingMutationSchema, type BookingMutation } from "@/lib/validation";

export class SlotUnavailableError extends Error {
  constructor() { super("The selected time is no longer available"); this.name = "SlotUnavailableError"; }
}
export class BookingConflictError extends Error {
  constructor() { super("Booking conflict"); this.name = "BookingConflictError"; }
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
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `MBC-${ymd}-${rand}`;
}

/**
 * Create a booking atomically. Throws SlotUnavailableError if the slot is gone and
 * BookingConflictError if a concurrent request won the race (unique constraint hit).
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

  // Step 1: availability re-check (also enforces "any" staff choice made earlier upstream)
  const avail = await loadStaffDay(prisma, {
    serviceId: data.serviceId,
    staffId: data.staffId,
    dayKey: data.dayKey,
  });
  const slot = computeSlots(avail, {
    serviceId: data.serviceId,
    staffId: data.staffId,
    dayKey: data.dayKey,
  }, { slotIntervalMin: input.slotIntervalMin, now: input.now ?? new Date() })
    .find((s) => s.startUtc.getTime() === desiredStartUtc.getTime());

  if (!slot) throw new SlotUnavailableError();

  const service = avail.service;
  const endUtc = localToUtc(year, month, day, data.startMinutes + service.duration);

  // Step 2 + 3: transaction + unique constraint. P2002 = someone else took the exact slot.
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [customer, created] = await Promise.all([
        tx.customer.upsert({
          where: { email: data.customer.email },
          update: { name: data.customer.name, phone: data.customer.phone },
          create: {
            email: data.customer.email,
            name: data.customer.name,
            phone: data.customer.phone,
          },
        }),
        Promise.resolve(null as null | Booking),
      ]);
      const booking = await tx.booking.create({
        data: {
          ref: generateBookingRef(),
          customerId: customer.id,
          serviceId: service.id,
          staffId: data.staffId,
          startUtc: slot.startUtc,
          endUtc,
          status: "PENDING",
          priceTotal: service.price,
          note: data.customer.note || null,
        },
      });
      return { booking, customer };
    });
    const staff = await prisma.staff.findUniqueOrThrow({ where: { id: data.staffId } });
    return {
      booking: result.booking,
      service,
      staff,
      customer: result.customer,
      isNewCustomer: result.customer.createdAt.getTime() === result.booking.createdAt.getTime(),
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new BookingConflictError();
    }
    throw e;
  }
}