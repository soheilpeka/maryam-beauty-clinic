"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { useCart } from "@/components/store/cart-context";
import { useCartQuote } from "@/components/store/use-cart-quote";
import { formatPrice } from "@/lib/datetime";
import { EditorialHeading, EditorialEmpty } from "@/components/editorial";

export default function CheckoutPage() {
  const t = useTranslations("Store");
  const locale = useLocale();
  const router = useRouter();
  const { lines, ready, clear } = useCart();
  const { quote, quoteError, refresh } = useCartQuote(lines, ready, locale);
  const canOrder = Boolean(quote?.enabled && quote.lines.length && quote.lines.every(line => line.available));
  const [attemptId, setAttemptId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "Quebec",
    postalCode: "",
    country: "Canada",
    note: "",
  });

  useEffect(() => {
    setAttemptId(crypto.randomUUID());
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attemptId || submitting || !canOrder) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          locale,
          idempotencyKey: attemptId,
          lines: lines.map(({ slug, quantity }) => ({ slug, quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error === "INSUFFICIENT_STOCK" || data.error === "PRODUCT_UNAVAILABLE" ? t("stockChanged") : data.error === "STORE_CLOSED" ? t("storeClosed") : t("checkoutError"));
        refresh();
        return;
      }
      clear();
      router.push(`/store/order/${data.order.ref}?t=${encodeURIComponent(new URL(data.orderUrl).searchParams.get("t") ?? "")}`);
    } catch {
      setError(t("checkoutError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return <div className="editorial-page editorial-container" aria-busy="true"><EditorialHeading eyebrow={t("cart")} title={t("checkoutTitle")} /><p role="status">{t("loading")}</p></div>;
  }

  if (lines.length === 0) {
    return (
      <div className="editorial-page editorial-container">
        <EditorialHeading eyebrow={t("checkoutEyebrow")} title={t("checkoutTitle")} />
        <EditorialEmpty eyebrow="Maryam C Beauté" title={t("cartEmpty")} body={t("checkoutEmpty")} href="/store" action={t("browseProducts")} image />
      </div>
    );
  }

  return (
    <div className="editorial-page checkout-editorial">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">{t("checkoutEyebrow")}</p>
          <h1 className="display-heading mt-3 text-4xl sm:text-5xl">{t("checkoutTitle")}</h1>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">{t("checkoutSubtitle")}</p>
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <form onSubmit={submit} className="space-y-8">
            {quoteError && <p role="alert" className="text-sm text-destructive">{t("quoteError")} <button type="button" onClick={refresh} className="min-h-11 underline">{t("retryQuote")}</button></p>}
            {quote && !canOrder && <p role="alert" className="text-sm text-destructive">{quote.enabled ? t("stockChanged") : t("storeClosed")} <Link href="/store/cart" className="underline">{t("returnToCart")}</Link></p>}
            {error && <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
            <fieldset className="checkout-fields">
              <legend className="px-2 font-serif text-xl text-foreground">{t("contactDetails")}</legend>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Field label={t("fullName")} name="name" value={form.name} required onChange={(v) => update("name", v)} />
                <Field label={t("email")} name="email" type="email" value={form.email} required onChange={(v) => update("email", v)} />
                <Field label={t("phone")} name="phone" type="tel" value={form.phone} required onChange={(v) => update("phone", v)} />
              </div>
            </fieldset>

            <fieldset className="checkout-fields">
              <legend className="px-2 font-serif text-xl text-foreground">{t("shippingAddress")}</legend>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label={t("address")} name="address" value={form.address} required onChange={(v) => update("address", v)} /></div>
                <Field label={t("city")} name="city" value={form.city} required onChange={(v) => update("city", v)} />
                <Field label={t("province")} name="province" value={form.province} onChange={(v) => update("province", v)} />
                <Field label={t("postalCode")} name="postalCode" value={form.postalCode} onChange={(v) => update("postalCode", v)} />
                <Field label={t("country")} name="country" value={form.country} required onChange={(v) => update("country", v)} />
                <div className="sm:col-span-2">
                  <label htmlFor="order-note" className="block text-sm font-medium text-foreground">{t("note")} <span className="font-normal text-muted-foreground">({t("optional")})</span></label>
                  <textarea id="order-note" name="note" rows={3} value={form.note} onChange={(event) => update("note", event.target.value)} className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-brand focus:outline-none" />
                </div>
              </div>
            </fieldset>

            <div className="rounded-3xl border border-brand/20 bg-brand-soft/40 p-5 text-sm text-foreground">
              <p className="font-medium">{t("paymentDemoTitle")}</p>
              <p className="mt-2 leading-6 text-muted-foreground">{t("paymentDemoBody")}</p>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/store/cart" className="text-center text-sm font-medium text-muted-foreground hover:text-brand">{t("returnToCart")}</Link>
              <button type="submit" disabled={submitting || !attemptId || !canOrder} className="min-h-12 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? t("placingOrder") : t("placeOrder")}
              </button>
            </div>
          </form>

          <aside className="commerce-summary h-fit lg:sticky lg:top-24">
            <h2 className="font-serif text-xl">{t("orderSummary")}</h2>
            {!quote && !quoteError && <p role="status" className="mt-4 text-sm">{t("loading")}</p>}
            <ul className="mt-5 space-y-4">
              {lines.map(line => { const fresh = quote?.lines.find(item => item.slug === line.slug); return <li key={line.slug} className="flex justify-between gap-4 text-sm"><span className="min-w-0 text-muted-foreground">{fresh?.name ?? line.name} × {line.quantity}</span><span className="shrink-0 font-medium tabular-nums">{fresh?.lineTotalCents == null ? "—" : formatPrice(fresh.lineTotalCents, locale)}</span></li>; })}
            </ul>
            <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
              <div className="flex justify-between gap-4"><dt>{t("subtotal")}</dt><dd>{quote ? formatPrice(quote.subtotalCents, locale) : "—"}</dd></div>
              <div className="flex justify-between gap-4"><dt>{t("shipping")}</dt><dd>{quote ? (quote.shippingCents ? formatPrice(quote.shippingCents, locale) : t("free")) : "—"}</dd></div>
              <div className="flex justify-between gap-4 text-base"><dt>{t("estimatedTotal")}</dt><dd className="font-serif text-xl tabular-nums">{quote ? formatPrice(quote.totalCents, locale) : "—"}</dd></div>
            </dl>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, type = "text", value, required, onChange }: { label: string; name: string; type?: string; value: string; required?: boolean; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor={`checkout-${name}`} className="block text-sm font-medium text-foreground">{label}{required ? <span aria-hidden="true"> *</span> : null}</label>
      <input id={`checkout-${name}`} name={name} type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-brand focus:outline-none" />
    </div>
  );
}
