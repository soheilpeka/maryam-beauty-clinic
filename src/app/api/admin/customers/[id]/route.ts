import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-guard";
import { localDayKey, toLocalMinutes } from "@/lib/datetime";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/customers/[id]
 *
 * One customer with their booking history (most recent first, capped at 50) so the customer
 * book can show the full relationship instead of just the last visit.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;
  const { id } = await ctx.params;
  const rawOffset = Number(request.nextUrl.searchParams.get("offset"));
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      bookings: {
        include: {
          service: { select: { name: true, nameFr: true, duration: true } },
          staff: { select: { name: true } },
        },
        orderBy: [{ startUtc: "desc" }, { id: "desc" }],
        take: 51,
        skip: offset,
      },
      _count: { select: { bookings: true } },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Customer not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      notes: customer.notes,
      createdAt: customer.createdAt.toISOString(),
      bookingCount: customer._count.bookings,
      historyOffset: offset,
      hasMoreBookings: customer.bookings.length > 50,
      bookings: customer.bookings.slice(0, 50).map((b) => ({
        id: b.id,
        ref: b.ref,
        status: b.status,
        startUtc: b.startUtc.toISOString(),
        endUtc: b.endUtc.toISOString(),
        dayKey: localDayKey(b.startUtc),
        startMinutes: toLocalMinutes(b.startUtc),
        priceTotal: b.priceTotal,
        note: b.note,
        service: { name: b.serviceNameSnapshot ?? b.service.name, nameFr: b.serviceNameFrSnapshot ?? b.serviceNameSnapshot ?? b.service.nameFr ?? b.service.name, duration: b.durationMinSnapshot ?? b.service.duration },
        staff: { name: b.staff.name },
      })),
    },
  });
}
