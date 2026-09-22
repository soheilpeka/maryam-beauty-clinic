import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createSession, sessionCsrfToken, sessionTtlSeconds } from "@/lib/sessions";
import {
  accountLockState,
  ipLoginLimited,
  loginIp,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/login-limit";
import { adminLoginSchema, flattenZodErrors } from "@/lib/validation";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

const GENERIC = "Invalid email or password.";

// A malformed bcrypt hash used to keep the timing of an unknown-email attempt close to a
// real one. compare() returns false for it immediately, but the work shape is the same.
const DUMMY_HASH = "$2a$12$000000000000000000000000000000000000000000000000000000";

export async function POST(request: NextRequest) {
  const ip = loginIp(request);

  // Per-IP budget first: stops a brute-force storm before it touches the DB.
  if (ipLoginLimited(ip)) {
    return NextResponse.json(
      { error: "TOO_MANY_REQUESTS", message: "Too many attempts. Please wait a minute." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    // Validation errors are about the shape of the input, not the account, so a 400 here is
    // fine; the credentials check below never reveals which emails exist.
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the form." },
      { status: 400 },
    );
  }

  const email = parsed.data.email;
  const { password } = parsed.data;

  // Per-account (per-submitted-email) lockout, identical for real and unknown emails.
  const lock = await accountLockState(email);
  if (lock.locked) {
    return NextResponse.json(
      { error: "TOO_MANY_REQUESTS", message: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(lock.retryAfterSec) } },
    );
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });

  // Always run a verification so unknown-email and wrong-password take the same time and
  // return the same generic message: no user enumeration.
  const passwordOk = admin
    ? await verifyPassword(password, admin.passwordHash)
    : await verifyPassword(password, DUMMY_HASH);

  if (!admin || !passwordOk) {
    await recordFailedLogin(email);
    return NextResponse.json({ error: "INVALID_CREDENTIALS", message: GENERIC }, { status: 401 });
  }

  await recordSuccessfulLogin(email);

  const { token, info } = await createSession(admin.id);

  const response = NextResponse.json({
    ok: true,
    admin: { email: info.email, name: info.name, role: info.role },
    csrfToken: sessionCsrfToken(info),
  });

  response.cookies.set(env.sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionTtlSeconds(),
  });
  return response;
}
