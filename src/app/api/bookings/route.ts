import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createBookingRequest,
  BookingStateError,
} from "@/lib/booking";
import { bookingRequestSchema, flattenZodErrors } from "@/lib/validation";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { signBookingToken } from "@/lib/tokens";
import { sendRequestReceipt, notifyAdminNewRequest } from "@/lib/notifications";
import { env } from "@/lib/env";
import { formatLongDate, formatTime, toLocalMinutes } from "@/lib/datetime";

export const dynamic = "force-dynamic";
import { PUBLIC_STAFF_WHERE, isPublicStaff } from "@/lib/public-staff";

// Tight limit on request submission to protect against abuse and double-submits. The
// per-minute budget is overridable via env (see env.bookingRateLimitPerMinute).
const RATE_LIMIT = { limit: env.bookingRateLimitPerMinute, windowMs: 60_000 };

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

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the form." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.active) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Service unavailable" }, { status: 404 });
  }

  // Resolve the staff choice. "any" means the salon picks a specialist at confirm time, so
  // store the request against the first qualified staff (still PENDING; the admin can
  // reassign on confirm). A named staff must be qualified for the service.
  let staffId = data.staffId;
  if (staffId === "any") {
    const first = await prisma.staff.findFirst({
      where: { ...PUBLIC_STAFF_WHERE, services: { some: { serviceId: service.id } } },
      orderBy: { name: "asc" },
    });
    if (!first) {
      return NextResponse.json({ error: "NOT_FOUND", message: "No specialist available" }, { status: 404 });
    }
    staffId = first.id;
  }
  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff || !isPublicStaff(staff)) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Specialist unavailable" }, { status: 404 });
  }
  const qualified = await prisma.staffService.findUnique({
    where: { staffId_serviceId: { staffId: staff.id, serviceId: service.id } },
  });
  if (!qualified) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Specialist unavailable" }, { status: 404 });
  }

  const locale = data.locale ?? (request.cookies.get("NEXT_LOCALE")?.value === "fr" ? "fr" : "en");

  try {
    const result = await createBookingRequest(prisma, {
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
    });

    const token = await signBookingToken({ sub: result.booking.id, cust: result.customer.id });
    const manageUrl = `${env.baseUrl}/${locale}/booking/${result.booking.ref}?t=${token}`;
    const whenLabel = `${formatLongDate(result.booking.startUtc, locale)} ${formatTime(result.booking.startUtc, locale)}`;

    await sendRequestReceipt({ customerName: result.customer.name, customerEmail: result.customer.email, ref: result.booking.ref, manageUrl, locale }).catch(() => console.error("request receipt delivery failed"));
    // Alert the salon immediately; failures must not fail the request itself.
    await notifyAdminNewRequest({
      ref: result.booking.ref,
      customerName: result.customer.name,
      serviceName: result.booking.serviceNameSnapshot ?? service.name,
      staffName: staff.name,
      whenLabel,
      customerEmail: result.customer.email,
      customerPhone: result.customer.phone,
      note: result.booking.note,
      adminEmail: env.notificationAdminEmail,
      adminUrl: `${env.baseUrl}/${locale}/admin/requests`,
      locale,
    }).catch((e) => console.error("admin notification failed", e));

    return NextResponse.json({
      ok: true,
      booking: {
        ref: result.booking.ref,
        service: locale === "fr" ? service.nameFr ?? service.name : service.name,
        staff: staff.name,
        startUtc: result.booking.startUtc.toISOString(),
        endUtc: result.booking.endUtc.toISOString(),
        priceTotal: result.booking.priceTotal,
        durationMin: result.booking.durationMinSnapshot ?? service.duration,
        whenLabel,
        startMinutes: toLocalMinutes(result.booking.startUtc),
        status: result.booking.status,
      },
      manageUrl,
    });
  } catch (e) {
    if (e instanceof BookingStateError) {
      return NextResponse.json({ error: "PAST_TIME", message: "Please choose a future date and time." }, { status: 400 });
    }
    console.error("booking request error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}
