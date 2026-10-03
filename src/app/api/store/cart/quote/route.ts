import { readJsonBody } from "@/lib/request-body";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cartQuoteSchema, flattenZodErrors } from "@/lib/validation";
import { cartSubtotal, shippingFor } from "@/lib/cart";
import { getStoreSettings, releaseExpiredReservations } from "@/lib/order";
import { clientIpFromHeaders, consumeRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const budget = await consumeRateLimit(`store-quote:${clientIpFromHeaders(request.headers)}`, { limit: 60, windowMs: 60_000 });
  if (!budget.ok) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: budget.unavailable ? 503 : 429,
      headers: { "Retry-After": String(Math.ceil(budget.retryAfterMs / 1000)) } });
  }
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = cartQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Invalid cart." },
      { status: 400 },
    );
  }

  await releaseExpiredReservations(prisma);
  const settings = await getStoreSettings(prisma);
  const wanted = new Map<string, number>();
  for (const line of parsed.data.lines) wanted.set(line.slug, (wanted.get(line.slug) ?? 0) + line.quantity);
  const products = await prisma.product.findMany({ where: { slug: { in: [...wanted.keys()] } } });
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const lines = [...wanted].map(([slug, quantity]) => {
    const product = bySlug.get(slug);
    if (!product || !product.active || product.demo) return { slug, quantity, available: false as const };
    return {
      slug,
      quantity,
      available: product.stock >= quantity,
      stock: product.stock,
      name: parsed.data.locale === "fr" ? (product.nameFr ?? product.name) : product.name,
      imageUrl: product.imageUrl,
      priceCents: product.salePrice ?? product.price,
      lineTotalCents: (product.salePrice ?? product.price) * quantity,
    };
  });
  const priced = lines.filter((line): line is Extract<(typeof lines)[number], { priceCents: number }> => "priceCents" in line);
  const subtotalCents = cartSubtotal(priced.map((line) => ({ priceCents: line.priceCents, quantity: line.quantity })));
  const shippingCents = shippingFor(subtotalCents, settings);

  return NextResponse.json({
    ok: true,
    enabled: settings.enabled,
    lines,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    freeShippingThresholdCents: settings.freeShippingThresholdCents,
  });
}
