import { describe, it, expect } from "vitest";
import { localToUtc, localDayKey, toLocalMinutes, formatInSalonTz } from "@/lib/datetime";

describe("datetime helpers", () => {
  it("converts local wall time to UTC (standard time, UTC-5)", () => {
    // Winter: America/Toronto is UTC-5, so local 10:00 -> 15:00 UTC
    const d = localToUtc(2026, 0, 15, 10 * 60);
    expect(d.getUTCHours()).toBe(15);
    expect(d.getUTCMinutes()).toBe(0);
  });

  it("converts local wall time to UTC (daylight time, UTC-4)", () => {
    // Summer (DST): America/Toronto is UTC-4, so local 10:00 -> 14:00 UTC
    const d = localToUtc(2026, 6, 15, 10 * 60);
    expect(d.getUTCHours()).toBe(14);
  });

  it("round-trips through day key and local minutes", () => {
    const d = localToUtc(2026, 8, 21, 14 * 60 + 30);
    expect(localDayKey(d)).toBe("2026-09-21");
    expect(toLocalMinutes(d)).toBe(14 * 60 + 30);
  });

  it("handles midnight without shifting the day", () => {
    const d = localToUtc(2026, 8, 21, 0);
    expect(localDayKey(d)).toBe("2026-09-21");
    expect(toLocalMinutes(d)).toBe(0);
  });

  it("formats in the salon timezone", () => {
    const d = localToUtc(2026, 8, 21, 9 * 60 + 30);
    expect(formatInSalonTz(d, "en", { hour: "2-digit", minute: "2-digit", hour12: false })).toBe("09:30");
  });
});