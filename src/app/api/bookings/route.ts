import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createBooking,
  SlotUnavailableError,
  BookingConflictError,
} from "@/lib/booking";
import { bookingMutationSchema, flattenZodErrors } from "@/lib/validation";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { signBookingToken } from "@/lib/tokens";
import { sendBookingNotifications } from "@/lib/notifications";
import { env } from "@/lib/env";
import { formatLongDate, formatTime, toLocalMinutes, localToUtc, parseDayKey } from "@/lib/datetime";

export const dynamic = "force-dynamic";

// Tight limit on booking creation to protect against abuse and double-submits.
const RATE_LIMIT = { limit: 5, windowMs: 60_000 };

export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const rl = rateLimit(`bookings:${ip}`, RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "TOO_MANY_REQUESTS", message: "Too many requests. Please wait a minute." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bookingMutationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the form." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const setting = await prisma.businessSetting.findUnique({ where: { id: "default" } });
  const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
  const staff = await prisma.staff.findUnique({ where: { id: data.staffId } });

  if (!service || !service.active || !staff || !staff.active) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Service or specialist unavailable" }, { status: 404 });
  }

  const locale = data.customer.email ? (request.cookies.get("locale")?.value ?? "en") : "en";

  try {
    const result = await createBooking(prisma, {
      serviceId: service.id,
      staffId: staff.id,
      dayKey: data.dayKey,
      startMinutes: data.startMinutes,
      customer: {
        name: data.customer.name,
        email: data.customer.email,
        phone: data.customer.phone,
        note: data.customer.note,
      },
      locale,
      slotIntervalMin: setting?.slotIntervalMin ?? 30,
    });

    const token = await signBookingToken({ sub: result.booking.id, cust: result.customer.id });
    const manageUrl = `${env.baseUrl}/${locale}/booking/${result.booking.ref}?t=${token}`;

    // Notifications are fire-and-forget mock calls; failures must not fail the booking.
    void sendBookingNotifications({
      ref: result.booking.ref,
      customerName: result.customer.name,
      customerEmail: result.customer.email,
      customerPhone: result.customer.phone,
      serviceName: service.name,
      staffName: staff.name,
      startUtc: result.booking.startUtc,
      endUtc: result.booking.endUtc,
      priceCents: result.booking.priceTotal,
      manageUrl,
      locale,
    }).catch((e) => console.error("notification failed", e));

    const { year, month, day } = parseDayKey(data.dayKey);
    return NextResponse.json({
      ok: true,
      booking: {
        ref: result.booking.ref,
        service: service.name,
        staff: staff.name,
        startUtc: result.booking.startUtc.toISOString(),
        endUtc: result.booking.endUtc.toISOString(),
        priceTotal: result.booking.priceTotal,
        durationMin: service.duration,
        whenLabel: `${formatLongDate(result.booking.startUtc, locale)} ${formatTime(result.booking.startUtc, locale)}`,
        startMinutes: toLocalMinutes(result.booking.startUtc),
        dayKey: data.dayKey,
        utc: localToUtc(year, month, day, data.startMinutes).toISOString(),
      },
      manageUrl,
    });
  } catch (e) {
    if (e instanceof SlotUnavailableError) {
      return NextResponse.json({ error: "SLOT_UNAVAILABLE", message: "This time is no longer available." }, { status: 409 });
    }
    if (e instanceof BookingConflictError) {
      return NextResponse.json({ error: "CONFLICT", message: "This slot was just booked. Please choose another time." }, { status: 409 });
    }
    console.error("booking error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}