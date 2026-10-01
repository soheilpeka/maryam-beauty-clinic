"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { formatPrice } from "@/lib/datetime";
import { useCart } from "@/components/store/cart-context";
import type { ProductView } from "@/lib/store-views";
import Image from "next/image";

/**
 * Product card for the store listing. The price/stock come from the server payload; the
 * Add button writes a line into the cart context and confirms it was added.
 */
export function ProductCard({ product, locale }: { product: ProductView; locale: string }) {
  const t = useTranslations("Store");
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const soldOut = product.stock <= 0;
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;

  function handleAdd() {
    add({ slug: product.slug, name: product.name, priceCents: product.price, imageUrl: product.imageUrl });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <article className="product-editorial-card group flex flex-col border-b border-border pb-6">
      <Link href={`/store/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-muted">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            unoptimized={product.imageUrl.startsWith("https://")}
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            {product.name}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            {t(("categories." + product.category) as never)}
          </p>
          {soldOut ? (
            <span className="rounded-full bg-muted px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">{t("soldOut")}</span>
          ) : product.stock <= 5 ? (
            <span className="text-xs font-medium text-destructive">{t("lowStock", { count: product.stock })}</span>
          ) : null}
        </div>
        <Link href={`/store/${product.slug}`} className="mt-2 block">
          <h3 className="font-serif text-lg font-medium leading-snug text-foreground transition-colors group-hover:text-brand">
            {product.name}
          </h3>
        </Link>
        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-lg font-medium text-foreground">
            {formatPrice(product.price, locale)}
          </span>
          {onSale && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compareAtPrice as number, locale)}
            </span>
          )}
          {onSale && (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand">
              {t("sale")}
            </span>
          )}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut}
            className="min-h-11 flex-1 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {soldOut ? t("soldOut") : added ? t("added") : t("addToCart")}
          </button>
          <span aria-live="polite" className="sr-only">
            {added ? t("addedAnnouncement", { name: product.name }) : ""}
          </span>
        </div>
      </div>
    </article>
  );
}
