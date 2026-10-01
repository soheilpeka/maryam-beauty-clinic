import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cartQuoteSchema, flattenZodErrors } from "@/lib/validation";
import { cartSubtotal, shippingFor } from "@/lib/cart";
import { getStoreSettings, releaseExpiredReservations } from "@/lib/order";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
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
    if (!product || !product.active) return { slug, quantity, available: false as const };
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
