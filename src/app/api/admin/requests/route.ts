import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-guard";
import { localDayKey, toLocalMinutes } from "@/lib/datetime";
import type { BookingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * The salon declines a request by cancelling it (see declineBookingRequest), and marks the
 * decline by prefixing the customer-visible note with "[declined]". This constant is the one
 * place that derives the flag, so the admin UI can present DECLINED and customer-CANCELLED
 * requests as distinct buckets without a second status enum value.
 */
export const DECLINED_NOTE_MARKER = "[declined]";

export function isDeclined(note: string | null): boolean {
  return !!note && note.includes(DECLINED_NOTE_MARKER);
}

type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED";

function parseStatus(value: string | null): StatusFilter {
  switch (value) {
    case "PENDING":
    case "CONFIRMED":
    case "DECLINED":
    case "CANCELLED":
    case "ALL":
      return value;
    default:
      return "ALL";
  }
}

/**
 * GET /api/admin/requests?status=PENDING|CONFIRMED|DECLINED|CANCELLED|ALL
 *
 * Lists requests for the salon to triage. PENDING always sorts first so the oldest
 * unhandled request is the top of the list; the rest follow by ascending start time.
 * Requires a valid admin session (the status filter is applied server-side, so an
 * unauthenticated caller gets nothing but a 401).
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;

  const status = parseStatus(request.nextUrl.searchParams.get("status"));

  const where = (() => {
    if (status === "ALL") return {};
    if (status === "DECLINED") {
      return { status: "CANCELLED" as BookingStatus, note: { contains: DECLINED_NOTE_MARKER } };
    }
    if (status === "CANCELLED") {
      // OR note IS NULL: SQL's NOT (note LIKE ...) is not TRUE for a NULL note, so without
      // this branch a cancelled request with no note would be excluded from its own filter.
      return {
        status: "CANCELLED" as BookingStatus,
        OR: [{ note: null }, { NOT: { note: { contains: DECLINED_NOTE_MARKER } } }],
      };
    }
    return { status: status as BookingStatus };
  })();

  const rows = await prisma.booking.findMany({
    where,
    include: {
      customer: true,
      service: { select: { id: true, name: true, duration: true, price: true, bufferMin: true } },
      staff: { select: { id: true, name: true } },
    },
    orderBy: { startUtc: "asc" },
  });

  // PENDING first, then everything else by ascending start time (findMany already returned
  // them start-ascending, so this stable pass only reorders the pending ones on top).
  const RANK: Record<BookingStatus, number> = {
    PENDING: 0,
    CONFIRMED: 1,
    CANCELLED: 2,
    COMPLETED: 3,
    NO_SHOW: 4,
  };
  const bookings = rows
    .map((b) => ({
      id: b.id,
      ref: b.ref,
      status: b.status,
      declined: isDeclined(b.note),
      startUtc: b.startUtc.toISOString(),
      endUtc: b.endUtc.toISOString(),
      /** Salon-local day key for the date picker in the confirm dialog */
      dayKey: localDayKey(b.startUtc),
      /** Salon-local minutes-from-midnight for the time picker in the confirm dialog */
      startMinutes: toLocalMinutes(b.startUtc),
      endMinutes: toLocalMinutes(b.endUtc),
      priceTotal: b.priceTotal,
      note: b.note,
      createdAt: b.createdAt.toISOString(),
      service: b.service,
      staff: b.staff,
      customer: {
        id: b.customer.id,
        name: b.customer.name,
        email: b.customer.email,
        phone: b.customer.phone,
      },
    }))
    .sort((a, b) => RANK[a.status] - RANK[b.status]);

  // Active staff, for the "reassign to another specialist" control in the confirm dialog.
  const staff = await prisma.staff.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ ok: true, bookings, staff });
}
