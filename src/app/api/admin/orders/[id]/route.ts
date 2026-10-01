import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin, authorizeAdminMutation } from "@/lib/admin-guard";
import { orderStatusSchema, flattenZodErrors } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { shapeOrder, ORDER_INCLUDE } from "@/lib/store-views";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders/[id]
 *
 * Order detail with its lines. Session-gated like every other admin read.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;
  const { id } = await ctx.params;

  const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!order) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Order not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, order: shapeOrder(order) });
}
