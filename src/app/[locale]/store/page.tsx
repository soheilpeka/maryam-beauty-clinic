import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { StoreGrid } from "@/components/store/store-grid";
import { ProductCard } from "@/components/store/product-card";
import { localizeProduct, shapeProduct } from "@/lib/store-views";
import { releaseExpiredReservations } from "@/lib/order";

export const dynamic = "force-dynamic";

const copy = {
  en: { title: "The Maryam C edit", description: "Discover the Maryam C Beauté store and contact the studio for product information.", eyebrow: "The store", subtitle: "Bring the studio home.", body: "Thoughtful care continues between visits. Explore the studio’s collection, or ask us about care for your hair and skin.", demoNotice: "The online collection is being prepared. Products and ordering options will appear when available.", imageAlt: "Inside the Maryam C Beauté salon", featured: "Featured edit", collection: "Shop the collection", empty: "The collection is being prepared. Check back soon." },
  fr: { title: "La sélection Maryam C", description: "Découvrez la boutique Maryam C Beauté et contactez le studio pour en savoir plus sur les produits.", eyebrow: "La boutique", subtitle: "Le studio, chez vous.", body: "Le soin se poursuit entre les visites. Découvrez la collection du studio ou demandez-nous conseil pour vos cheveux et votre peau.", demoNotice: "La collection en ligne est en préparation. Les produits et les options de commande seront affichés dès leur disponibilité.", imageAlt: "Intérieur du salon Maryam C Beauté", featured: "Sélection vedette", collection: "Découvrir la collection", empty: "La collection est en préparation. Revenez bientôt." },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = copy[locale === "fr" ? "fr" : "en"];
  return { title: t.title, description: t.description, alternates: { canonical: `/${locale}/store`, languages: { en: "/en/store", fr: "/fr/store" } } };
}

export default async function StorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = copy[locale === "fr" ? "fr" : "en"];
  await releaseExpiredReservations(prisma);
  const records = await prisma.product.findMany({ where: { active: true, demo: false }, include: { _count: { select: { orderItems: true } }, images: { orderBy: { order: "asc" } } }, orderBy: [{ order: "asc" }, { name: "asc" }] });
  const products = records.map((product) => localizeProduct(shapeProduct(product), locale));
  const categories = [...new Set(products.map((p) => p.category))];
  const featured = products.filter((product) => product.featured).slice(0, 4);
  return (
    <div className="store-page editorial-page">
      <section className="store-hero"><div><p className="preview-kicker">{t.eyebrow}</p><h1>{t.subtitle}</h1><p>{t.body}</p>{products.length === 0 && <p className="store-demo-notice" role="note">{t.demoNotice}</p>}<a className="preview-button" href="#collection">{t.collection} <span aria-hidden="true">↗</span></a></div><img src="/media/salon/salon.webp" alt={t.imageAlt} /></section>
      <div id="collection" className="store-collection">{products.length === 0 ? <div className="store-empty">{t.empty}</div> : <><section aria-labelledby="store-featured"><p className="preview-kicker">{t.featured}</p><h2 id="store-featured">{t.title}</h2><div className="store-grid">{(featured.length ? featured : products.slice(0, 4)).map((product) => <ProductCard key={product.slug} product={product} locale={locale} />)}</div></section><section className="store-all" aria-labelledby="store-all"><p className="preview-kicker">{t.collection}</p><h2 id="store-all">{t.title}</h2><StoreGrid products={products} categories={categories} locale={locale} /></section></>}</div>
    </div>
  );
}
