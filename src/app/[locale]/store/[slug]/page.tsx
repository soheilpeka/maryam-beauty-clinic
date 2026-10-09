import type { Metadata } from "next";
import { productPricing } from "@/lib/product-pricing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import { formatPrice } from "@/lib/datetime";
import { ProductDetailActions } from "@/components/store/product-detail-actions";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductCard } from "@/components/store/product-card";
import { localizeProduct, shapeProduct } from "@/lib/store-views";
import { releaseExpiredReservations } from "@/lib/order";
import { listStoreCategories } from "@/lib/store-categories";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const record = await prisma.product.findUnique({
    where: { slug },
    include: { _count: { select: { orderItems: true } }, images: { orderBy: { order: "asc" } } },
  });
  const product = record ? localizeProduct(shapeProduct(record), locale) : null;
  if (!product || !product.active || product.demo) {
    return { title: locale === "fr" ? "Page introuvable" : "Not found" };
  }
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: `${product.name} | ${t("storeTitle")}`,
    description: product.description ?? t("storeDescription"),
    alternates: {
      canonical: `/${locale}/store/${product.slug}`,
      languages: { en: `/en/store/${product.slug}`, fr: `/fr/store/${product.slug}` },
    },
    openGraph: {
      title: product.name,
      description: product.description ?? t("storeDescription"),
      type: "website",
      images: product.imageUrl ? [{ url: product.imageUrl, alt: product.name }] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Store" });

  await releaseExpiredReservations(prisma);
  const record = await prisma.product.findUnique({
    where: { slug },
    include: { _count: { select: { orderItems: true } }, images: { orderBy: { order: "asc" } } },
  });
  if (!record || !record.active || record.demo) {
    notFound();
  }
  const product = localizeProduct(shapeProduct(record), locale);
  const categories = await listStoreCategories();
  const category = categories.find((item) => item.name === product.category);
  const categoryLabel = locale === "fr" && category?.nameFr ? category.nameFr : t.has("categories." + product.category) ? t(("categories." + product.category) as never) : product.category;
  const relatedRecords = await prisma.product.findMany({
    where: { active: true, demo: false, category: record.category, id: { not: record.id } },
    include: { _count: { select: { orderItems: true } }, images: { orderBy: { order: "asc" } } },
    orderBy: [{ featured: "desc" }, { order: "asc" }],
    take: 4,
  });
  const related = relatedRecords.map((item) => localizeProduct(shapeProduct(item), locale));
  const gallery = product.images.length > 0
    ? product.images.map((image) => ({ url: image.url, alt: locale === "fr" ? image.altFr : image.altEn }))
    : product.imageUrl
      ? [{ url: product.imageUrl, alt: product.name }]
      : [];

  const soldOut = product.stock <= 0;
  const { price, original, onSale, percent } = productPricing(product);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku,
    image: gallery.map((image) => image.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "CAD",
      price: (price / 100).toFixed(2),
      availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: `/${locale}/store/${product.slug}`,
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("backToStore"), item: `/${locale}/store` },
      { "@type": "ListItem", position: 2, name: product.name, item: `/${locale}/store/${product.slug}` },
    ],
  };

  return (
    <div className="editorial-page product-editorial">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <nav aria-label={locale === "fr" ? "Fil d’Ariane" : "Breadcrumb"} className="mb-8 text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/store" className="transition-colors hover:text-brand">{t("backToStore")}</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            {gallery.length > 0 ? (
              <ProductGallery images={gallery} />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center text-muted-foreground">
                {product.name}
              </div>
            )}
          </div>

          <div>
            <p className="eyebrow">{categoryLabel}</p>
            <h1 className="display-heading mt-3 text-4xl sm:text-5xl">{product.name}</h1>
            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-3xl font-light text-foreground">
                {formatPrice(price, locale)}
              </span>
              {onSale && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(original, locale)}
                  </span>
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand">
                    {t("sale")} −{percent}%
                  </span>
                </>
              )}
            </div>

            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              {product.description ?? ""}
            </p>

            <div className="mt-8 border-t border-border pt-6">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t("availability")}:</span>{" "}
                {soldOut ? t("soldOut") : t("inStock", { count: product.stock })}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t("fulfilment")}:</span>{" "}
                {t("fulfilmentHint")}
              </p>
            </div>

            <ProductDetailActions product={product} locale={locale} />
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20 border-t border-border pt-16" aria-labelledby="related-products">
            <p className="eyebrow">{t("relatedEyebrow")}</p>
            <h2 id="related-products" className="display-heading mt-3 text-3xl sm:text-4xl">{t("relatedTitle")}</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => <ProductCard key={item.slug} product={item} locale={locale} categories={categories} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
