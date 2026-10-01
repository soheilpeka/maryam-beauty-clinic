"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { formatPrice } from "@/lib/datetime";
import { EditorialHeading } from "@/components/editorial";

interface OrderData {
  ref: string;
  status: string;
  name: string;
  email: string;
  address: string;
  city: string;
  province: string | null;
  postalCode: string | null;
  country: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  createdAt: string;
  items: Array<{ name: string; sku: string | null; quantity: number; unitPriceCents: number; lineTotalCents: number; imageUrl: string | null }>;
}

export default function OrderPage() {
  const t = useTranslations("Store");
  const locale = useLocale();
  const params = useParams<{ ref: string }>();
  const search = useSearchParams();
  const token = search.get("t");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!params.ref || !token) {
      setLoading(false);
      setError(true);
      return;
    }
    fetch(`/api/store/orders/${encodeURIComponent(params.ref)}?t=${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("invalid order");
        const data = await response.json();
        setOrder(data.order);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.ref, token]);

  if (loading) return <div className="editorial-page editorial-container" aria-busy="true"><EditorialHeading eyebrow="Maryam C Beauté" title={t("orderStatus")} /><p role="status">{t("loading")}</p></div>;
  if (error || !order) {
    return <div className="editorial-page editorial-container"><EditorialHeading eyebrow="Maryam C Beauté" title={t("orderStatus")} /><section className="editorial-empty"><div><p role="alert">{t("orderLinkInvalid")}</p><Link href="/store" className="editorial-action">{t("continueShopping")} <span aria-hidden="true">↗</span></Link></div></section></div>;
  }

  const statusKey = `status${order.status}` as Parameters<typeof t>[0];
  return (
    <div className="editorial-page order-editorial">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="order-heading p-7 sm:p-10">
          <p className="eyebrow">{t("orderStatus")}</p>
          <h1 className="display-heading mt-3 text-4xl sm:text-5xl">{t("orderConfirmedTitle", { name: order.name })}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">{t("orderConfirmedBody", { ref: order.ref })}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{t(statusKey)}</span>
            <span className="text-sm text-muted-foreground">{t("orderReference")}: <strong className="font-medium text-foreground">{order.ref}</strong></span>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-7" aria-labelledby="order-items">
            <h2 id="order-items" className="font-serif text-xl">{t("orderSummary")}</h2>
            <ul className="mt-5 divide-y divide-border">
              {order.items.map((item) => <li key={`${item.sku ?? item.name}-${item.quantity}`} className="flex justify-between gap-4 py-4 text-sm"><span className="text-muted-foreground">{item.name} × {item.quantity}</span><span className="font-medium tabular-nums">{formatPrice(item.lineTotalCents, locale)}</span></li>)}
            </ul>
            <dl className="mt-3 space-y-3 border-t border-border pt-4 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="tabular-nums">{formatPrice(order.subtotalCents, locale)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">{t("shipping")}</dt><dd className="tabular-nums">{order.shippingCents ? formatPrice(order.shippingCents, locale) : t("free")}</dd></div><div className="flex justify-between text-base"><dt className="font-medium">{t("total")}</dt><dd className="font-serif text-xl tabular-nums">{formatPrice(order.totalCents, locale)}</dd></div></dl>
          </section>
          <aside className="rounded-3xl border border-border bg-card p-6 sm:p-7"><h2 className="font-serif text-xl">{t("shipTo")}</h2><address className="mt-4 text-sm not-italic leading-6 text-muted-foreground">{order.name}<br />{order.address}<br />{order.city}{order.province ? `, ${order.province}` : ""} {order.postalCode}<br />{order.country}</address></aside>
        </div>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/store" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">{t("continueShopping")}</Link><Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:border-brand hover:text-brand">{t("backToStore")}</Link></div>
      </div>
    </div>
  );
}
