"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatLongDate, formatTime, formatPrice, formatDuration } from "@/lib/datetime";

interface ManageBookingProps {
  booking: {
    ref: string;
    status: string;
    startUtc: string;
    endUtc: string;
    priceTotal: number;
    serviceName: string;
    staffName: string;
    durationMin: number;
    customerName: string;
    customerEmail: string;
  };
  token: string;
  locale: string;
}

/**
 * The customer's secure manage page. Public rescheduling was removed together with the
 * slot engine: the customer may cancel a PENDING or CONFIRMED request here, and any
 * change of time is handled by the salon at confirm time.
 */
export function ManageBooking({ booking, token, locale: _locale }: ManageBookingProps) {
  const t = useTranslations("Manage");
  const tLocale = useLocale();
  const [status, setStatus] = useState(booking.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = new Date(booking.startUtc);
  const end = new Date(booking.endUtc);

  async function cancel() {
    if (!window.confirm(t("confirmCancel"))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.ref}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("CANCELLED");
    } catch {
      setError(t("invalidLinkBody"));
    } finally {
      setBusy(false);
    }
  }

  const cancelled = status === "CANCELLED";

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-50">
          {t("title")}
        </h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            cancelled
              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              : status === "CONFIRMED"
                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          }`}
        >
          {t(`status.${status}` as never)}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {cancelled ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-[#211b16]">
          <h2 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-50">
            {t("canceledTitle")}
          </h2>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">{t("canceledBody")}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-[#211b16]">
          <dl className="space-y-3 text-sm">
            <Row label={t("bookingRef")} value={booking.ref} />
            <Row label={t("service")} value={booking.serviceName} />
            <Row label={t("specialist")} value={booking.staffName} />
            <Row
              label={t("when")}
              value={`${formatLongDate(start, tLocale)} | ${formatTime(start, tLocale)} - ${formatTime(
                end,
                tLocale,
              )}`}
            />
            <Row label={t("duration")} value={formatDuration(booking.durationMin, tLocale)} />
            <Row label={t("total")} value={`${formatPrice(booking.priceTotal, tLocale)} CAD`} />
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className="rounded-full border border-red-300 px-6 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              {busy ? "..." : t("cancel")}
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-stone-500 dark:text-stone-400">
            {t("confirmCancel")}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="text-right font-medium text-stone-900 dark:text-stone-50">{value}</dd>
    </div>
  );
}
