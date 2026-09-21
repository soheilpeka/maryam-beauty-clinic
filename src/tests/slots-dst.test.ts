import { describe, it, expect } from "vitest";
import { computeSlots } from "@/lib/availability";
import { localToUtc } from "@/lib/datetime";
import type { Service, StaffSchedule, Break, Booking, DayOff } from "@prisma/client";

/**
 * Slot calculation across the two 2026 DST transitions in America/Toronto:
 *   - Sun 2026-03-08 02:00 local -> 03:00 (spring forward, UTC-5 -> UTC-4)
 *   - Sun 2026-11-01 02:00 local -> 01:00 (fall back,   UTC-4 -> UTC-5)
 *
 * The engine stores bookings as UTC instants but generates slots from salon-local
 * minutes-from-midnight. These tests prove the conversion is DST-correct on the
 * boundary days themselves (not just winter/summer, which datetime.test.ts covers).
 */

const SERVICE: Service = {
  id: "svc", slug: "svc", name: "S", description: null, price: 10000, duration: 60,
  bufferMin: 0, category: "General", active: true, createdAt: new Date(0), order: 1,
};

function scheduleFor(dayKey: string, start = 9 * 60, end = 17 * 60): StaffSchedule & { breaks: Break[] } {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return {
    id: `sch-${dayKey}`, staffId: "staff", dayOfWeek, startTime: start, endTime: end,
    breaks: [],
  };
}

function slotTimes(dayKey: string, bookings: Booking[] = [], now = new Date("2026-01-01T00:00:00Z")) {
  return computeSlots(
    { schedules: [scheduleFor(dayKey)], daysOff: [], bookings, service: SERVICE },
    { serviceId: SERVICE.id, staffId: "staff", dayKey },
    { slotIntervalMin: 60, now },
  );
}

describe("slot calculation on DST transition days", () => {
  it("spring forward: 2026-03-08 local 09:00 maps to 13:00 UTC (UTC-4)", () => {
    const slots = slotTimes("2026-03-08");
    expect(slots.length).toBeGreaterThan(0);
    const first = slots[0];
    expect(first.startMinutes).toBe(540); // 09:00 local
    expect(first.startUtc.toISOString()).toBe("2026-03-08T13:00:00.000Z");
  });

  it("fall back: 2026-11-01 local 09:00 maps to 14:00 UTC (UTC-5)", () => {
    const slots = slotTimes("2026-11-01");
    expect(slots.length).toBeGreaterThan(0);
    const first = slots[0];
    expect(first.startMinutes).toBe(540);
    expect(first.startUtc.toISOString()).toBe("2026-11-01T14:00:00.000Z");
  });

  it("keeps the same local schedule on both DST days while UTC shifts", () => {
    // Same 09:00-17:00 local window on both transition days; only the UTC offset differs.
    const spring = slotTimes("2026-03-08").map((s) => s.startMinutes);
    const fall = slotTimes("2026-11-01").map((s) => s.startMinutes);
    expect(spring).toEqual(fall);
    expect(spring).toEqual([540, 600, 660, 720, 780, 840, 900, 960]);

    // ...but the same local wall time lands one hour apart in UTC (13:00Z vs 14:00Z),
    // which is exactly the DST offset change between the two transition days.
    const springUtcHour = slotTimes("2026-03-08")[0].startUtc.getUTCHours();
    const fallUtcHour = slotTimes("2026-11-01")[0].startUtc.getUTCHours();
    expect(springUtcHour).toBe(13);
    expect(fallUtcHour).toBe(14);
    expect(fallUtcHour - springUtcHour).toBe(1);
  });

  it("excludes a booked slot on a spring-forward day without shifting the rest", () => {
    // A booking at local 10:00-11:00 on 2026-03-08 (14:00-15:00 UTC) must remove exactly
    // that slot and leave the local-minute grid otherwise intact.
    const bookings: Booking[] = [{
      id: "b1", ref: "R1", customerId: "c", serviceId: SERVICE.id, staffId: "staff",
      startUtc: localToUtc(2026, 2, 8, 600), endUtc: localToUtc(2026, 2, 8, 660),
      status: "PENDING", priceTotal: 10000, note: null, updatedAt: new Date(0), createdAt: new Date(0),
    }];
    const slots = slotTimes("2026-03-08", bookings).map((s) => s.startMinutes);
    expect(slots).not.toContain(600);
    expect(slots).toContain(540);
    expect(slots).toContain(660);
  });

  it("blocks a slot overlapping a booking on a fall-back day", () => {
    // 60-min service with a booking at local 11:00-12:00 on 2026-11-01: the 11:00 slot is
    // gone, neighbours remain.
    const bookings: Booking[] = [{
      id: "b2", ref: "R2", customerId: "c", serviceId: SERVICE.id, staffId: "staff",
      startUtc: localToUtc(2026, 10, 1, 660), endUtc: localToUtc(2026, 10, 1, 720),
      status: "CONFIRMED", priceTotal: 10000, note: null, updatedAt: new Date(0), createdAt: new Date(0),
    }];
    const slots = slotTimes("2026-11-01", bookings).map((s) => s.startMinutes);
    expect(slots).not.toContain(660);
    expect(slots).toContain(600);
    expect(slots).toContain(720);
  });

  it("respects days off on a DST day", () => {
    const [y, m, d] = "2026-03-08".split("-").map(Number);
    const dayOff: DayOff = {
      id: "off", staffId: "staff",
      date: localToUtc(y, m - 1, d, 0), startMin: null, endMin: null, note: null,
    };
    const slots = computeSlots(
      { schedules: [scheduleFor("2026-03-08")], daysOff: [dayOff], bookings: [], service: SERVICE },
      { serviceId: SERVICE.id, staffId: "staff", dayKey: "2026-03-08" },
      { slotIntervalMin: 60, now: new Date("2026-01-01T00:00:00Z") },
    );
    expect(slots).toHaveLength(0);
  });
});



