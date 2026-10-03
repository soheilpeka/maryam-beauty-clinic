import { logServerError } from "@/lib/safe-log";
import { readJsonBody } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBookingToken, type BookingTokenPayload } from "@/lib/tokens";
import { bookingCancelledEmail, notificationProvider } from "@/lib/notifications";
import { consumeRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import type { Booking } from "@prisma/client";

export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 10, windowMs: 60_000 };

/**
 * Authorize a manage-link request. The public URL uses the booking *ref* while the
 * signed token carries the booking *id* as its subject, so we resolve the ref to its
 * row and confirm the token matches that row. Returns null when the link is invalid.
 *
 * The body is consumed once here and handed to the caller because a NextRequest stream
 * can only be read a single time.
 */
async function authorizeByRef(
  request: NextRequest,
  ref: string,
): Promise<
  | { error: NextResponse; booking: null }
  | { error: null; booking: Booking }
> {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return { error: NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 }), booking: null };
  }

  const token = body && typeof body === "object" && "token" in body && typeof body.token === "string"
    ? body.token : null;
  const payload: BookingTokenPayload | null = token ? await verifyBookingToken(token) : null;
  if (!payload) {
    return {
      error: NextResponse.json({ error: "INVALID_TOKEN", message: "Invalid link" }, { status: 403 }),
      booking: null,
    };
  }

  const booking = await prisma.booking.findUnique({ where: { ref } });
  if (!booking || booking.id !== payload.sub || booking.customerId !== payload.cust) {
    return {
      error: NextResponse.json({ error: "INVALID_TOKEN", message: "Invalid link" }, { status: 403 }),
      booking: null,
    };
  }

  return { error: null, booking };
}

/**
 * Cancel a booking via the customer's secure link. Both PENDING (not yet reviewed by the
 * salon) and CONFIRMED requests may be cancelled; already-cancelled is idempotent.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const ip = clientIpFromHeaders(request.headers);
  const rl = await consumeRateLimit(`cancel:${ip}`, RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: rl.unavailable ? 503 : 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } });
  }

  const { ref } = await params;
  const auth = await authorizeByRef(request, ref);
  if (auth.error || !auth.booking) return auth.error;
  const { booking } = auth;

  if (booking.status === "CANCELLED") {
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  // Only the caller that atomically cancels a live request owns the notification.
  const claimed = await prisma.booking.updateMany({
    where: { id: booking.id, status: { in: ["PENDING", "CONFIRMED"] } },
    data: { status: "CANCELLED" },
  });
  if (claimed.count === 0) {
    const current = await prisma.booking.findUnique({ where: { id: booking.id }, select: { status: true } });
    if (current?.status === "CANCELLED") {
      return NextResponse.json({ ok: true, status: "CANCELLED" });
    }
    return NextResponse.json({ error: "INVALID_STATUS", message: "This booking can no longer be cancelled." }, { status: 409 });
  }
  const updated = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: { customer: true },
  });

  await notificationProvider
    .sendEmail(
      bookingCancelledEmail({
        customerName: updated.customerNameSnapshot ?? updated.customer.name,
        customerEmail: updated.customerEmailSnapshot ?? updated.customer.email,
        ref: updated.ref,
        locale: updated.locale,
      }),
    )
    .catch((e) => logServerError("notification failed", e));

  return NextResponse.json({ ok: true, status: "CANCELLED" });
}
