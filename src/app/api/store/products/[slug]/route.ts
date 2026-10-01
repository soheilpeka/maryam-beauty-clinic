import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shapeProduct, localizeProduct } from "@/lib/store-views";
import { releaseExpiredReservations } from "@/lib/order";

export const dynamic = "force-dynamic";

/**
 * GET /api/store/products/[slug]
 *
 * Public product detail. An inactive product is a 404 here (it is not orderable), while the
 * admin list keeps showing it for deactivation/relaunch.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const locale = new URL(request.url).searchParams.get("locale") === "fr" ? "fr" : "en";
  await releaseExpiredReservations(prisma);

  const product = await prisma.product.findUnique({
    where: { slug },
    include: { _count: { select: { orderItems: true } }, images: { orderBy: { order: "asc" } } },
  });

  if (!product || !product.active || product.demo) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Product not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, product: localizeProduct(shapeProduct(product), locale) });
}
