"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useCart } from "@/components/store/cart-context";
import type { ProductView } from "@/lib/store-views";
import { useRouter } from "@/i18n/routing";

/**
 * Add-to-cart + quantity controls on the product detail page. Server data (price, stock)
 * seeds the cart line; the cart badge in the header updates immediately.
 */
export function ProductDetailActions({ product }: { product: ProductView; locale: string }) {
  const t = useTranslations("Store");
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;

  function handleAdd() {
    add({ slug: product.slug, name: product.name, priceCents: product.price, imageUrl: product.imageUrl }, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <fieldset className="mt-8 space-y-4">
      <legend className="block text-sm font-medium text-foreground">{t("quantity")}</legend>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="inline-flex items-center rounded-full border border-border">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          disabled={soldOut || qty <= 1}
          aria-label={t("decreaseQuantity")}
        >
          &minus;
        </button>
        <span className="w-10 text-center text-sm font-medium tabular-nums" aria-live="polite">
          {qty}
        </span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(99, q + 1))}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          disabled={soldOut || qty >= 99 || qty >= product.stock}
          aria-label={t("increaseQuantity")}
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={soldOut}
        className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:flex-none"
      >
        {soldOut ? t("soldOut") : added ? t("added") : t("addToCart")}
      </button>

      <button
        type="button"
        onClick={() => {
          add({ slug: product.slug, name: product.name, priceCents: product.price, imageUrl: product.imageUrl }, qty);
          router.push("/store/checkout");
        }}
        disabled={soldOut}
        className="inline-flex flex-1 items-center justify-center rounded-full border border-primary px-8 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
      >
        {t("buyNow")}
      </button>

      <Link
        href="/store/cart"
        className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
      >
        {t("viewCart")}
      </Link>
      <span aria-live="polite" className="sr-only">
        {added ? t("addedAnnouncement", { name: product.name }) : ""}
      </span>
      </div>
    </fieldset>
  );
}
