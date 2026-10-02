"use client";

import { useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatLongDate, formatTime, formatDuration } from "@/lib/datetime";

interface ManageBookingProps {
  booking: {
    ref: string;
    status: string;
    declined?: boolean;
    startUtc: string;
    endUtc: string;
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
  const confirmation = useRef<HTMLDialogElement>(null);
  const start = new Date(booking.startUtc);
  const end = new Date(booking.endUtc);

  async function cancel() {
    confirmation.current?.close();
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
      <dialog ref={confirmation} aria-labelledby="cancel-request-title" className="w-[min(32rem,calc(100%_-_2rem))] border border-border bg-background p-8 text-foreground">
        <h2 id="cancel-request-title" className="font-serif text-3xl">{t("cancel")}</h2>
        <p className="my-6 leading-7 text-muted-foreground">{t("confirmCancel")}</p>
        <div className="flex flex-wrap gap-5"><button type="button" onClick={() => confirmation.current?.close()} className="editorial-action">{tLocale === "fr" ? "Conserver la demande" : "Keep request"}</button><button type="button" onClick={() => void cancel()} className="editorial-action text-destructive">{t("cancel")}</button></div>
      </dialog>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="display-heading">
          {t("title")}
        </h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            cancelled
              ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-950/40 dark:text-neutral-300"
              : status === "CONFIRMED"
                ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-950/40 dark:text-neutral-300"
                : "bg-neutral-100 text-neutral-700 dark:bg-neutral-950/40 dark:text-neutral-300"
          }`}
        >
          {booking.declined && cancelled ? (tLocale === "fr" ? "Demande refusée" : "Request declined") : t(({ PENDING: "statusPending", CONFIRMED: "statusConfirmed", CANCELLED: "statusCancelled", COMPLETED: "statusCompleted" } as const)[status as "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"])}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-900 dark:bg-neutral-950/40 dark:text-neutral-300"
        >
          {error}
        </div>
      )}

      {cancelled ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-card">
          <h2 className="font-serif text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            {booking.declined ? (tLocale === "fr" ? "Demande refusée" : "Request declined") : t("canceledTitle")}
          </h2>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{booking.declined ? (tLocale === "fr" ? "Contactez le studio pour discuter d’une autre date." : "Contact the studio to discuss another date.") : t("canceledBody")}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-card">
          <dl className="space-y-3 text-sm">
            <Row label={t("bookingRef")} value={booking.ref} />
            <Row label={t("service")} value={booking.serviceName} />
            <Row label={t("specialist")} value={booking.staffName} />
            <Row
              label={t("when")}
              value={`${formatLongDate(start, tLocale)} | ${formatTime(start, tLocale)}${booking.durationMin > 0 ? ` - ${formatTime(end, tLocale)}` : ""}`}
            />
            <Row label={t("duration")} value={booking.durationMin > 0 ? formatDuration(booking.durationMin, tLocale) : t("detailsPending")} />
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => confirmation.current?.showModal()}
              disabled={busy}
              className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-950/40"
            >
              {busy ? "..." : t("cancel")}
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
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
      <dt className="text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className="text-right font-medium text-neutral-900 dark:text-neutral-50">{value}</dd>
    </div>
  );
}
