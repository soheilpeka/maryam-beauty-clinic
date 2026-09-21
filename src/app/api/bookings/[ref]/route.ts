import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBookingToken, type BookingTokenPayload } from "@/lib/tokens";
import { bookingCancelledEmail, notificationProvider } from "@/lib/notifications";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import {
  rescheduleBooking,
  BookingConflictError,
  SlotUnavailableError,
  BookingNotFoundError,
} from "@/lib/booking";
import { rescheduleSchema, flattenZodErrors } from "@/lib/validation";
import { formatLongDate, formatTime, localToUtc, parseDayKey, toLocalMinutes } from "@/lib/datetime";
import type { Booking } from "@prisma/client";

export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 10, windowMs: 60_000 };

/**
 * Authorize a manage-link request. The public URL uses the booking *ref* while the
 * signed token carries the booking *id* as its subject, so we resolve the ref to its
 * row and confirm the token matches that row. Returns null when the link is invalid.
 */
/**
 * Parsed request body: the token identifies the booking, and (for PATCH) the same
 * payload carries the new slot. The body is consumed once here and handed to the
 * caller because a NextRequest stream can only be read a single time.
 */
interface ManageRequestBody {
  token?: string;
  dayKey?: string;
  startMinutes?: number;
}

async function authorizeByRef(
  request: NextRequest,
  ref: string,
): Promise<
  | { error: NextResponse; payload: null; body: null }
  | { error: null; payload: BookingTokenPayload & { booking: Booking }; body: ManageRequestBody }
> {
  let body: ManageRequestBody = {};
  try {
    body = (await request.json()) as ManageRequestBody;
  } catch {
    return { error: NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 }), payload: null, body: null };
  }

  const payload = body.token ? await verifyBookingToken(body.token) : null;
  if (!payload) {
    return {
      error: NextResponse.json({ error: "INVALID_TOKEN", message: "Invalid link" }, { status: 403 }),
      payload: null,
      body: null,
    };
  }

  const booking = await prisma.booking.findUnique({ where: { ref } });
  if (!booking || booking.id !== payload.sub || booking.customerId !== payload.cust) {
    return {
      error: NextResponse.json({ error: "INVALID_TOKEN", message: "Invalid link" }, { status: 403 }),
      payload: null,
      body: null,
    };
  }

  return { error: null, payload: { ...payload, booking }, body };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const ip = clientIpFromHeaders(request.headers);
  const rl = rateLimit(`cancel:${ip}`, RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }

  const { ref } = await params;
  const auth = await authorizeByRef(request, ref);
  if (auth.error || !auth.payload) return auth.error;
  const { booking } = auth.payload;

  if (booking.status === "CANCELLED") {
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED" },
    include: { customer: true },
  });

  void notificationProvider
    .sendEmail(
      bookingCancelledEmail({
        customerName: updated.customer.name,
        customerEmail: updated.customer.email,
        ref: updated.ref,
        locale: request.cookies.get("locale")?.value === "fr" ? "fr" : "en",
      }),
    )
    .catch((e) => console.error("notification failed", e));

  return NextResponse.json({ ok: true, status: "CANCELLED" });
}

/**
 * Reschedule an existing booking to a new slot. The signed token authorizes the change
 * (same as cancel); the new slot is re-validated and written with the atomic overlap
 * guard, so a reschedule can never double-book the specialist.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const ip = clientIpFromHeaders(request.headers);
  const rl = rateLimit(`reschedule:${ip}`, RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "TOO_MANY_REQUESTS", message: "Too many requests. Please wait a minute." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const { ref } = await params;
  const auth = await authorizeByRef(request, ref);
  if (auth.error || !auth.payload) return auth.error;
  const { booking } = auth.payload;

  // The body (parsed once inside authorizeByRef) carries only the new slot; the token
  // already identified the booking.
  const parsed = rescheduleSchema.safeParse(auth.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the date and time." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "NOT_FOUND", message: "Booking not found" }, { status: 404 });
  }

  const setting = await prisma.businessSetting.findUnique({ where: { id: "default" } });
  const locale = request.cookies.get("locale")?.value === "fr" ? "fr" : "en";

  try {
    const updated = await rescheduleBooking(prisma, {
      bookingId: booking.id,
      staffId: booking.staffId,
      dayKey: data.dayKey,
      startMinutes: data.startMinutes,
      slotIntervalMin: setting?.slotIntervalMin ?? 30,
    });

    const { year, month, day } = parseDayKey(data.dayKey);
    return NextResponse.json({
      ok: true,
      booking: {
        ref: updated.ref,
        startUtc: updated.startUtc.toISOString(),
        endUtc: updated.endUtc.toISOString(),
        startMinutes: toLocalMinutes(updated.startUtc),
        whenLabel: `${formatLongDate(updated.startUtc, locale)} ${formatTime(updated.startUtc, locale)}`,
        dayKey: data.dayKey,
        utc: localToUtc(year, month, day, data.startMinutes).toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof SlotUnavailableError) {
      return NextResponse.json(
        { error: "SLOT_UNAVAILABLE", message: "This time is no longer available." },
        { status: 409 },
      );
    }
    if (e instanceof BookingConflictError) {
      return NextResponse.json(
        { error: "CONFLICT", message: "This slot was just booked. Please choose another time." },
        { status: 409 },
      );
    }
    if (e instanceof BookingNotFoundError) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Booking not found" }, { status: 404 });
    }
    console.error("reschedule error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}


