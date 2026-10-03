import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createSession, SessionCredentialsChangedError, sessionCsrfToken, sessionTtlSeconds } from "@/lib/sessions";
import {
  accountLockState,
  ipLoginBudget,
  loginIp,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/login-limit";
import { adminLoginSchema, flattenZodErrors } from "@/lib/validation";
import { env } from "@/lib/env";
import { readJsonBody } from "@/lib/request-body";

export const dynamic = "force-dynamic";

const GENERIC = "Invalid email or password.";

// A valid cost-12 hash of synthetic data: unknown accounts must incur the same
// expensive bcrypt work as real accounts with an incorrect password.
const DUMMY_HASH = "$2b$12$rw66it8s8Ps9AQgdxLTsoeXkn2aZljJ6FH1646iYJhIa6UO1g/xfe";

export async function POST(request: NextRequest) {
  // Login has no prior session token. Require a non-simple JSON request and reject
  // cross-origin browser submissions before accepting credentials or setting cookies.
  const origin = request.headers.get("origin");
  if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "FORBIDDEN", message: "Invalid request origin." }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Expected JSON body." }, { status: 400 });
  }
  const ip = loginIp(request);

  // Check the shared per-IP budget before account lookup or expensive bcrypt work.
  const budget = await ipLoginBudget(ip);
  if (!budget.ok) {
    return NextResponse.json(
      { error: "TOO_MANY_REQUESTS", message: "Too many attempts. Please wait a minute." },
      { status: budget.unavailable ? 503 : 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(budget.retryAfterMs / 1000))) } },
    );
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
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

  let created: Awaited<ReturnType<typeof createSession>>;
  try {
    created = await createSession(admin.id, admin.passwordHash);
  } catch (error) {
    if (error instanceof SessionCredentialsChangedError) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS", message: GENERIC }, { status: 401 });
    }
    throw error;
  }
  const { token, info } = created;

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
