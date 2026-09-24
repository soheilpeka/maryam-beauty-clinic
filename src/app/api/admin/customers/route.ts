import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export interface CustomerView {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  createdAt: string;
  bookingCount: number;
  lastVisit: { startUtc: string; status: string } | null;
}

/**
 * GET /api/admin/customers?q=<text>&limit=<n>
 *
 * Searches the customer book by name, email or phone (SQLite's LIKE is case-insensitive for
 * ASCII) and returns each customer with how many bookings they have and their most recent
 * visit. `limit` is capped at 100; the response says whether more rows exist.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;

  const q = request.nextUrl.searchParams.get("q")?.trim();
  const rawLimit = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 50;

  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { bookings: true } },
        bookings: {
          orderBy: { startUtc: "desc" },
          take: 1,
          select: { startUtc: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    }),
    prisma.customer.count({ where }),
  ]);

  const hasMore = rows.length > limit;
  const customers: CustomerView[] = rows.slice(0, limit).map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    bookingCount: c._count.bookings,
    lastVisit: c.bookings[0]
      ? { startUtc: c.bookings[0].startUtc.toISOString(), status: c.bookings[0].status }
      : null,
  }));

  return NextResponse.json({ ok: true, customers, total, hasMore, limit });
}