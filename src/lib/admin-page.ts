/**
 * Server-side page gate for /admin/* pages. The UI hiding links is not protection, so each
 * page resolves the session cookie itself and bounces unauthenticated visitors to sign-in
 * before any salon data reaches the client. Returns the resolved session so pages can show
 * who is signed in.
 */
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/sessions";
import type { AdminSessionInfo } from "@/lib/sessions";
import { env } from "@/lib/env";

export async function requireAdminSession(locale: string): Promise<AdminSessionInfo> {
  const token = (await cookies()).get(env.sessionCookieName)?.value;
  const session = await getSession(token);
  if (!session) {
    redirect(`/${locale}/admin/login`);
  }
  return session;
}