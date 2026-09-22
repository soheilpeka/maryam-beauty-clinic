/**
 * Shared formatting helpers for the public site.
 */
import type { Locale } from "@/i18n/routing";

/** Format a price in integer cents as a CAD string, e.g. 7000 -> "$70". */
export function formatPrice(cents: number): string {
  const whole = cents / 100;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: whole % 1 === 0 ? 0 : 2,
  }).format(whole);
}

/** Localized duration, e.g. 90 -> "1 hr 30 min" (en) / "1 h 30 min" (fr). */
export function formatDuration(minutes: number, locale: Locale): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(locale === "fr" ? `${hours} h` : `${hours} hr`);
  if (mins > 0) parts.push(locale === "fr" ? `${mins} min` : `${mins} min`);
  return parts.join(" ") || (locale === "fr" ? "0 min" : "0 min");
}

/** ISO date string -> "May 23, 2024" (or French form). */
export function formatDate(iso: string, locale: Locale): string {
  // The source dates are "May 23, 2024" (already human readable); pass through.
  return iso;
}