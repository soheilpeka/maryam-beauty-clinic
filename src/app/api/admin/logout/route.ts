import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/sessions";
import { authorizeAdminMutation, tokenFromRequest } from "@/lib/admin-guard";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // CSRF is required for this state-changing request: 401 without a session, 403 with a bad
  // token, so a cross-site form cannot log an admin out.
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response as NextResponse;

  // Server-side invalidation: deleting the row means the token stops working even if the
  // browser keeps the cookie value.
  await deleteSession(tokenFromRequest(request));

  const response = NextResponse.json({ ok: true });
  response.cookies.set(env.sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
