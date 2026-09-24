"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { formatLongDate, formatTime, formatPrice, formatDuration } from "@/lib/datetime";

/**
 * Admin "Requests" view. Lists appointment requests PENDING-first with a status filter, and
 * lets the salon confirm (optionally adjusting day/time/specialist) or decline each one.
 *
 * Data and every mutation go through /api/admin/* routes, which authorize the session and
 * check the CSRF token server-side; this component never trusts its own state. Times come
 * from the API already localized to the salon timezone (dayKey + startMinutes) and the ISO
 * instants are formatted for display with the same DST-correct helpers.
 */

type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED";

const FILTERS: StatusFilter[] = ["ALL", "PENDING", "CONFIRMED", "DECLINED", "CANCELLED"];

interface ServiceInfo {
  id: string;
  name: string;
  duration: number;
  price?: number;
  bufferMin?: number;
}
interface StaffInfo {
  id: string;
  name: string;
  role?: string;
}
interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
}
interface RequestItem {
  id: string;
  ref: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  declined: boolean;
  startUtc: string;
  endUtc: string;
  dayKey: string;
  startMinutes: number;
  endMinutes: number;
  priceTotal: number;
  note: string | null;
  createdAt: string;
  service: ServiceInfo;
  staff: StaffInfo;
  customer: CustomerInfo;
}

interface ListResponse {
  ok: true;
  bookings: RequestItem[];
  staff: StaffInfo[];
}

type ConfirmState = {
  type: "confirm";
  booking: RequestItem;
  dayKey: string;
  timeValue: string;
  staffId: string;
  conflict: string | null;
  error: string | null;
  submitting: boolean;
};
type DeclineState = {
  type: "decline";
  booking: RequestItem;
  reason: string;
  error: string | null;
  submitting: boolean;
};
type DialogState = ConfirmState | DeclineState | null;

interface RequestsViewProps {
  locale: string;
}

/** The CSRF token lives in sessionStorage after sign-in; fall back to the session route. */
async function getCsrfToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    const stored = window.sessionStorage.getItem("admin-csrf");
    if (stored) return stored;
  }
  try {
    const res = await fetch("/api/admin/session");
    if (!res.ok) return null;
    return ((await res.json()) as { csrfToken?: string }).csrfToken ?? null;
  } catch {
    return null;
  }
}

function minutesToInputValue(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeValueToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function RequestsView({ locale }: RequestsViewProps) {
  const t = useTranslations("Admin");
  const tValidation = useTranslations("Validation");

  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [bookings, setBookings] = useState<RequestItem[] | null>(null);
  const [staff, setStaff] = useState<StaffInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(
    async (filter: StatusFilter) => {
      setLoading(true);
      setError(null);
      setSessionExpired(false);
      try {
        const res = await fetch(`/api/admin/requests?status=${filter}`, { cache: "no-store" });
        if (res.status === 401) {
          setSessionExpired(true);
          setBookings(null);
          return;
        }
        if (!res.ok) throw new Error("request failed");
        const json = (await res.json()) as ListResponse;
        setBookings(json.bookings);
        setStaff(json.staff);
      } catch {
        setError(t("errorHint"));
        setBookings(null);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void load(status);
  }, [status, load]);


  function openConfirm(booking: RequestItem) {
    setNotice(null);
    setDialog({
      type: "confirm",
      booking,
      dayKey: booking.dayKey,
      timeValue: minutesToInputValue(booking.startMinutes),
      staffId: booking.staff.id,
      conflict: null,
      error: null,
      submitting: false,
    });
  }

  function openDecline(booking: RequestItem) {
    setNotice(null);
    setDialog({
      type: "decline",
      booking,
      reason: "",
      error: null,
      submitting: false,
    });
  }

  function closeDialog() {
    setDialog((current) => {
      if (current && !current.submitting) return null;
      return current;
    });
  }

  async function submitConfirm(state: ConfirmState) {
    const minutes = timeValueToMinutes(state.timeValue);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(state.dayKey) || minutes === null) {
      setDialog({ ...state, error: tValidation("form") });
      return;
    }
    setDialog({ ...state, submitting: true, error: null, conflict: null });
    const token = await getCsrfToken();
    if (!token) {
      setSessionExpired(true);
      setDialog({ ...state, submitting: false });
      return;
    }
    try {
      const res = await fetch(`/api/admin/requests/${state.booking.id}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-csrf": token },
        body: JSON.stringify({ dayKey: state.dayKey, startMinutes: minutes, staffId: state.staffId }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        alreadyConfirmed?: boolean;
        message?: string;
      };

      if (res.status === 401) {
        setSessionExpired(true);
        setDialog({ ...state, submitting: false });
        return;
      }
      if (res.status === 409) {
        // Overlaps another CONFIRMED booking: keep the dialog open so the admin can pick a
        // different time (or switch to decline) without losing the request context.
        setDialog({
          ...state,
          submitting: false,
          conflict: json.message ?? t("conflictHint"),
        });
        return;
      }
      if (!res.ok) {
        setDialog({
          ...state,
          submitting: false,
          error: json.message ?? t("errorHint"),
        });
        return;
      }

      setDialog(null);
      setNotice(json.alreadyConfirmed ? t("alreadyConfirmedNotice") : t("confirmedNotice"));
      void load(status);
    } catch {
      setDialog({ ...state, submitting: false, error: t("errorHint") });
    }
  }

  async function submitDecline(state: DeclineState) {
    setDialog({ ...state, submitting: true, error: null });
    const token = await getCsrfToken();
    if (!token) {
      setSessionExpired(true);
      setDialog({ ...state, submitting: false });
      return;
    }
    try {
      const res = await fetch(`/api/admin/requests/${state.booking.id}/decline`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-csrf": token },
        body: JSON.stringify({ reason: state.reason.trim() || undefined }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };

      if (res.status === 401) {
        setSessionExpired(true);
        setDialog({ ...state, submitting: false });
        return;
      }
      if (!res.ok) {
        setDialog({ ...state, submitting: false, error: json.message ?? t("errorHint") });
        return;
      }

      setDialog(null);
      setNotice(t("declinedNotice"));
      void load(status);
    } catch {
      setDialog({ ...state, submitting: false, error: t("errorHint") });
    }
  }

  if (sessionExpired) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-800 dark:bg-[#1a1512]">
        <p className="text-sm font-medium text-stone-900 dark:text-stone-50">{t("sessionExpired")}</p>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t("sessionExpiredHint")}</p>
        <a
          href={`/${locale}/admin/login`}
          className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {t("signInAgain")}
        </a>
      </div>
    );
  }

  const emptyKey =
    status === "ALL"
      ? "emptyAll"
      : status === "PENDING"
        ? "emptyPending"
        : status === "CONFIRMED"
          ? "emptyConfirmed"
          : status === "DECLINED"
            ? "emptyDeclined"
            : "emptyCancelled";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label={t("filterLabel")}
          className="flex flex-wrap gap-2 rounded-xl border border-stone-200 bg-white p-1.5 dark:border-stone-800 dark:bg-[#1a1512]"
        >
          {FILTERS.map((f) => {
            const active = f === status;
            const labelKey =
              f === "ALL"
                ? "filterAll"
                : f === "PENDING"
                  ? "filterPending"
                  : f === "CONFIRMED"
                    ? "filterConfirmed"
                    : f === "DECLINED"
                      ? "filterDeclined"
                      : "filterCancelled";
            return (
              <button
                key={f}
                type="button"
                aria-pressed={active}
                onClick={() => setStatus(f)}
                className={
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 " +
                  (active
                    ? "bg-brand-600 text-white"
                    : "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800")
                }
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {notice}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm dark:border-red-800 dark:bg-red-950/40">
          <p className="font-medium text-red-700 dark:text-red-300">{t("errorTitle")}</p>
          <p className="mt-0.5 text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void load(status)}
            className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/60"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {loading ? (
        <ul className="space-y-3" aria-busy="true" aria-label={t("loadingRequests")}>
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="animate-pulse rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-[#1a1512]"
            >
              <div className="h-4 w-1/3 rounded bg-stone-200 dark:bg-stone-800" />
              <div className="mt-3 h-3 w-2/3 rounded bg-stone-200 dark:bg-stone-800" />
              <div className="mt-2 h-3 w-1/2 rounded bg-stone-200 dark:bg-stone-800" />
            </li>
          ))}
        </ul>
      ) : bookings && bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center dark:border-stone-700 dark:bg-[#1a1512]">
          <p className="text-sm text-stone-600 dark:text-stone-400">{t(emptyKey)}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings?.map((b) => (
            <RequestCard
              key={b.id}
              booking={b}
              locale={locale}
              onConfirm={openConfirm}
              onDecline={openDecline}
            />
          ))}
        </ul>
      )}

      {dialog?.type === "confirm" && (
        <ConfirmRequestDialog
          state={dialog}
          staff={staff}
          onChange={(patch) => setDialog((d) => (d && d.type === "confirm" ? { ...d, ...patch } : d))}
          onClose={closeDialog}
          onSubmit={submitConfirm}
          onDeclineInstead={(b) => openDecline(b)}
        />
      )}
      {dialog?.type === "decline" && (
        <DeclineRequestDialog
          state={dialog}
          onChange={(patch) => setDialog((d) => (d && d.type === "decline" ? { ...d, ...patch } : d))}
          onClose={closeDialog}
          onSubmit={submitDecline}
        />
      )}
    </div>
  );
}

const BADGE_CLASSES: Record<string, string> = {
  PENDING:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  CONFIRMED:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  CANCELLED:
    "border-stone-300 bg-stone-100 text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300",
};

function statusLabel(status: string, declined: boolean, t: (k: string) => string): string {
  if (status === "CANCELLED" && declined) return t("statusDeclined");
  if (status === "PENDING") return t("statusPending");
  if (status === "CONFIRMED") return t("statusConfirmed");
  return t("statusCancelled");
}

function RequestCard({
  booking,
  locale,
  onConfirm,
  onDecline,
}: {
  booking: RequestItem;
  locale: string;
  onConfirm: (b: RequestItem) => void;
  onDecline: (b: RequestItem) => void;
}) {
  const t = useTranslations("Admin");
  const start = new Date(booking.startUtc);
  const end = new Date(booking.endUtc);
  const declined = booking.status === "CANCELLED" && booking.declined;
  const badge = BADGE_CLASSES[booking.status] ?? BADGE_CLASSES.CANCELLED;
  const canConfirm = booking.status === "PENDING";
  const canCancel = booking.status === "CONFIRMED";

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1a1512]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
                badge
              }
            >
              {statusLabel(booking.status, declined, t)}
            </span>
            <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-50">
              {booking.service.name}
            </h3>
            <span className="text-sm text-stone-500 dark:text-stone-400">
              {formatDuration(booking.service.duration, locale)}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
            <span className="font-medium">{t("specialist")}:</span> {booking.staff.name}
            <span className="mx-2 text-stone-300 dark:text-stone-700">|</span>
            <span className="font-medium">{t("when")}:</span>{" "}
            {formatLongDate(start, locale)} {formatTime(start, locale)} &ndash;{" "}
            {formatTime(end, locale)}
          </p>
          <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
            <span className="font-medium">{t("price")}:</span> {formatPrice(booking.priceTotal, locale)}
            <span className="mx-2 text-stone-300 dark:text-stone-700">|</span>
            <span className="font-medium">{t("bookingRef")}:</span> {booking.ref}
          </p>
        </div>
        {(canConfirm || canCancel) && (
          <div className="flex shrink-0 gap-2">
            {canConfirm && (
              <button
                type="button"
                onClick={() => onConfirm(booking)}
                className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {t("confirmButton")}
              </button>
            )}
            <button
              type="button"
              onClick={() => onDecline(booking)}
              className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              {canCancel ? t("cancelBooking") : t("declineButton")}
            </button>
          </div>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 border-t border-stone-100 pt-3 text-sm sm:grid-cols-2 dark:border-stone-800">
        <div>
          <dt className="inline font-medium text-stone-600 dark:text-stone-400">{t("customer")}: </dt>
          <dd className="inline text-stone-900 dark:text-stone-100">{booking.customer.name}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-stone-600 dark:text-stone-400">{t("phone")}: </dt>
          <dd className="inline">
            <a
              href={`tel:${booking.customer.phone.replace(/[^+\d]/g, "")}`}
              className="text-brand-600 hover:underline dark:text-brand-400"
            >
              {booking.customer.phone}
            </a>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline font-medium text-stone-600 dark:text-stone-400">{t("email")}: </dt>
          <dd className="inline">
            <a
              href={`mailto:${booking.customer.email}`}
              className="text-brand-600 hover:underline dark:text-brand-400"
            >
              {booking.customer.email}
            </a>
          </dd>
        </div>
        {booking.note && (
          <div className="sm:col-span-2">
            <dt className="inline font-medium text-stone-600 dark:text-stone-400">{t("note")}: </dt>
            <dd className="inline whitespace-pre-wrap text-stone-900 dark:text-stone-100">
              {booking.note}
            </dd>
          </div>
        )}
      </dl>
    </li>
  );
}

/**
 * Native <dialog> gives focus management, Escape-to-close and inert backdrop for free, which
 * keeps the confirm/decline flows keyboard accessible without a dependency.
 */
function ConfirmRequestDialog({
  state,
  staff,
  onChange,
  onClose,
  onSubmit,
  onDeclineInstead,
}: {
  state: ConfirmState;
  staff: StaffInfo[];
  onChange: (patch: Partial<ConfirmState>) => void;
  onClose: () => void;
  onSubmit: (s: ConfirmState) => void;
  onDeclineInstead: (b: RequestItem) => void;
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
      aria-labelledby="confirm-title"
      className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-xl dark:border-stone-800 dark:bg-[#1a1512] dark:text-stone-50"
    >
      <h2 id="confirm-title" className="font-serif text-xl font-semibold">
        {t("confirmTitle")}
      </h2>
      <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">{t("confirmHint")}</p>

      {state.conflict && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <p className="font-semibold">{t("conflictTitle")}</p>
          <p className="mt-0.5">{state.conflict}</p>
          <p className="mt-1.5">{t("conflictHint")}</p>
        </div>
      )}
      {state.error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(state);
        }}
      >
        <div>
          <label
            htmlFor="confirm-date"
            className="block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            {t("dateLabel")}
          </label>
          <input
            id="confirm-date"
            type="date"
            value={state.dayKey}
            required
            onChange={(e) => onChange({ dayKey: e.target.value, conflict: null })}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-stone-700 dark:bg-[#211b16]"
          />
        </div>
        <div>
          <label
            htmlFor="confirm-time"
            className="block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            {t("timeLabel")}
          </label>
          <input
            id="confirm-time"
            type="time"
            value={state.timeValue}
            required
            onChange={(e) => onChange({ timeValue: e.target.value, conflict: null })}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-stone-700 dark:bg-[#211b16]"
          />
        </div>
        <div>
          <label
            htmlFor="confirm-staff"
            className="block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            {t("staffLabel")}
          </label>
          <select
            id="confirm-staff"
            value={state.staffId}
            onChange={(e) => onChange({ staffId: e.target.value, conflict: null })}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-stone-700 dark:bg-[#211b16]"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => onDeclineInstead(state.booking)}
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {t("declineInstead")}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={state.submitting}
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={state.submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.submitting ? t("confirming") : t("confirmSubmit")}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function DeclineRequestDialog({
  state,
  onChange,
  onClose,
  onSubmit,
}: {
  state: DeclineState;
  onChange: (patch: Partial<DeclineState>) => void;
  onClose: () => void;
  onSubmit: (s: DeclineState) => void;
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
      aria-labelledby="decline-title"
      className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-xl dark:border-stone-800 dark:bg-[#211b16] dark:text-stone-50"
    >
      <h2 id="decline-title" className="font-serif text-xl font-semibold">
        {t("declineTitle")}
      </h2>
      <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">{t("declineHint")}</p>
      {state.error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(state);
        }}
      >
        <div>
          <label
            htmlFor="decline-reason"
            className="block text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            {t("reasonLabel")} <span className="font-normal text-stone-500">({t("optional")})</span>
          </label>
          <textarea
            id="decline-reason"
            value={state.reason}
            rows={3}
            maxLength={500}
            placeholder={t("reasonPlaceholder")}
            onChange={(e) => onChange({ reason: e.target.value })}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-stone-700 dark:bg-[#211b16]"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={state.submitting}
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={state.submitting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.submitting ? t("declining") : t("declineSubmit")}
          </button>
        </div>
      </form>
    </dialog>
  );
}

