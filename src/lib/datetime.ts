/**
 * Time helpers. Business logic works with "minutes from midnight in the salon timezone" plus
 * UTC instants, which keeps recurrence, DST, and storage simple and unambiguous.
 */
import { env } from "@/lib/env";

export const SALON_TIMEZONE = env.salonTimezone;

export const MINUTES_PER_DAY = 24 * 60;

export function getTimezone(): string {
  try {
    return Intl.DateTimeFormat("en-US", { timeZone: SALON_TIMEZONE, timeZoneName: "short" })
      .resolvedOptions().timeZone || SALON_TIMEZONE;
  } catch {
    return SALON_TIMEZONE;
  }
}

/** Format a UTC date for display in the salon timezone, e.g. "2026-09-21 14:30". */
export function formatInSalonTz(date: Date, locale = "en", options?: Intl.DateTimeFormatOptions): string {
  const o: Intl.DateTimeFormatOptions = {
    timeZone: SALON_TIMEZONE,
    ...options,
  };
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", o).format(date);
}

export function formatTime(date: Date, locale = "en"): string {
  return formatInSalonTz(date, locale, { hour: "2-digit", minute: "2-digit" });
}

export function formatLongDate(date: Date, locale = "en"): string {
  return formatInSalonTz(date, locale, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

/**
 * Return the "local day key" (YYYY-MM-DD in the salon timezone) for a UTC instant.
 * Computed by formatting in the salon timezone so DST and midnight shifts are handled.
 */
export function localDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SALON_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Convert a salon-local (year, month, day, minutes-from-midnight) into a UTC Date.
 * Uses the Intl API to find the timezone offset at that local wall time (DST-correct).
 */
export function localToUtc(year: number, month: number, day: number, minutes: number): Date {
  // Pretend the local wall time is UTC, read the real local clock at that instant, and correct
  // by the difference. This is DST-correct because the offset is read at the relevant instant.
  const naive = new Date(Date.UTC(year, month, day, 0, minutes, 0, 0));
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: SALON_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(naive);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  // % 24 guards against ICU emitting "24" for midnight in some builds.
  const wallUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
  return new Date(naive.getTime() + (naive.getTime() - wallUtc));
}
/** Parse a YYYY-MM-DD string into local date parts without timezone surprises. */
export function parseDayKey(dayKey: string): { year: number; month: number; day: number } {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid day key: ${dayKey}`);
  return { year: y, month: m - 1, day: d };
}

/** Add days to a Date. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Difference in whole days (a -> b), based on UTC midnight. */
export function dayDiff(a: Date, b: Date): number {
  const ms = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) -
    Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/** Format a price in cents as CAD currency. */
export function formatPrice(cents: number, locale = "en"): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

/** Format a duration in minutes as a human string. */
export function formatDuration(minutes: number, locale = "en"): string {
  const msgs = {
    en: (h: number, m: number) => (h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`),
    fr: (h: number, m: number) => (h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`),
  } as const;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return msgs[locale === "fr" ? "fr" : "en"](h, m);
}

/** Convert a Date to HH:MM in salon local time (for API payloads). */
export function toLocalMinutes(date: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  const m = Number(parts.find((p) => p.type === "minute")?.value);
  return (h % 24) * 60 + m;
}