/**
 * Server-side authorization for the admin area.
 *
 * Every /admin page and every /api/admin route must call one of these; the UI hiding links is
 * not protection. Verification looks the session up by its token hash in the DB, so an
 * expired or logged-out session fails here even if the cookie value is still present.
 */
import "server-only";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession, sessionCsrfToken, sessionCsrfValid } from "@/lib/sessions";
import type { AdminSessionInfo } from "@/lib/sessions";
import { env } from "@/lib/env";

export const ADMIN_TOKEN_HEADER = "x-admin-csrf";

/** Read the raw session token from a request cookie. */
export function tokenFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(env.sessionCookieName)?.value;
}

/**
 * Discriminated by `ok`: when ok is true the session is present and no response is needed;
 * when ok is false there is a ready-made error response (and the session, if any, is passed
 * along for logging). The union lets callers narrow the session with a simple ok check.
 */
export type AuthorizeResult =
  | { ok: true; session: AdminSessionInfo; response: null }
  | { ok: false; session: AdminSessionInfo | null; response: NextResponse };

/**
 * Require a valid admin session for an API request. Returns a 401 response (JSON) when there
 * is no session, so callers can return it directly.
 */
export async function authorizeAdmin(request: NextRequest): Promise<AuthorizeResult> {
  const session = await getSession(tokenFromRequest(request));
  if (!session) {
    return {
      ok: false,
      session: null,
      response: NextResponse.json(
        { error: "UNAUTHORIZED", message: "Sign in required." },
        { status: 401 },
      ),
    };
  }
  return { ok: true, session, response: null };
}

/**
 * Require a valid admin session AND a matching CSRF token, for state-changing API requests
 * (POST/PATCH/DELETE). Responds 401 without a session, 403 when the CSRF token is missing or
 * wrong.
 */
export async function authorizeAdminMutation(request: NextRequest): Promise<AuthorizeResult> {
  const base = await authorizeAdmin(request);
  if (!base.ok) return base;
  if (!sessionCsrfValid(base.session, request.headers.get(ADMIN_TOKEN_HEADER))) {
    return {
      ok: false,
      session: base.session,
      response: NextResponse.json(
        { error: "FORBIDDEN", message: "Invalid or missing CSRF token." },
        { status: 403 },
      ),
    };
  }
  return base;
}

/** The CSRF token to expose to the browser for a session (HMAC bound to the session). */
export function csrfForSession(session: AdminSessionInfo): string {
  return sessionCsrfToken(session);
}

/** Redirect target for an unauthenticated admin page request. */
export function adminLoginPath(locale: string): string {
  return `/${locale}/admin/login`;
}
