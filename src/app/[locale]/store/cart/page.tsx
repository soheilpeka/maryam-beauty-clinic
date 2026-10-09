import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/order";
import { localizeProduct, shapeProduct } from "@/lib/store-views";
import { CartPageView } from "@/components/store/cart-page-view";
import { listStoreCategories } from "@/lib/store-categories";

export const dynamic = "force-dynamic";

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await releaseExpiredReservations(prisma);

  const products = await prisma.product.findMany({
    where: { active: true, demo: false, stock: { gt: 0 } },
    include: { _count: { select: { orderItems: true } }, images: { orderBy: { order: "asc" } } },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
    take: 12,
  });

  const recommendations = products
    .filter((product) => !/^(?:test|sample)(?:[-\s]?\d*)?$/i.test(product.slug) && !/^(?:test|sample)(?:[-\s]?\d*)?$/i.test(product.name.trim()))
    .slice(0, 3)
    .map((product) => localizeProduct(shapeProduct(product), locale));

  const categories = await listStoreCategories();
  return <CartPageView recommendedProducts={recommendations} categories={categories} />;
}
