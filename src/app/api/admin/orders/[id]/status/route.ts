import { readJsonBody } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminMutation } from "@/lib/admin-guard";
import { orderStatusSchema, flattenZodErrors } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { shapeOrder, ORDER_INCLUDE } from "@/lib/store-views";
import { StoreError, transitionOrderStatus } from "@/lib/order";
import { getPaymentProvider } from "@/lib/payment";
import { z } from "zod";
import { signOrderToken } from "@/lib/tokens";
import { env } from "@/lib/env";
import { logServerError } from "@/lib/safe-log";
import { notificationProvider, orderShippedEmail } from "@/lib/notifications";

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
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = z.object({
    status: orderStatusSchema.shape.status,
    shippingCarrier: z.string().trim().max(80).optional(),
    trackingNumber: z.string().trim().max(120).optional(),
    trackingUrl: z.string().trim().url().max(500).optional(),
  }).strict().safeParse(body);
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
    if (next === "SHIPPED" && (!parsed.data.shippingCarrier || !parsed.data.trackingNumber || !parsed.data.trackingUrl || !parsed.data.trackingUrl.startsWith("https://"))) {
      return NextResponse.json({ error: "TRACKING_REQUIRED", message: "Add the carrier, tracking number and secure tracking link before marking shipped." }, { status: 400 });
    }
    if (next === "REFUNDED") {
      const stripeAttempt = existing.paymentAttempts.find((attempt) => attempt.provider === "stripe" && attempt.status === "APPROVED");
      if (stripeAttempt) {
        if (!stripeAttempt.paymentIntentId) return NextResponse.json({ error: "REFUND_UNAVAILABLE", message: "The payment reference is incomplete; contact the payment provider before refunding." }, { status: 409 });
        const provider = getPaymentProvider();
        if (!("refund" in provider) || typeof provider.refund !== "function") return NextResponse.json({ error: "REFUND_UNAVAILABLE", message: "The payment provider cannot process this refund." }, { status: 503 });
        await provider.refund(stripeAttempt.paymentIntentId, existing.id);
      }
    }
    const updated = await transitionOrderStatus(prisma, id, next, next === "SHIPPED" ? {
      shippingCarrier: parsed.data.shippingCarrier!,
      trackingNumber: parsed.data.trackingNumber!,
      trackingUrl: parsed.data.trackingUrl!,
    } : undefined);

    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "order.status",
      targetType: "Order",
      targetId: updated.id,
      detail: `${updated.ref}: ${existing.status} -> ${next}${updated.inventoryRestoredAt ? " (restocked)" : ""}`,
      ip,
    });

    if (next === "SHIPPED") {
      const token = await signOrderToken({ sub: updated.id, email: updated.email });
      const orderUrl = `${env.baseUrl}/${updated.locale}/store/order/${encodeURIComponent(updated.ref)}?t=${encodeURIComponent(token)}`;
      await notificationProvider.sendEmail(orderShippedEmail({
        name: updated.name,
        email: updated.email,
        ref: updated.ref,
        orderUrl,
        carrier: updated.shippingCarrier!,
        trackingNumber: updated.trackingNumber!,
        trackingUrl: updated.trackingUrl!,
        locale: updated.locale,
      })).catch((error) => logServerError("shipped order email delivery failed", error));
    }

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
    logServerError("admin order status error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}
