/**
 * Slot availability engine.
 *
 * Domain model: working hours and breaks are stored as "minutes from midnight" in the salon's
 * local timezone. Bookings are stored as UTC instants. Slot generation converts the local working
 * day to UTC via localToUtc (DST-correct), then removes existing bookings and breaks.
 */
import type { PrismaClient, StaffSchedule, Break, Booking, DayOff, Service } from "@prisma/client";
import { localToUtc, parseDayKey, toLocalMinutes, dayDiff } from "@/lib/datetime";
import { MINUTES_PER_DAY } from "@/lib/datetime";

export interface SlotQuery {
  serviceId: string;
  staffId: string;
  dayKey: string;
}

export interface AvailableSlot {
  /** Minutes from midnight, salon local time */
  startMinutes: number;
  startUtc: Date;
  endUtc: Date;
  staffId: string;
}

interface StaffAvailabilityData {
  schedules: Array<StaffSchedule & { breaks: Break[] }>;
  daysOff: DayOff[];
  bookings: Booking[];
  service: Service;
}

/** Local-minute intervals that are unavailable on the given day for this staff member. */
function unavailableLocalIntervals(data: StaffAvailabilityData, dayKey: string): Array<[number, number]> {
  const { year, month, day } = parseDayKey(dayKey);
  const intervals: Array<[number, number]> = [];

  // Day-off windows (full day when start/end are absent)
  for (const off of data.daysOff) {
    const offKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: process.env.SALON_TIMEZONE ?? "America/Toronto",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(off.date);
    const get = (t: string) => offKey.find((p) => p.type === t)?.value;
    if (`${get("year")}-${get("month")}-${get("day")}` === dayKey) {
      intervals.push([off.startMin ?? 0, off.endMin ?? MINUTES_PER_DAY]);
    }
  }
  return intervals;
}

/**
 * Compute available slots for one service + staff member on one day.
 * Returns slots in salon-local minutes from midnight, sorted ascending.
 */
export function computeSlots(
  data: StaffAvailabilityData,
  query: SlotQuery,
  options: { slotIntervalMin: number; now: Date },
): AvailableSlot[] {
  const { year, month, day } = parseDayKey(query.dayKey);
  const jsDay = new Date(Date.UTC(year, month, day)).getUTCDay();
  const { service, schedules, bookings, slotIntervalMin, now } = { ...data, ...options } as StaffAvailabilityData & { slotIntervalMin: number; now: Date };

  const schedule = schedules.find((s) => s.dayOfWeek === jsDay);
  if (!schedule) return [];

  const totalMin = service.duration + service.bufferMin;
  const offIntervals = unavailableLocalIntervals(data, query.dayKey);
  const breakIntervals: Array<[number, number]> = schedule.breaks.map((b) => [b.startTime, b.endTime]);

  // Existing bookings as local-minute intervals (bookings may span midnight in other zones,
  // so convert each booking boundary that falls inside this local day).
  const bookingIntervals: Array<[number, number]> = bookings
    .filter((b) => b.status !== "CANCELLED")
    .map((b) => {
      const s = toLocalMinutes(b.startUtc);
      const e = toLocalMinutes(b.endUtc);
      // Handle wrap-around (e.g. booking ending after local midnight)
      return [s, e <= s ? MINUTES_PER_DAY : e] as [number, number];
    });

  const busy = [...offIntervals, ...breakIntervals, ...bookingIntervals];

  const slots: AvailableSlot[] = [];
  for (let t = schedule.startTime; t + totalMin <= schedule.endTime; t += slotIntervalMin) {
    const slotEnd = t + totalMin;
    // Slot must not overlap any busy interval.
    const clash = busy.some(([bs, be]) => t < be && bs < slotEnd);
    if (clash) continue;
    // Slots must be in the future (lead time applies to today).
    const startUtc = localToUtc(year, month, day, t);
    if (startUtc.getTime() <= now.getTime()) continue;
    slots.push({
      startMinutes: t,
      startUtc,
      endUtc: localToUtc(year, month, day, t + service.duration),
      staffId: query.staffId,
    });
  }
  return slots;
}

/** Load everything needed to compute slots for one staff member on one day. */
export async function loadStaffDay(
  prisma: PrismaClient,
  query: SlotQuery,
): Promise<StaffAvailabilityData> {
  const service = await prisma.service.findUnique({ where: { id: query.serviceId } });
  if (!service || !service.active) throw new ServiceNotFoundError(query.serviceId);

  const staff = await prisma.staff.findUnique({
    where: { id: query.staffId },
    include: {
      schedules: { include: { breaks: true } },
      daysOff: true,
      services: { where: { serviceId: query.serviceId } },
    },
  });
  if (!staff || !staff.active) throw new StaffNotFoundError(query.staffId);
  if (staff.services.length === 0) throw new StaffNotQualifiedError(query.staffId, query.serviceId);

  const { year, month, day } = parseDayKey(query.dayKey);
  const dayStart = localToUtc(year, month, day, 0);
  const dayEnd = localToUtc(year, month, day, MINUTES_PER_DAY - 1);

  const bookings = await prisma.booking.findMany({
    where: {
      staffId: staff.id,
      status: { not: "CANCELLED" },
      AND: [{ startUtc: { lt: dayEnd } }, { endUtc: { gt: dayStart } }],
    },
  });

  return { schedules: staff.schedules, daysOff: staff.daysOff, bookings, service };
}

export class ServiceNotFoundError extends Error {
  constructor(id: string) { super(`Service not found: ${id}`); this.name = "ServiceNotFoundError"; }
}
export class StaffNotFoundError extends Error {
  constructor(id: string) { super(`Staff not found: ${id}`); this.name = "StaffNotFoundError"; }
}
export class StaffNotQualifiedError extends Error {
  constructor(staffId: string, serviceId: string) {
    super(`Staff ${staffId} does not perform service ${serviceId}`);
    this.name = "StaffNotQualifiedError";
  }
}

/** Days (as day keys) within the booking window that have any working schedule for the staff. */
export function workingDayKeys(params: {
  schedules: StaffSchedule[];
  daysOff: DayOff[];
  from: Date;
  windowDays: number;
}): string[] {
  const { schedules, from, windowDays } = params;
  const out: string[] = [];
  const workedDays = new Set(schedules.map((s) => s.dayOfWeek));
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + i);
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: process.env.SALON_TIMEZONE ?? "America/Toronto",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d).replace(/\//g, "-");
    const jsDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).getUTCDay();
    if (workedDays.has(jsDay)) out.push(key);
  }
  return out;
}