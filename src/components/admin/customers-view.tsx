"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { formatPrice, formatLongDate, formatTime } from "@/lib/datetime";

/**
 * Customer book: searchable list of everyone who has ever requested an appointment, with
 * their booking count, last visit and full history. Data comes from the admin API, which
 * authorizes the session server-side; this component never trusts its own copy.
 */

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  createdAt: string;
  bookingCount: number;
  lastVisit: { startUtc: string; status: string } | null;
}

interface BookingRow {
  id: string;
  ref: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  startUtc: string;
  endUtc: string;
  priceTotal: number;
  note: string | null;
  service: { name: string; nameFr?: string; duration: number };
  staff: { name: string };
}

interface CustomerDetail {
  ok: true;
  customer: CustomerRow & { bookings: BookingRow[]; historyOffset: number; hasMoreBookings: boolean };
}

interface CustomerList {
  ok: true;
  customers: CustomerRow[];
  total: number;
  hasMore: boolean;
  offset: number;
}

const BADGE_CLASSES: Record<string, string> = {
  PENDING:
    "border-neutral-300 bg-neutral-50 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300",
  CONFIRMED:
    "border-neutral-300 bg-neutral-50 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300",
  CANCELLED:
    "border-border bg-neutral-100 text-foreground dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  COMPLETED:
    "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  NO_SHOW:
    "border-neutral-300 bg-neutral-50 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300",
};

export function CustomersView({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail["customer"] | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);

  const load = useCallback(
    async (q: string, requestedOffset = 0) => {
      const request = ++listRequest.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "50", offset: String(requestedOffset) });
        if (q) params.set("q", q);
        const res = await fetch(`/api/admin/customers?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("customers failed");
        const json = (await res.json()) as CustomerList;
        if (request !== listRequest.current) return;
        setCustomers(json.customers);
        setTotal(json.total);
        setOffset(json.offset);
        setHasMore(json.hasMore);
      } catch {
        if (request !== listRequest.current) return;
        setError(t("errorHint"));
        setCustomers(null);
      } finally {
        if (request === listRequest.current) setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void load("");
    return () => { listRequest.current++; detailRequest.current++; };
  }, [load]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedQuery(query.trim());
    void load(query.trim());
  }

  async function openDetail(id: string, historyOffset = 0) {
    const request = ++detailRequest.current;
    if (detail?.id !== id) setDetail(null);
    setDetailLoading(true); setDetailError(null);
    try {
      const res = await fetch(`/api/admin/customers/${id}?offset=${historyOffset}`, { cache: "no-store" });
      if (!res.ok) throw new Error("customer failed");
      const json = (await res.json()) as CustomerDetail;
      if (request !== detailRequest.current) return;
      setDetail(json.customer);
    } catch {
      if (request !== detailRequest.current) return;
      setDetailError(t("errorHint"));
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }

  if (loading && customers === null) {
    return (
      <div aria-busy="true" aria-label={t("loadingCustomers")} className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-border bg-card p-5 dark:border-neutral-800 dark:bg-card"
          >
            <div className="h-4 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="mt-3 h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
        ))}
      </div>
    );
  }

  if (error && customers === null) {
    return (
      <div className="rounded-md border border-neutral-300 bg-neutral-50 px-3 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950/40">
        <p className="font-medium text-neutral-700 dark:text-neutral-300">{t("errorTitle")}</p>
        <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">{error}</p>
        <button
          type="button"
          onClick={() => void load(submittedQuery, offset)}
          className="mt-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-950/60"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <label htmlFor="customer-search" className="sr-only">
          {t("searchCustomers")}
        </label>
        <input
          id="customer-search"
          type="search"
          value={query}
          maxLength={100}
          placeholder={t("searchCustomers")}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-neutral-700 dark:bg-background"
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {t("search")}
        </button>
      </form>

      <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
        {total} {total === 1 ? t("customerWord") : t("customersWord")}
        {submittedQuery ? ` - ${t("searchFor", { q: submittedQuery })}` : ""}
      </p>
      {!detail && detailError && <p role="alert" className="mb-4 text-sm text-destructive">{detailError}</p>}
      {!detail && detailLoading && <p role="status">{t("loadingCustomers")}</p>}

      {customers && customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center dark:border-neutral-700 dark:bg-card">
          <p className="text-sm text-muted-foreground dark:text-neutral-400">
            {submittedQuery ? t("emptyCustomersSearch") : t("emptyCustomers")}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {customers?.map((customer) => (
            <li
              key={customer.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm dark:border-neutral-800 dark:bg-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-serif text-lg font-semibold text-foreground dark:text-neutral-50">
                    {customer.name}
                  </h3>
                  <p className="mt-1 text-sm text-foreground dark:text-neutral-300">
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-brand hover:underline dark:text-brand"
                    >
                      {customer.email}
                    </a>
                    <span className="mx-2 text-neutral-300 dark:text-foreground">|</span>
                    <a
                      href={`tel:${customer.phone.replace(/[^+\d]/g, "")}`}
                      className="text-brand hover:underline dark:text-brand"
                    >
                      {customer.phone}
                    </a>
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {customer.bookingCount} {t("bookingsWord")}
                    {customer.lastVisit &&
                      ` - ${t("lastVisit")} ${formatLongDate(new Date(customer.lastVisit.startUtc), locale)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void openDetail(customer.id)}
                  className="rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {t("history")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > 50 && <nav aria-label={locale === "fr" ? "Pagination des clients" : "Customer pagination"} className="mt-5 flex items-center justify-between gap-3"><button type="button" disabled={loading || offset === 0} onClick={() => void load(submittedQuery, Math.max(0, offset - 50))} className="min-h-11 border border-border px-3 disabled:opacity-40">{locale === "fr" ? "Précédent" : "Previous"}</button><span>{Math.floor(offset / 50) + 1} / {Math.ceil(total / 50)}</span><button type="button" disabled={loading || !hasMore} onClick={() => void load(submittedQuery, offset + 50)} className="min-h-11 border border-border px-3 disabled:opacity-40">{locale === "fr" ? "Suivant" : "Next"}</button></nav>}
      {detail && <CustomerDetailDialog customer={detail} locale={locale} loading={detailLoading} error={detailError} onPage={pageOffset => void openDetail(detail.id, pageOffset)} onClose={() => { detailRequest.current++; setDetail(null); setDetailLoading(false); setDetailError(null); }} />}
    </div>
  );
}

function CustomerDetailDialog({
  customer,
  locale,
  onClose,
  loading,
  error,
  onPage,
}: {
  customer: CustomerDetail["customer"];
  locale: string;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  onPage: (offset: number) => void;
}) {
  const t = useTranslations("Admin");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="customer-detail-title"
      aria-busy={loading}
      className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl dark:border-neutral-800 dark:bg-card dark:text-neutral-50"
    >
      <h2 id="customer-detail-title" className="font-serif text-xl font-semibold">
        {customer.name}
      </h2>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <p className="mt-1 text-sm text-muted-foreground dark:text-neutral-400">
        <a href={`mailto:${customer.email}`} className="text-brand hover:underline dark:text-brand">
          {customer.email}
        </a>
        <span className="mx-2 text-neutral-300 dark:text-foreground">|</span>
        <a href={`tel:${customer.phone.replace(/[^+\d]/g, "")}`} className="text-brand hover:underline dark:text-brand">
          {customer.phone}
        </a>
      </p>

      <h3 className="mt-5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        {t("bookingHistory")} ({customer.bookings.length})
      </h3>
      {customer.bookings.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground dark:text-neutral-400">{t("noBookings")}</p>
      ) : (
        <ul className="mt-3 max-h-80 space-y-3 overflow-auto">
          {customer.bookings.map((b) => {
            const start = new Date(b.startUtc);
            const end = new Date(b.endUtc);
            return (
              <li
                key={b.id}
                className="rounded-xl border border-border p-3 text-sm dark:border-neutral-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold " +
                      (BADGE_CLASSES[b.status] ?? BADGE_CLASSES.CANCELLED)
                    }
                  >
                    {t(`status${b.status === "NO_SHOW" ? "NoShow" : statusWordKey(b.status)}`)}
                  </span>
                  <span className="font-medium text-foreground dark:text-neutral-100">{locale === "fr" ? b.service.nameFr ?? b.service.name : b.service.name}</span>
                  <span className="text-neutral-500 dark:text-neutral-400">{b.staff.name}</span>
                </div>
                <p className="mt-1 text-foreground dark:text-neutral-300">
                  {formatLongDate(start, locale)} {formatTime(start, locale)}&ndash;{formatTime(end, locale)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {formatPrice(b.priceTotal, locale)} - {b.ref}
                </p>
                {b.note && (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground dark:text-neutral-400">
                    {b.note}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {customer.bookingCount > 50 && <nav aria-label={locale === "fr" ? "Pagination de l’historique" : "History pagination"} className="mt-5 flex items-center justify-between gap-3"><button type="button" disabled={loading || customer.historyOffset === 0} onClick={() => onPage(Math.max(0, customer.historyOffset - 50))} className="min-h-11 border border-border px-3 disabled:opacity-40">{locale === "fr" ? "Précédent" : "Previous"}</button><span>{Math.floor(customer.historyOffset / 50) + 1} / {Math.ceil(customer.bookingCount / 50)}</span><button type="button" disabled={loading || !customer.hasMoreBookings} onClick={() => onPage(customer.historyOffset + 50)} className="min-h-11 border border-border px-3 disabled:opacity-40">{locale === "fr" ? "Suivant" : "Next"}</button></nav>}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {t("close")}
        </button>
      </div>
    </dialog>
  );
}

function statusWordKey(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "CONFIRMED":
      return "Confirmed";
    case "COMPLETED":
      return "Completed";
    case "NO_SHOW":
      return "NoShow";
    default:
      return "Cancelled";
  }
}
