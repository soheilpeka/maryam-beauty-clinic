import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-log";
import { signOrderToken } from "@/lib/tokens";
import { notificationProvider, orderPaidEmail, newPaidOrderAdminEmail } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/** Stripe is the payment source of truth. Never fulfill based on a customer redirect. */
export async function POST(request: NextRequest) {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }
  if (process.env.NODE_ENV === "production" && !env.stripeSecretKey.startsWith("sk_live_")) {
    return NextResponse.json({ error: "Live Stripe credentials are required." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    const raw = await request.text();
    event = new Stripe(env.stripeSecretKey).webhooks.constructEvent(raw, signature, env.stripeWebhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      const amountTotal = session.amount_total;
      const shippingDetails = session.collected_information?.shipping_details;
      const address = shippingDetails?.address;
      if (!orderId || session.payment_status !== "paid" || session.currency !== "cad" || amountTotal === null || !address?.line1 || !address.city || !address.postal_code) {
        return NextResponse.json({ error: "Invalid paid checkout session." }, { status: 400 });
      }
      const shippingCity = address.city;
      const shippingPostalCode = address.postal_code;
      const changed = await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });
      const expectedBeforeTax = order ? order.subtotalCents + order.shippingCents : -1;
      if (!order || order.ref !== session.metadata?.orderRef || session.amount_subtotal !== order.subtotalCents || session.total_details?.amount_shipping !== order.shippingCents || amountTotal < expectedBeforeTax) return "invalid" as const;
        // Stripe retries successful deliveries. Already committed orders must never be refunded as late payments.
        if (order.inventoryCommittedAt) return "duplicate" as const;
        if (order.status !== "PENDING" || order.inventoryRestoredAt || !order.reservationExpiresAt || order.reservationExpiresAt <= new Date()) return "late" as const;
        const result = await tx.order.updateMany({
          where: { id: order.id, status: "PENDING", inventoryRestoredAt: null, totalCents: order.totalCents },
          data: {
            status: "PAID",
            taxCents: amountTotal - expectedBeforeTax,
            totalCents: amountTotal,
            name: shippingDetails?.name || order.name,
            address: [address.line1, address.line2].filter(Boolean).join(", "),
            city: shippingCity,
            province: address.state ?? order.province ?? undefined,
            postalCode: shippingPostalCode,
            country: address.country === "CA" ? "Canada" : address.country ?? order.country,
            inventoryCommittedAt: new Date(),
            reservationExpiresAt: null,
          },
        });
        if (result.count !== 1) return "duplicate" as const;
        const payment = await tx.paymentAttempt.updateMany({
          where: { orderId: order.id, reference: session.id, status: "PENDING" },
          data: { status: "APPROVED", paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null },
        });
        if (payment.count !== 1) throw new Error("Stripe checkout payment attempt was not found.");
        return "paid" as const;
      });
      if (changed === "invalid") return NextResponse.json({ error: "Order does not match payment." }, { status: 400 });
      if (changed === "paid") {
        const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
        if (order) {
          const token = await signOrderToken({ sub: order.id, email: order.email });
          const orderUrl = `${env.baseUrl}/${order.locale}/store/order/${encodeURIComponent(order.ref)}?t=${encodeURIComponent(token)}`;
          const messages = [
            orderPaidEmail({ name: order.name, email: order.email, ref: order.ref, orderUrl, locale: order.locale }),
            newPaidOrderAdminEmail({ ref: order.ref, name: order.name, email: order.email, phone: order.phone, address: order.address, city: order.city, postalCode: order.postalCode ?? "", items: order.items.map(({ name, quantity }) => ({ name, quantity })), totalCents: order.totalCents }),
          ];
          await Promise.all(messages.map((message) => notificationProvider.sendEmail(message).catch((error) => logServerError("paid order email delivery failed", error))));
        }
      }
      if (changed === "late") {
        // A payment arriving after its inventory reservation ended cannot be fulfilled safely.
        const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        if (intent) await new Stripe(env.stripeSecretKey).refunds.create({ payment_intent: intent }, { idempotencyKey: `late-checkout-${session.id}` });
      }
    } else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      const nextStatus = event.type === "checkout.session.expired" ? "EXPIRED" : "PAYMENT_FAILED";
      if (orderId) {
        await prisma.$transaction(async (tx) => {
          const order = await tx.order.findUnique({ where: { id: orderId } });
          if (!order || order.ref !== session.metadata?.orderRef || order.status !== "PENDING") return;
          const claim = await tx.order.updateMany({ where: { id: orderId, status: "PENDING", inventoryRestoredAt: null }, data: { status: nextStatus, inventoryRestoredAt: new Date() } });
          if (claim.count === 1) {
            const lines = await tx.orderItem.findMany({ where: { orderId } });
            for (const line of lines) if (line.productId) await tx.product.updateMany({ where: { id: line.productId }, data: { stock: { increment: line.quantity } } });
            await tx.paymentAttempt.updateMany({ where: { orderId, reference: session.id, status: "PENDING" }, data: { status: "ERROR", message: "Checkout session ended without payment" } });
          }
        });
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    logServerError("stripe webhook error", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
