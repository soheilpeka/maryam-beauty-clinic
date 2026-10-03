import "server-only";

/** Use the configured public origin behind a production reverse proxy.
 * Never trust client-controlled Host or forwarded headers for this decision.
 */
export function loginOriginAllowed(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const base = process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_BASE_URL
      : request.url;
    if (!base) return false;
    return origin === new URL(base).origin;
  } catch {
    return false;
  }
}
