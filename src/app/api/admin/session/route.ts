import { NextRequest, NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/admin-guard";
import { sessionCsrfToken } from "@/lib/sessions";

export const dynamic = "force-dynamic";

/** Reports the current admin session; 401 when there is none. Used by the UI to know whether
 *  an admin is signed in, and by tests to prove a session is (in)valid. */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;

  return NextResponse.json({
    ok: true,
    admin: {
      email: auth.session!.email,
      name: auth.session!.name,
      role: auth.session!.role,
    },
    csrfToken: sessionCsrfToken(auth.session!),
  });
}
