import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminMutation } from "@/lib/admin-guard";
import { declineBookingRequest, BookingNotFoundError } from "@/lib/booking";
import { declineRequestSchema, flattenZodErrors } from "@/lib/validation";
import { bookingDeclinedEmail, notificationProvider } from "@/lib/notifications";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/requests/[id]/decline
 *
 * Declines a request: status moves to CANCELLED and the optional reason is stored on the
 * booking (prefixed with the [declined] marker, which is also how the requests list tells
 * salon-declined requests apart from ones the customer cancelled themselves) and included
 * in the customer notification. Requires a session + CSRF token, and writes an audit entry.
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

  const parsed = declineRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the reason." },
      { status: 400 },
    );
  }
  const reason = parsed.data.reason?.trim() || undefined;

  const before = await prisma.booking.findUnique({
    where: { id },
    include: { customer: true, service: true, staff: true },
  });
  if (!before) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Request not found." }, { status: 404 });
  }

  const locale = request.cookies.get("locale")?.value === "fr" ? "fr" : "en";

  try {
    const booking = await declineBookingRequest(prisma, { bookingId: id, reason });

    // Tell the customer, with the reason when the salon gave one. Fire-and-forget: a
    // notification outage must not roll back the decline the admin just made.
    void notificationProvider
      .sendEmail(
        bookingDeclinedEmail({
          customerName: before.customer.name,
          customerEmail: before.customer.email,
          ref: booking.ref,
          reason,
          locale,
        }),
      )
      .catch((e) => console.error("decline notification failed", e));

    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "booking.decline",
      targetType: "Booking",
      targetId: booking.id,
      detail: reason
        ? `${before.status} -> CANCELLED (declined) (${booking.ref}): ${reason}`
        : `${before.status} -> CANCELLED (declined) (${booking.ref})`,
      ip,
    });

    return NextResponse.json({
      ok: true,
      booking: {
        id: booking.id,
        ref: booking.ref,
        status: booking.status,
        note: booking.note,
      },
    });
  } catch (e) {
    if (e instanceof BookingNotFoundError) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Request not found." }, { status: 404 });
    }
    console.error("admin decline error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}
