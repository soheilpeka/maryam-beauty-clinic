/**
 * Browser-side helpers shared by every admin view. These talk to the session/CSRF API the
 * same way, so a mutation from any page is protected by the same token handling.
 */

/** The CSRF token lives in sessionStorage after sign-in; fall back to the session route. */
export async function getCsrfToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    const stored = window.sessionStorage.getItem("admin-csrf");
    if (stored) return stored;
  }
  try {
    const res = await fetch("/api/admin/session");
    if (!res.ok) return null;
    return ((await res.json()) as { csrfToken?: string }).csrfToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Sign the admin out: the server deletes the session row (so the cookie value stops
 * working even if it was leaked), the cached CSRF token is dropped, and the browser is
 * sent to the sign-in page.
 */
export async function signOutAdmin(locale: string): Promise<void> {
  try {
    const token = await getCsrfToken();
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: token ? { "x-admin-csrf": token } : {},
    });
  } catch {
    // Ignore: we navigate away regardless.
  }
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem("admin-csrf");
    window.location.href = `/${locale}/admin/login`;
  }
}
/** Minutes from midnight -> "HH:MM" for <input type="time">. */
export function minutesToInputValue(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:MM" -> minutes from midnight, or null when the value is not a real clock time. */
export function timeValueToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}