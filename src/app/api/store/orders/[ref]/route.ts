import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOrderToken } from "@/lib/tokens";
import { shapePublicOrder, ORDER_INCLUDE } from "@/lib/store-views";
import { releaseExpiredReservations } from "@/lib/order";

export const dynamic = "force-dynamic";

/**
 * GET /api/store/orders/[ref]?t=<token>
 *
 * Order status lookup for a customer who is not signed in. The signed token binds the order
 * to the email that placed it, so the ref alone is not enough to read someone else's
 * purchase (same reasoning as the booking manage link). GET with no token answers 401.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  await releaseExpiredReservations(prisma);
  const token = new URL(request.url).searchParams.get("t");
  const payload = token ? await verifyOrderToken(token) : null;

  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "This order link is invalid or has expired." },
      { status: 401 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { ref },
    include: ORDER_INCLUDE,
  });

  if (!order || order.id !== payload.sub || order.email !== payload.email) {
    // Token is valid but for a different order: treat as not found rather than leaking it.
    return NextResponse.json({ error: "NOT_FOUND", message: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order: shapePublicOrder(order) });
}
