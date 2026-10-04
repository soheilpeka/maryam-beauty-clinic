"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { formatPrice } from "@/lib/datetime";
import { EditorialHeading } from "@/components/editorial";
import { useCart } from "@/components/store/cart-context";

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
  taxCents: number;
  totalCents: number;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  createdAt: string;
  items: Array<{ name: string; sku: string | null; quantity: number; unitPriceCents: number; lineTotalCents: number; imageUrl: string | null }>;
}

export default function OrderPage() {
  const t = useTranslations("Store");
  const locale = useLocale();
  const params = useParams<{ ref: string }>();
  const search = useSearchParams();
  const token = search.get("t");
  const checkoutStatus = search.get("checkout");
  const { clear } = useCart();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!params.ref || !token) {
      setLoading(false);
      setError(true);
      return () => { active = false; };
    }
    void (async () => {
      try {
        for (let attempt = 0; attempt < (checkoutStatus === "success" ? 8 : 1); attempt += 1) {
          const response = await fetch(`/api/store/orders/${encodeURIComponent(params.ref)}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
          if (!response.ok) throw new Error("invalid order");
          const data = await response.json();
          if (!active) return;
          setOrder(data.order);
          if (data.order.status === "PAID" && sessionStorage.getItem("pendingStoreOrderRef") === data.order.ref) {
            clear();
            sessionStorage.removeItem("pendingStoreOrderRef");
          }
          if (data.order.status !== "PENDING" || attempt === 7) break;
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [params.ref, token, checkoutStatus, clear]);

  if (loading) return <div className="editorial-page editorial-container" aria-busy="true"><EditorialHeading eyebrow="Maryam C Beauté" title={t("orderStatus")} /><p role="status">{t("loading")}</p></div>;
  if (error || !order) {
    return <div className="editorial-page editorial-container"><EditorialHeading eyebrow="Maryam C Beauté" title={t("orderStatus")} /><section className="editorial-empty"><div><p role="alert">{t("orderLinkInvalid")}</p><Link href="/store" className="editorial-action">{t("continueShopping")} <span aria-hidden="true">↗</span></Link></div></section></div>;
  }

  const statusKey = `status${order.status}` as Parameters<typeof t>[0];
  const orderRef = order.ref;
  async function continuePayment() {
    if (paymentBusy) return;
    setPaymentBusy(true);
    setPaymentError(false);
    try {
      const response = await fetch(`/api/store/orders/${encodeURIComponent(orderRef)}/checkout?t=${encodeURIComponent(token ?? "")}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.checkoutUrl) throw new Error("Checkout session unavailable");
      window.location.assign(data.checkoutUrl);
    } catch {
      setPaymentError(true);
    } finally {
      setPaymentBusy(false);
    }
  }
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
          {order.status === "PENDING" && <div className="mt-6 rounded-2xl border border-border bg-background/50 p-4"><p className="text-sm text-muted-foreground">{locale === "fr" ? "Le paiement n’est pas encore confirmé. Votre réservation d’articles est temporaire." : "Payment is not confirmed yet. Your items are temporarily reserved."}</p>{paymentError && <p role="alert" className="mt-2 text-sm text-destructive">{locale === "fr" ? "La session de paiement a peut-être expiré. Contactez le salon si vous avez déjà payé." : "Your payment session may have expired. Contact the salon if you have already paid."}</p>}<button type="button" disabled={paymentBusy} onClick={() => void continuePayment()} className="mt-3 min-h-11 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{paymentBusy ? t("loading") : locale === "fr" ? "Continuer le paiement" : "Continue to payment"}</button></div>}
          {order.status === "SHIPPED" && order.trackingUrl && <div className="mt-5 rounded-2xl border border-border p-4 text-sm"><p className="font-medium">{locale === "fr" ? "Votre commande est expédiée" : "Your order has shipped"}</p><p className="mt-1 text-muted-foreground">{order.shippingCarrier}: {order.trackingNumber}</p><a href={order.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block underline underline-offset-4">{locale === "fr" ? "Suivre le colis" : "Track your shipment"}</a></div>}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-7" aria-labelledby="order-items">
            <h2 id="order-items" className="font-serif text-xl">{t("orderSummary")}</h2>
            <ul className="mt-5 divide-y divide-border">
              {order.items.map((item) => <li key={`${item.sku ?? item.name}-${item.quantity}`} className="flex justify-between gap-4 py-4 text-sm"><span className="text-muted-foreground">{item.name} × {item.quantity}</span><span className="font-medium tabular-nums">{formatPrice(item.lineTotalCents, locale)}</span></li>)}
            </ul>
            <dl className="mt-3 space-y-3 border-t border-border pt-4 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="tabular-nums">{formatPrice(order.subtotalCents, locale)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">{t("shipping")}</dt><dd className="tabular-nums">{order.shippingCents ? formatPrice(order.shippingCents, locale) : t("free")}</dd></div>{order.status !== "PENDING" && <div className="flex justify-between"><dt className="text-muted-foreground">{locale === "fr" ? "Taxes" : "Tax"}</dt><dd className="tabular-nums">{formatPrice(order.taxCents, locale)}</dd></div>}<div className="flex justify-between text-base"><dt className="font-medium">{order.status === "PENDING" ? t("estimatedTotal") : t("total")}</dt><dd className="font-serif text-xl tabular-nums">{formatPrice(order.totalCents, locale)}</dd></div>{order.status === "PENDING" && <p className="text-xs text-muted-foreground">{locale === "fr" ? "Taxes calculées à l’étape de paiement." : "Applicable taxes are calculated during secure checkout."}</p>}</dl>
          </section>
          <aside className="rounded-3xl border border-border bg-card p-6 sm:p-7"><h2 className="font-serif text-xl">{t("shipTo")}</h2><address className="mt-4 text-sm not-italic leading-6 text-muted-foreground">{order.name}<br />{order.address}<br />{order.city}{order.province ? `, ${order.province}` : ""} {order.postalCode}<br />{order.country}</address></aside>
        </div>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/store" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">{t("continueShopping")}</Link><Link href="/" className="inline-flex min-h-11 items-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:border-brand hover:text-brand">{t("backToStore")}</Link></div>
      </div>
    </div>
  );
}
