"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/datetime";
import { getCsrfToken } from "@/lib/admin-client";
import type { OrderView } from "@/lib/store-views";

const STATUS_OPTIONS = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "PAYMENT_FAILED", "EXPIRED", "REFUNDED"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

export function OrdersView({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [status, setStatus] = useState<Status | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(orders.length / 12));
  const currentPage = Math.min(page, pages);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setOrders(((await response.json()) as { orders: OrderView[] }).orders ?? []);
      setPage(1);
    } catch { setError(t("errorHint")); }
    finally { setLoading(false); }
  }, [query, status, t]);

  useEffect(() => { void load(); }, [load]);

  async function updateOrder(id: string, next: Status) {
    if (busy) return;
    setBusy(true); setError(null); setNotice("");
    try {
    const csrf = await getCsrfToken();
    if (!csrf) { setError(t("sessionExpired")); return; }
    const response = await fetch(`/api/admin/orders/${id}/status`, { method: "PATCH", headers: { "content-type": "application/json", "x-admin-csrf": csrf }, body: JSON.stringify({ status: next }) });
    if (!response.ok) { const body = await response.json().catch(() => ({})); setError(body.message ?? t("errorHint")); return; }
    void load();
    setNotice(locale === "fr" ? "Statut de la commande mis à jour." : "Order status updated.");
    } catch { setError(t("errorHint")); } finally { setBusy(false); }
  }

  const statusLabel = (value: string) => {
    const key = value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
    return t(("status" + key + "Order") as never);
  };

  return <div>
    {notice && <p role="status" className="mb-4 rounded-lg border border-border p-4 text-sm">{notice}</p>}
    <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]"><label className="block"><span className="sr-only">{t("searchOrders")}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchOrders")} className="min-h-11 w-full rounded-lg border border-border bg-card px-4 py-2 text-sm" /></label><label className="block"><span className="sr-only">{t("filterOrders")}</span><select value={status} onChange={(event) => setStatus(event.target.value as Status | "ALL")} className="min-h-11 w-full rounded-lg border border-border bg-card px-4 py-2 text-sm"><option value="ALL">{t("allOrders")}</option>{STATUS_OPTIONS.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label></div>
    {error && <p role="alert" className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
    {loading ? <div aria-busy="true" className="space-y-3"><div className="h-24 animate-pulse rounded-2xl bg-muted" /><div className="h-24 animate-pulse rounded-2xl bg-muted" /></div> : orders.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">{t("noOrders")}</div> : <ul className="space-y-3">{orders.slice((currentPage - 1) * 12, currentPage * 12).map((order) => <OrderRow key={order.id} order={order} locale={locale} statusLabel={statusLabel} busy={busy} onStatus={(next) => void updateOrder(order.id, next)} />)}</ul>}
    {pages > 1 && <nav aria-label={locale === "fr" ? "Pagination des commandes" : "Order pagination"} className="mt-6 flex items-center justify-between"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>{locale === "fr" ? "Précédent" : "Previous"}</button><span>{currentPage} / {pages}</span><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>{locale === "fr" ? "Suivant" : "Next"}</button></nav>}
  </div>;
}

function OrderRow({ order, locale, statusLabel, busy, onStatus }: { order: OrderView; locale: string; busy: boolean; statusLabel: (status: string) => string; onStatus: (status: Status) => void }) {
  const t = useTranslations("Admin");
  const nextOptions = useMemo<Status[]>(() => {
    if (order.status === "PENDING") return ["CANCELLED"];
    if (order.status === "PAID") return ["PROCESSING", "CANCELLED", "REFUNDED"];
    if (order.status === "PROCESSING") return ["SHIPPED", "CANCELLED", "REFUNDED"];
    if (order.status === "SHIPPED") return ["DELIVERED", "REFUNDED"];
    if (order.status === "DELIVERED") return ["REFUNDED"];
    return [];
  }, [order.status]);
  return <li className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-serif text-lg font-semibold">{order.ref}</p><p className="mt-1 text-sm text-muted-foreground">{order.name} · {order.email}</p><p className="mt-2 text-sm"><span className="font-medium tabular-nums">{formatPrice(order.totalCents, locale)}</span><span className="mx-2 text-muted-foreground">·</span><span className="text-muted-foreground">{new Date(order.createdAt).toLocaleDateString(locale)}</span></p></div><span className="rounded-full border border-border px-3 py-1 text-xs font-semibold">{statusLabel(order.status)}</span></div><details className="mt-4 border-t border-border pt-4"><summary className="cursor-pointer text-sm font-medium text-brand">{t("viewOrder")}</summary><div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]"><div><h3 className="text-sm font-semibold">{t("items")}</h3><ul className="mt-2 space-y-2 text-sm">{order.items.map((item) => <li key={item.id} className="flex justify-between gap-4"><span className="text-muted-foreground">{item.name} × {item.quantity}</span><span className="tabular-nums">{formatPrice(item.lineTotalCents, locale)}</span></li>)}</ul><h3 className="mt-5 text-sm font-semibold">{t("customerDetails")}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{order.phone}<br />{order.address}<br />{order.city}{order.province ? `, ${order.province}` : ""} {order.postalCode}<br />{order.country}</p></div><div>{nextOptions.length > 0 ? <label className="block text-sm"><span className="font-medium">{t("updateStatus")}</span><select disabled={busy} value="" onChange={(event) => { if (event.target.value) onStatus(event.target.value as Status); }} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">{statusLabel(order.status)}</option>{nextOptions.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label> : <p className="text-sm text-muted-foreground">{order.inventoryRestoredAt ? t("inventoryRestored") : ""}</p>}</div></div></details></li>;
}
