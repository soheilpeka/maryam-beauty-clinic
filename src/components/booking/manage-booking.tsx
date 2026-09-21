"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatLongDate, formatTime, formatPrice, formatDuration } from "@/lib/datetime";
import { dayKeyForDate, minutesToLabel } from "@/lib/booking-ui";

interface ManageBookingProps {
  booking: {
    ref: string;
    status: string;
    startUtc: string;
    endUtc: string;
    priceTotal: number;
    serviceName: string;
    staffName: string;
    /** Slugs are used to query the slot API, which keys availability off them */
    serviceSlug: string;
    staffSlug: string;
    durationMin: number;
    customerName: string;
    customerEmail: string;
  };
  token: string;
  locale: string;
}

function toLocalMinutesRounded(d: Date): number {
  const mins = d.getHours() * 60 + d.getMinutes();
  // Align to the 30-min grid the slot API uses.
  return Math.round(mins / 30) * 30;
}

export function ManageBooking({ booking, token, locale }: ManageBookingProps) {
  const t = useTranslations("Manage");
  const tLocale = useLocale();
  const [status, setStatus] = useState(booking.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = new Date(booking.startUtc);
  const end = new Date(booking.endUtc);

  // Reschedule state
  const [editing, setEditing] = useState(false);
  const [dayKey, setDayKey] = useState(dayKeyForDate(start));
  const [slot, setSlot] = useState<number | null>(toLocalMinutesRounded(start));
  const [slots, setSlots] = useState<number[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [whenLabel, setWhenLabel] = useState<string | null>(null);

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

  async function loadSlots(key: string) {
    setLoadingSlots(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/bookings/slots?service=${encodeURIComponent(booking.serviceSlug)}&staff=${encodeURIComponent(
          booking.staffSlug,
        )}&date=${key}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "INTERNAL");
      setSlots((data.slots ?? []).map((s: { startMinutes: number }) => s.startMinutes));
    } catch {
      setSlots([]);
      setError(t("errorSlotGone"));
    } finally {
      setLoadingSlots(false);
    }
  }

  function startReschedule() {
    setEditing(true);
    setError(null);
    setWhenLabel(null);
    void loadSlots(dayKey);
  }

  async function save() {
    if (slot === null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.ref}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, dayKey, startMinutes: slot }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "SLOT_UNAVAILABLE" || data.error === "CONFLICT") {
          setError(t("errorSlotGone"));
          await loadSlots(dayKey);
        } else {
          setError(t("invalidLinkBody"));
        }
        return;
      }
      setEditing(false);
      setWhenLabel(data.booking.whenLabel);
      setStatus(data.booking.status ?? status);
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

      {whenLabel && !editing && (
        <div
          role="status"
          className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
        >
          {t("rescheduledBody", { when: whenLabel })}
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
            <Row label="Service" value={booking.serviceName} />
            <Row label="Specialist" value={booking.staffName} />
            <Row
              label="When"
              value={`${formatLongDate(start, tLocale)} | ${formatTime(start, tLocale)} - ${formatTime(
                end,
                tLocale,
              )}`}
            />
            <Row label="Duration" value={formatDuration(booking.durationMin, tLocale)} />
            <Row label="Total" value={`${formatPrice(booking.priceTotal, tLocale)} CAD`} />
          </dl>

          {editing && (
            <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/40">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                {t("reschedule")}
              </h3>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{t("rescheduleHint")}</p>

              <div className="mt-4">
                <label
                  htmlFor="reschedule-date"
                  className="block text-xs font-medium text-stone-700 dark:text-stone-300"
                >
                  {t("newDate")}
                </label>
                <input
                  id="reschedule-date"
                  type="date"
                  value={dayKey}
                  min={dayKeyForDate(new Date())}
                  onChange={(e) => {
                    setDayKey(e.target.value);
                    setSlot(null);
                    if (e.target.value) void loadSlots(e.target.value);
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-500 focus:outline-none dark:border-stone-700 dark:bg-[#211b16] dark:text-stone-50"
                />
              </div>

              <div className="mt-4">
                <span
                  className="block text-xs font-medium text-stone-700 dark:text-stone-300"
                  id="reschedule-time-label"
                >
                  {t("newTime")}
                </span>
                {loadingSlots ? (
                  <p className="mt-2 text-sm text-stone-500 dark:text-stone-400" role="status">
                    {t("loadingSlots")}
                  </p>
                ) : slots.length === 0 ? (
                  <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{t("noSlots")}</p>
                ) : (
                  <ul
                    className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4"
                    aria-labelledby="reschedule-time-label"
                  >
                    {slots.map((m) => (
                      <li key={m}>
                        <button
                          type="button"
                          onClick={() => setSlot(m)}
                          aria-pressed={slot === m}
                          className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            slot === m
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-stone-200 bg-white text-stone-900 hover:border-brand-400 dark:border-stone-800 dark:bg-[#211b16] dark:text-stone-50"
                          }`}
                        >
                          {minutesToLabel(m, tLocale)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={save}
                  disabled={busy || slot === null}
                  className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                >
                  {busy ? t("saving") : t("save")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                  }}
                  disabled={busy}
                  className="text-sm font-medium text-stone-600 hover:text-brand-600 dark:text-stone-400"
                >
                  {t("back")}
                </button>
              </div>
            </div>
          )}

          {!editing && (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startReschedule}
                disabled={busy}
                className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-50 dark:hover:bg-stone-800"
              >
                {t("reschedule")}
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="rounded-full border border-red-300 px-6 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                {busy ? "..." : t("cancel")}
              </button>
            </div>
          )}
          {!editing && (
            <p className="mt-4 text-center text-xs text-stone-500 dark:text-stone-400">
              {t("confirmCancel")}
            </p>
          )}
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
