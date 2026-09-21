/** Formatting helpers shared by the booking UI. */

export function minutesToLabel(minutes: number, locale: string): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(locale === "fr" ? "fr-CA" : "en-CA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function labelForDay(dayKey: string, locale: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(
    locale === "fr" ? "fr-CA" : "en-CA",
    { weekday: "long", day: "numeric", month: "long" },
  );
}

export function dayKeyForDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Convert a validation key like "validation.name.min" into a translated message using the
 * "Validation" namespace. Falls back to the raw key if no translation is found.
 */
export function translateValidationKey(key: string, t: (k: string) => string): string {
  const parts = key.split(".").filter(Boolean);
  if (parts[0] === "validation") {
    try {
      return t(parts.slice(1).join("."));
    } catch {
      return key;
    }
  }
  return key;
}