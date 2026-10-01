import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkoutSchema, flattenZodErrors } from "@/lib/validation";
import { createOrder, StoreError, getStoreSettings } from "@/lib/order";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { signOrderToken } from "@/lib/tokens";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// Same tight anti-abuse budget as the booking endpoint; overridable for the e2e suite.
const RATE_LIMIT = { limit: env.storeRateLimitPerMinute, windowMs: 60_000 };

/**
 * POST /api/store/orders
 *
 * Guest checkout. The body carries contact + shipping details and the cart lines (slug +
 * quantity ONLY). Prices, stock and availability are re-read from the database here, so a
 * tampered client cart can never change what is charged. On success the order is captured
 * through the configured payment boundary (Stripe test-mode by default; mock only in isolated
 * local/e2e runs; see src/lib/payment.ts) and the response carries a signed link to the order
 * status page, mirroring the booking manage link.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const rl = rateLimit(`store-checkout:${ip}`, RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "TOO_MANY_REQUESTS", message: "Too many requests. Please wait a minute." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const settings = await getStoreSettings(prisma);
  if (!settings.enabled) {
    return NextResponse.json(
      { error: "STORE_CLOSED", message: "The store is temporarily closed for orders." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check your details." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    const result = await createOrder(prisma, {
      idempotencyKey: data.idempotencyKey,
      locale: data.locale,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      country: data.country,
      note: data.note,
      lines: data.lines.map((l) => ({ slug: l.slug, quantity: l.quantity })),
    });

    const token = await signOrderToken({ sub: result.order.id, email: data.email });
    const orderUrl = `${env.baseUrl}/${data.locale}/store/order/${result.order.ref}?t=${token}`;

    return NextResponse.json(
      {
        ok: true,
        order: {
          ref: result.order.ref,
          status: result.order.status,
          subtotalCents: result.order.subtotalCents,
          shippingCents: result.order.shippingCents,
          totalCents: result.order.totalCents,
        },
        paymentReference: result.paymentReference,
        orderUrl,
        reused: result.reused,
      },
      { status: result.reused ? 200 : 201 },
    );
  } catch (e) {
    if (e instanceof StoreError) {
      const status =
        e.code === "PRODUCT_UNAVAILABLE" || e.code === "INSUFFICIENT_STOCK"
          ? 409
          : e.code === "PAYMENT_NOT_CONFIGURED"
            ? 503
            : 400;
      const message =
        e.code === "PRODUCT_UNAVAILABLE" || e.code === "INSUFFICIENT_STOCK"
          ? "One or more items are unavailable or out of stock."
          : e.code === "PAYMENT_NOT_CONFIGURED"
            ? "Checkout is temporarily unavailable."
            : e.code === "PAYMENT_DECLINED" || e.code === "PAYMENT_FAILED"
              ? "Payment could not be completed. Please try again."
              : e.code === "STORE_CLOSED"
                ? "The store is temporarily closed for orders."
                : "We could not place your order. Please check your details and try again.";
      return NextResponse.json({ error: e.code, message }, { status });
    }
    console.error("store checkout error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}
