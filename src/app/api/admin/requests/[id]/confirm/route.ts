import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminMutation } from "@/lib/admin-guard";
import { confirmBookingRequest, BookingConflictError, BookingNotFoundError, BookingStateError } from "@/lib/booking";
import { confirmRequestSchema, flattenZodErrors } from "@/lib/validation";
import { sendBookingNotifications } from "@/lib/notifications";
import { signBookingToken } from "@/lib/tokens";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { localDayKey, toLocalMinutes, formatLongDate, formatTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/requests/[id]/confirm
 *
 * Confirms a PENDING request, optionally moving it to another day/time or specialist. The
 * overlap guard runs inside confirmBookingRequest as one atomic UPDATE, so two admins
 * confirming overlapping requests can never double-book; a conflict is reported here as
 * 409 CONFLICT and the UI lets the admin pick another time. Requires a session + CSRF
 * token; an audit entry is written for every attempt, and the customer is notified (once)
 * on the confirm that actually changes the status.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response as NextResponse;
  const { id } = await ctx.params;
  const ip = clientIpFromHeaders(request.headers);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = confirmRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the date and time." },
      { status: 400 },
    );
  }
  const { dayKey, startMinutes, staffId } = parsed.data;

  const before = await prisma.booking.findUnique({
    where: { id },
    include: { customer: true, service: true, staff: true },
  });
  if (!before) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Request not found." }, { status: 404 });
  }

  const locale = request.cookies.get("locale")?.value === "fr" ? "fr" : "en";

  try {
    const { booking, alreadyConfirmed } = await confirmBookingRequest(prisma, {
      bookingId: id,
      staffId: staffId ?? before.staffId,
      dayKey,
      startMinutes,
    });

    const updated = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      include: { customer: true, service: true, staff: true },
    });

    // Notify the customer exactly once: a duplicate confirm that landed after another admin
    // already confirmed it is a no-op, so it must not send a second email/SMS.
    if (!alreadyConfirmed) {
      const token = await signBookingToken({ sub: updated.id, cust: updated.customer.id });
      const manageUrl = `${env.baseUrl}/${locale}/booking/${updated.ref}?t=${token}`;
      void sendBookingNotifications({
        ref: updated.ref,
        customerName: updated.customer.name,
        customerEmail: updated.customer.email,
        customerPhone: updated.customer.phone,
        serviceName: updated.service.name,
        staffName: updated.staff.name,
        startUtc: updated.startUtc,
        endUtc: updated.endUtc,
        priceCents: updated.priceTotal,
        manageUrl,
        locale,
      }).catch((e) => console.error("confirm notification failed", e));
    }

    const when = `${formatLongDate(updated.startUtc, locale)} ${formatTime(updated.startUtc, locale)}`;
    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "booking.confirm",
      targetType: "Booking",
      targetId: updated.id,
      detail: alreadyConfirmed
        ? `idempotent re-confirm (${updated.ref}); already CONFIRMED for ${when}`
        : `${before.status} -> CONFIRMED (${updated.ref}) for ${when} with ${updated.staff.name}`,
      ip,
    });

    return NextResponse.json({
      ok: true,
      alreadyConfirmed,
      booking: {
        id: updated.id,
        ref: updated.ref,
        status: updated.status,
        startUtc: updated.startUtc.toISOString(),
        endUtc: updated.endUtc.toISOString(),
        dayKey: localDayKey(updated.startUtc),
        startMinutes: toLocalMinutes(updated.startUtc),
        endMinutes: toLocalMinutes(updated.endUtc),
        priceTotal: updated.priceTotal,
        note: updated.note,
        service: { id: updated.service.id, name: updated.service.name, duration: updated.service.duration },
        staff: { id: updated.staff.id, name: updated.staff.name },
        customer: {
          id: updated.customer.id,
          name: updated.customer.name,
          email: updated.customer.email,
          phone: updated.customer.phone,
        },
      },
    });
  } catch (e) {
    if (e instanceof BookingConflictError) {
      // The UI shows this inline in the confirm dialog and lets the admin pick another time.
      return NextResponse.json(
        {
          error: "CONFLICT",
          message:
            "That time overlaps another confirmed appointment for this specialist. Choose a different time or decline the request.",
        },
        { status: 409 },
      );
    }
    if (e instanceof BookingNotFoundError) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Request not found." }, { status: 404 });
    }
    if (e instanceof BookingStateError) {
      return NextResponse.json({ error: "CONFLICT", message: e.message }, { status: 409 });
    }
    console.error("admin confirm error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}
