import { logServerError } from "@/lib/safe-log";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import { contactSchema, flattenZodErrors } from "@/lib/validation";
import { clientIpFromHeaders, consumeRateLimit } from "@/lib/rate-limit";
import { NOTIFICATION_PROVIDER_NAME, sendContactMessage } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const limited = await consumeRateLimit(`contact:${ip}`, { limit: 4, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: limited.unavailable ? 503 : 429, headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) } });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION", fieldErrors: flattenZodErrors(parsed) }, { status: 400 });
  }

  let saved;
  try {
    saved = await prisma.contactMessage.create({ data: parsed.data });
  } catch (error) {
    logServerError("contact persistence failed", error);
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  }

  let delivery = "failed";
  try {
    await sendContactMessage(parsed.data);
    delivery = NOTIFICATION_PROVIDER_NAME === "resend" ? "provider" : "mock";
  } catch (error) {
    logServerError("contact notification failed", error);
  }
  try {
    await prisma.contactMessage.update({ where: { id: saved.id }, data: { delivery } });
  } catch (error) {
    logServerError("contact delivery status failed", error);
  }
  return NextResponse.json({ ok: true, delivery });
}
