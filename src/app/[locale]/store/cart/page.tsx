"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useCart } from "@/components/store/cart-context";
import { cartSubtotal, lineTotal } from "@/lib/cart";
import { formatPrice } from "@/lib/datetime";
import { EditorialHeading, EditorialEmpty } from "@/components/editorial";

interface QuoteLine {
  slug: string;
  quantity: number;
  available: boolean;
  stock?: number;
  name?: string;
  imageUrl?: string | null;
  priceCents?: number;
  lineTotalCents?: number;
}

interface Quote {
  enabled: boolean;
  lines: QuoteLine[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  freeShippingThresholdCents: number;
}

export default function CartPage() {
  const t = useTranslations("Store");
  const locale = useLocale();
  const { lines, ready, setQuantity, remove } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState(false);
  const lineKey = useMemo(() => JSON.stringify(lines.map(({ slug, quantity }) => ({ slug, quantity }))), [lines]);

  useEffect(() => {
    if (!ready || lines.length === 0) {
      setQuote(null);
      setQuoteError(false);
      return;
    }
    const controller = new AbortController();
    setQuote(null);
    setQuoteError(false);
    fetch("/api/store/cart/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale, lines: lines.map(({ slug, quantity }) => ({ slug, quantity })) }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("quote failed");
        const data = await response.json();
        setQuote(data);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setQuoteError(true);
      });
    return () => controller.abort();
  }, [lineKey, locale, ready]);

  const quoteBySlug = new Map(quote?.lines.map((line) => [line.slug, line]) ?? []);
  const fallbackSubtotal = cartSubtotal(lines);
  const canCheckout = Boolean(quote?.enabled && quote.lines.every((line) => line.available));

  return (
    <div className="editorial-page cart-editorial">
      <div className="editorial-container">
        <EditorialHeading eyebrow={t("cart")} title={t("cartTitle")}>{t("cartSubtitle")}</EditorialHeading>

        {!ready ? (
          <div className="mt-10" aria-busy="true" aria-label={t("loading")}>
            <div className="h-32 animate-pulse rounded-3xl border border-border bg-card" />
          </div>
        ) : lines.length === 0 ? (
          <EditorialEmpty eyebrow="Maryam C Beauté" title={t("cartEmpty")} body={t("checkoutEmpty")} href="/store" action={t("browseProducts")} image />
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              {quoteError && (
                <p role="alert" className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  {t("quoteError")}
                </p>
              )}
              <ul className="cart-lines space-y-4">
                {lines.map((line) => {
                  const fresh = quoteBySlug.get(line.slug);
                  const price = fresh?.priceCents ?? line.priceCents;
                  const name = fresh?.name ?? line.name;
                  const imageUrl = fresh?.imageUrl ?? line.imageUrl;
                  return (
                    <li key={line.slug} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 rounded-3xl border border-border bg-card p-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center sm:p-5">
                      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
                        {imageUrl ? <Image src={imageUrl} alt={name} fill unoptimized={imageUrl.startsWith("https://")} sizes="6rem" className="object-cover" /> : null}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/store/${line.slug}`} className="font-serif text-lg font-medium text-foreground hover:text-brand">{name}</Link>
                        <p className="mt-1 text-sm text-muted-foreground">{formatPrice(price, locale)} {t("each")}</p>
                        {fresh && !fresh.available && (
                          <p role="alert" className="mt-2 text-xs font-medium text-destructive">
                            {fresh.stock === 0 ? t("soldOut") : t("lowStock", { count: fresh.stock ?? 0 })}
                          </p>
                        )}
                        <button type="button" onClick={() => remove(line.slug)} className="mt-3 text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline">{t("remove")}</button>
                      </div>
                      <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end">
                        <div className="inline-flex items-center rounded-full border border-border" aria-label={t("quantity")}>
                          <button type="button" onClick={() => setQuantity(line.slug, line.quantity - 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted" aria-label={t("decreaseQuantity")}>&minus;</button>
                          <span className="w-9 text-center text-sm font-medium tabular-nums" aria-live="polite">{line.quantity}</span>
                          <button type="button" onClick={() => setQuantity(line.slug, line.quantity + 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted" aria-label={t("increaseQuantity")}>+</button>
                        </div>
                        <p className="font-medium tabular-nums text-foreground">{formatPrice(fresh?.lineTotalCents ?? lineTotal({ priceCents: price, quantity: line.quantity }), locale)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <aside className="commerce-summary h-fit lg:sticky lg:top-24" aria-busy={!quote && !quoteError}>
              <h2 className="font-serif text-xl text-foreground">{t("orderSummary")}</h2>
              {!quote && !quoteError && <p role="status" className="mt-3 text-sm text-muted-foreground">{t("loading")}</p>}
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="font-medium tabular-nums">{formatPrice(quote?.subtotalCents ?? fallbackSubtotal, locale)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t("shipping")}</dt><dd className="font-medium tabular-nums">{quote ? (quote.shippingCents === 0 ? t("free") : formatPrice(quote.shippingCents, locale)) : t("calculatedAtCheckout")}</dd></div>
                <div className="flex justify-between gap-4 border-t border-border pt-4 text-base"><dt className="font-medium">{t("estimatedTotal")}</dt><dd className="font-serif text-xl tabular-nums">{formatPrice(quote?.totalCents ?? fallbackSubtotal, locale)}</dd></div>
              </dl>
              {canCheckout ? (
                <Link href="/store/checkout" className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">{t("proceedToCheckout")}</Link>
              ) : (
                <button type="button" disabled className="mt-6 min-h-12 w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground opacity-50">{t("proceedToCheckout")}</button>
              )}
              <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">{t("cartDemoNotice")}</p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
