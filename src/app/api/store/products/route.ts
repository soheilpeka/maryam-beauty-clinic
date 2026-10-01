import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shapeProduct, localizeProduct } from "@/lib/store-views";
import { releaseExpiredReservations } from "@/lib/order";

export const dynamic = "force-dynamic";

/**
 * GET /api/store/products
 *
 * Public catalog: active products only, ordered as the salon arranged them. Inactive rows
 * stay admin-visible only. Category and search filters are optional; an unknown category
 * simply yields an empty list.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const q = url.searchParams.get("q")?.trim().toLowerCase();
  const locale = url.searchParams.get("locale") === "fr" ? "fr" : "en";

  await releaseExpiredReservations(prisma);

  const products = await prisma.product.findMany({
    where: {
      active: true,
      demo: false,
      ...(category ? { category } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] } : {}),
    },
    include: { _count: { select: { orderItems: true } }, images: { orderBy: { order: "asc" } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    ok: true,
    products: products.map((product) => localizeProduct(shapeProduct(product), locale)),
  });
}
