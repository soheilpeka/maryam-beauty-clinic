import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOrderToken } from "@/lib/tokens";
import { getPaymentProvider } from "@/lib/payment";
import { releaseExpiredReservations } from "@/lib/order";
import { consumeRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Resume the still-open hosted payment session using the guest's signed order link. */
export async function POST(request: NextRequest, context: { params: Promise<{ ref: string }> }) {
  const limit = await consumeRateLimit(`store-resume:${clientIpFromHeaders(request.headers)}`, { limit: env.storeRateLimitPerMinute, windowMs: 60_000 });
  if (!limit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: limit.unavailable ? 503 : 429 });
  await releaseExpiredReservations(prisma);
  const { ref } = await context.params;
  const token = new URL(request.url).searchParams.get("t");
  const payload = token ? await verifyOrderToken(token) : null;
  if (!payload) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const order = await prisma.order.findUnique({ where: { ref }, include: { paymentAttempts: { where: { provider: "stripe", status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!order || order.id !== payload.sub || order.email !== payload.email) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (order.status !== "PENDING" || !order.reservationExpiresAt || order.reservationExpiresAt <= new Date()) return NextResponse.json({ error: "PAYMENT_WINDOW_CLOSED" }, { status: 409 });
  const attempt = order.paymentAttempts[0];
  if (!attempt?.reference) return NextResponse.json({ error: "PAYMENT_NOT_AVAILABLE" }, { status: 409 });
  try {
    const url = await getPaymentProvider().resume?.(attempt.reference);
    if (!url) return NextResponse.json({ error: "PAYMENT_SESSION_CLOSED" }, { status: 409 });
    return NextResponse.json({ ok: true, checkoutUrl: url });
  } catch {
    return NextResponse.json({ error: "PAYMENT_NOT_AVAILABLE" }, { status: 503 });
  }
}
