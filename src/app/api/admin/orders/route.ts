import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-guard";
import { shapeOrder, ORDER_INCLUDE } from "@/lib/store-views";
import { releaseExpiredReservations } from "@/lib/order";

export const dynamic = "force-dynamic";

const STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "PAYMENT_FAILED",
  "EXPIRED",
  "REFUNDED",
] as const;
type OrderStatusFilter = (typeof STATUSES)[number];

function parseStatus(value: string | null): OrderStatusFilter | null {
  return value && (STATUSES as readonly string[]).includes(value) ? (value as OrderStatusFilter) : null;
}

/**
 * GET /api/admin/orders?status=PAID&q=...
 *
 * Lists orders newest first, optionally filtered by status and/or a free-text search over
 * the reference, customer name and email. Requires a valid admin session.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;
  await releaseExpiredReservations(prisma);

  const url = new URL(request.url);
  const status = parseStatus(url.searchParams.get("status"));
  const q = url.searchParams.get("q")?.trim().toLowerCase();

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { ref: { contains: q } },
              { name: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, orders: orders.map(shapeOrder) });
}
