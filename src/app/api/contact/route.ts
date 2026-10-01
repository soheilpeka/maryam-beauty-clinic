import { NextRequest, NextResponse } from "next/server";
import { contactSchema, flattenZodErrors } from "@/lib/validation";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { NOTIFICATION_PROVIDER_NAME, sendContactMessage } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const limited = rateLimit(`contact:${ip}`, { limit: 4, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429, headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION", fieldErrors: flattenZodErrors(parsed) }, { status: 400 });
  }

  try {
    await sendContactMessage(parsed.data);
    return NextResponse.json({ ok: true, delivery: NOTIFICATION_PROVIDER_NAME === "resend" ? "provider" : "mock" });
  } catch (error) {
    console.error("contact notification failed", error);
    return NextResponse.json({ error: "DELIVERY_FAILED" }, { status: 503 });
  }
}
