import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminMutation } from "@/lib/admin-guard";
import { orderStatusSchema, flattenZodErrors } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { shapeOrder, ORDER_INCLUDE } from "@/lib/store-views";
import { StoreError, transitionOrderStatus } from "@/lib/order";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/orders/[id]/status
 *
 * Advances (or cancels) an order. The salon fulfils orders manually, so the full lifecycle
 * PENDING -> PAID -> PROCESSING -> SHIPPED -> DELIVERED is driven from here. A cancelled
 * order restocks its lines, because the units were reserved at checkout.
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

  const parsed = orderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please choose a valid status." },
      { status: 400 },
    );
  }
  const next = parsed.data.status;

  const existing = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Order not found." }, { status: 404 });
  }
  if (existing.status === next) {
    return NextResponse.json({ ok: true, order: shapeOrder(existing) });
  }

  try {
    const updated = await transitionOrderStatus(prisma, id, next);

    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "order.status",
      targetType: "Order",
      targetId: updated.id,
      detail: `${updated.ref}: ${existing.status} -> ${next}${updated.inventoryRestoredAt ? " (restocked)" : ""}`,
      ip,
    });

    return NextResponse.json({ ok: true, order: shapeOrder(updated) });
  } catch (e) {
    if (e instanceof StoreError) {
      const message =
        e.code === "NOT_FOUND"
          ? "Order not found."
          : e.code === "INVALID_STATUS_TRANSITION"
            ? "That status change is not available for this order."
            : "The order status could not be updated.";
      return NextResponse.json({ error: e.code, message }, { status: 409 });
    }
    console.error("admin order status error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}
