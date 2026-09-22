/**
 * Proxy (Next 16 renamed "middleware" to "proxy") - the server-side gate for the admin area.
 *
 * It verifies the session cookie against the DB and rejects unauthenticated requests BEFORE
 * any admin page or route handler runs:
 *  - /api/admin/*  -> 401 JSON
 *  - /<locale>/admin pages  -> redirect to the localized login page
 * The login route itself and public assets are excluded by the matcher.
 *
 * This is the outer gate; route handlers additionally call authorizeAdmin() themselves, so
 * protection does not depend on the proxy running (defense in depth).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/sessions";

const LOGIN_PATH = "/admin/login";

function isLoginPath(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname.endsWith(LOGIN_PATH);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Anything under /admin (pages) or /api/admin (routes), except the login page and the
  // login endpoint, which must stay reachable to sign in.
  const isAdminPage = pathname.includes("/admin/") && !isLoginPath(pathname);
  const isAdminApi = pathname.startsWith("/api/admin/") && !pathname.endsWith("/api/admin/login");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(process.env.ADMIN_SESSION_COOKIE ?? "mbc_admin_session")?.value;
  const session = await getSession(token);

  if (session) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Sign in required." },
      { status: 401 },
    );
  }

  // Page: redirect to the localized login, preserving the locale segment if present.
  const locale = pathname.split("/")[1];
  const locales = ["en", "fr"];
  const safeLocale = locales.includes(locale) ? locale : "en";
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = `/${safeLocale}${LOGIN_PATH}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Admin pages (with or without a locale prefix) and admin API routes only, so the DB
    // session lookup runs for no other request. The login page and login endpoint are
    // excluded inside the handler.
    "/admin/:path*",
    "/:locale/admin/:path*",
    "/api/admin/:path*",
  ],
};
