"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { formatDuration } from "@/lib/datetime";
import { customerSchema, flattenZodErrors } from "@/lib/validation";
import {
  minutesToLabel,
  labelForDay,
  dayKeyForDate,
  translateValidationKey,
} from "@/lib/booking-ui";
import { FormField } from "@/components/booking/form-field";

export interface ServiceOption {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  bufferMin: number;
  category: string;
}
export interface StaffOption {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string | null;
  serviceIds: string[];
}

interface BookingResult {
  ref: string;
  whenLabel: string;
  priceTotal: number;
  durationMin: number;
  service: string;
  staff: string;
  manageUrl: string;
}

type Step = "service" | "staff" | "date" | "details" | "done";
const STEP_ORDER: Step[] = ["service", "staff", "date", "details"];

/** "HH:mm" from an <input type="time"> -> minutes from midnight, or null when invalid. */
function timeToMinutes(hhmm: string): number | null {
  const parts = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!parts) return null;
  const h = Number(parts[1]);
  const m = Number(parts[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function BookingFlow({
  services,
  staff,
  initialServiceSlug,
  initialStaffSlug,
  locale,
  bookingWindowDays,
}: {
  services: ServiceOption[];
  staff: StaffOption[];
  initialServiceSlug?: string;
  initialStaffSlug?: string;
  locale: string;
  bookingWindowDays: number;
}) {
  const t = useTranslations("Booking");
  const tValidation = useTranslations("Validation");
  const tLocale = useLocale();
  const router = useRouter();

  const initialService = useMemo(
    () => services.find((s) => s.slug === initialServiceSlug) ?? null,
    [services, initialServiceSlug],
  );
  const initialStaff = useMemo(() => {
    if (!initialService) return null;
    if (initialStaffSlug === "any") return "any";
    const found = staff.find((s) => s.slug === initialStaffSlug && s.serviceIds.includes(initialService.id));
    return found ? found.id : null;
  }, [staff, initialStaffSlug, initialService]);

  const [step, setStep] = useState<Step>(initialService ? (initialStaff ? "date" : "staff") : "service");
  const [serviceId, setServiceId] = useState<string | null>(initialService?.id ?? null);
  const [staffId, setStaffId] = useState<string | null>(initialStaff);
  // Preferred date (YYYY-MM-DD) and time (HH:mm): the customer asks, the salon decides.
  const [dayKey, setDayKey] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", note: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const staffMember = useMemo(
    () => (staffId === "any" ? null : (staff.find((s) => s.id === staffId) ?? null)),
    [staff, staffId],
  );
  const stepNumber = Math.min(STEP_ORDER.indexOf(step) + 1, STEP_ORDER.length);

  const minDate = useMemo(() => dayKeyForDate(new Date()), []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + bookingWindowDays);
    return dayKeyForDate(d);
  }, [bookingWindowDays]);

  const startMinutes = timeToMinutes(time);

  function handleServiceSelect(id: string) {
    setServiceId(id);
    setStaffId(null);
    setDayKey("");
    setTime("");
    setStep("staff");
  }
  function handleStaffSelect(id: string) {
    setStaffId(id);
    setDayKey("");
    setTime("");
    setStep("date");
  }

  /** Advance from the preferred-date step to the details step. */
  function goToDetails() {
    const errs: Record<string, string> = {};
    if (!dayKey) errs.date = t("errorDateRequired");
    if (startMinutes === null) errs.time = t("errorTimeRequired");
    setFieldErrors(errs);
    if (Object.keys(errs).length === 0) setStep("details");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = customerSchema.safeParse(form);
    if (!parsed.success) {
      const translated: Record<string, string> = {};
      for (const [k, v] of Object.entries(flattenZodErrors(parsed))) {
        translated[k] = translateValidationKey(v, tValidation);
      }
      setFieldErrors(translated);
      return;
    }

    if (!service || !staffId || !dayKey || startMinutes === null) {
      setError(t("errorGeneric"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          locale,
          // "any" is resolved to a qualified specialist server-side at confirm time.
          staffId,
          dayKey,
          startMinutes,
          customer: parsed.data,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "PAST_TIME") {
          setError(t("errorPast"));
          setStep("date");
        } else if (data.fieldErrors) {
          const translated: Record<string, string> = {};
          for (const [k, v] of Object.entries(data.fieldErrors as Record<string, string>)) {
            translated[k] = translateValidationKey(v, tValidation);
          }
          setFieldErrors(translated);
        } else {
          setError(t("errorGeneric"));
        }
        return;
      }
      // The API returns the booking nested under `booking`; the manage link is top level.
      const confirmed = data.booking as {
        ref: string;
        service: string;
        staff: string;
        whenLabel: string;
        priceTotal: number;
        durationMin: number;
      };
      setResult({
        ref: confirmed.ref,
        service: confirmed.service,
        staff: confirmed.staff,
        whenLabel: confirmed.whenLabel,
        priceTotal: confirmed.priceTotal,
        durationMin: confirmed.durationMin,
        // Keep on-site navigation on the current origin, even if the email base URL is stale.
        manageUrl: typeof data.managePath === "string"
          ? data.managePath
          : (() => {
              const url = new URL(data.manageUrl as string, window.location.origin);
              return `${url.pathname}${url.search}`;
            })(),
      });
      setStep("done");
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done" && result) {
    return (
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-border bg-card p-7 text-center sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft">
          <svg
            aria-hidden="true"
            className="h-8 w-8 text-brand"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="display-heading mt-6 text-4xl sm:text-5xl">
          {t("successTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-lg leading-relaxed text-muted-foreground">
          {t("successBody", { email: form.email })}
        </p>
        <div className="mt-8 rounded-2xl border border-border bg-background p-6 text-left">
          <dl className="space-y-3 text-sm">
            <SummaryRow label={t("service")} value={result.service} />
            <SummaryRow label={t("specialist")} value={result.staff} />
            <SummaryRow label={t("date")} value={result.whenLabel} />
            <SummaryRow label={t("duration")} value={result.durationMin > 0 ? formatDuration(result.durationMin, tLocale) : t("detailsPending")} />
          </dl>
          <a
            href={result.manageUrl}
            className="mt-6 block rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            {t("manageLink")}
          </a>
        </div>
        <button
          type="button"
          onClick={() => router.push("/booking")}
          className="mt-6 text-sm font-medium text-muted-foreground hover:text-brand"
        >
          {t("bookAnother")}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <div className="booking-workspace min-w-0 rounded-[2rem] border border-border bg-card p-6 sm:p-10">
      <div className="mb-10">
        <p className="eyebrow">{t("step", { current: stepNumber, total: STEP_ORDER.length })}</p>
        <ol className="mt-6 flex items-center gap-2" aria-label={t("step", { current: stepNumber, total: STEP_ORDER.length })}>
          {STEP_ORDER.map((s, i) => (
            <li key={s} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  stepNumber > i + 1
                    ? "bg-primary"
                    : stepNumber === i + 1
                      ? "bg-brand"
                      : "bg-border"
                }`}
              />
              <span className="mt-2 hidden text-xs text-muted-foreground sm:block">
                {t(`steps.${s}`)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {step === "service" && (
        <section aria-label={t("chooseService")}>
          <h3 className="font-serif text-2xl text-foreground">
            {t("chooseService")}
          </h3>
          <ul className="mt-6 grid gap-4">
            {services.map((s) => (
              <li key={s.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => handleServiceSelect(s.id)}
                  className="group flex w-full flex-col items-start justify-between gap-5 rounded-2xl border border-border bg-background p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-black/5 sm:flex-row sm:items-center"
                >
                  <span className="min-w-0">
                    <span className="block font-serif text-xl text-foreground group-hover:text-brand">{s.name}</span>
                    {s.description && (
                      <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{s.description}</span>
                    )}
                    <span className="mt-3 block text-xs uppercase tracking-wider text-muted-foreground">
                      {s.duration > 0 ? formatDuration(s.duration, tLocale) : t("detailsPending")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === "staff" && service && (
        <section aria-label={t("chooseStaff")}>
          <h3 className="font-serif text-2xl text-foreground">
            {t("chooseStaff")}
          </h3>
          <ul className="mt-6 grid gap-4">
            <li>
              <button
                type="button"
                onClick={() => handleStaffSelect("any")}
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-background p-5 text-left transition-all hover:border-brand hover:shadow-lg hover:shadow-black/5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">
                  &starf;
                </span>
                <span>
                  <span className="block font-medium text-foreground">{t("anyStaff")}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{t("anyStaffHint")}</span>
                </span>
              </button>
            </li>
            {staff
              .filter((m) => m.serviceIds.includes(service.id))
              .map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => handleStaffSelect(m.id)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-border bg-background p-5 text-left transition-all hover:border-brand hover:shadow-lg hover:shadow-black/5"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                      {m.name.charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{m.name}</span>
                      <span className="block text-xs uppercase tracking-wide text-brand">
                        {m.role}
                      </span>
                      {m.bio && (
                        <span className="mt-1 block text-sm text-muted-foreground">{m.bio}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
          {staff.filter((m) => m.serviceIds.includes(service.id)).length === 0 && (
            <p className="mt-6 text-sm text-muted-foreground">{t("errorNoStaff")}</p>
          )}
          <BackButton onClick={() => setStep("service")} label={t("back")} />
        </section>
      )}

      {step === "date" && service && (
        <section aria-label={t("chooseDate")}>
          <h3 className="font-serif text-2xl text-foreground">
            {t("chooseDate")}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("dateHint")}</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="preferred-date"
                className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                {t("selectDate")}
              </label>
              <input
                id="preferred-date"
                type="date"
                value={dayKey}
                min={minDate}
                max={maxDate}
                required
                onChange={(e) => {
                  setDayKey(e.target.value);
                  setFieldErrors((fe) => ({ ...fe, date: "" }));
                }}
                aria-invalid={!!fieldErrors.date}
                aria-describedby={fieldErrors.date ? "preferred-date-error" : undefined}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-brand focus:outline-none"
              />
              {fieldErrors.date && (
                <p id="preferred-date-error" className="mt-2 text-sm text-destructive" role="alert">
                  {fieldErrors.date}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="preferred-time"
                className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                {t("selectTime")}
              </label>
              <input
                id="preferred-time"
                type="time"
                value={time}
                required
                onChange={(e) => {
                  setTime(e.target.value);
                  setFieldErrors((fe) => ({ ...fe, time: "" }));
                }}
                aria-invalid={!!fieldErrors.time}
                aria-describedby={fieldErrors.time ? "preferred-time-error" : undefined}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-brand focus:outline-none"
              />
              {fieldErrors.time && (
                <p id="preferred-time-error" className="mt-2 text-sm text-destructive" role="alert">
                  {fieldErrors.time}
                </p>
              )}
            </div>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <button
              type="button"
              onClick={goToDetails}
              className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              {t("continue")}
            </button>
            <BackButton onClick={() => setStep(staffId ? "staff" : "service")} label={t("back")} />
          </div>
        </section>
      )}

      {step === "details" && service && (
        <form onSubmit={handleSubmit} className="max-w-xl" noValidate>
          <h3 className="font-serif text-2xl text-foreground">
            {t("chooseDetails")}
          </h3>
          <div className="mt-6 space-y-5">
            <FormField
              id="name"
              label={t("nameLabel")}
              error={fieldErrors.name}
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              autoComplete="name"
              required
            />
            <FormField
              id="email"
              label={t("emailLabel")}
              type="email"
              error={fieldErrors.email}
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              autoComplete="email"
              required
            />
            <FormField
              id="phone"
              label={t("phoneLabel")}
              type="tel"
              error={fieldErrors.phone}
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              autoComplete="tel"
              required
            />
            <div>
              <label htmlFor="note" className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("noteLabel")}
              </label>
              <textarea
                id="note"
                rows={3}
                maxLength={500}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder={t("notePlaceholder")}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
              />
              {fieldErrors.note && (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {fieldErrors.note}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-background p-5">
            <h3 className="text-sm font-semibold text-foreground">{t("summary")}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <SummaryRow label={t("service")} value={service.name} />
              <SummaryRow
                label={t("specialist")}
                value={staffId === "any" ? t("anyStaff") : (staffMember?.name ?? "")}
              />
              {dayKey && startMinutes !== null && (
                <SummaryRow
                  label={t("date")}
                  value={`${labelForDay(dayKey, tLocale)} ${minutesToLabel(startMinutes, tLocale)}`}
                />
              )}
            </dl>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              {submitting ? t("confirming") : t("confirm")}
            </button>
            <button
              type="button"
              onClick={() => setStep("date")}
              disabled={submitting}
              className="text-sm font-medium text-muted-foreground hover:text-brand"
            >
              &larr; {t("back")}
            </button>
          </div>
        </form>
      )}
      </div>

      <aside className="booking-summary rounded-[2rem] bg-primary p-6 text-primary-foreground lg:sticky lg:top-24" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">{t("summary")}</p>
        <p className="mt-3 font-serif text-2xl">{service?.name ?? t("chooseService")}</p>
        <dl className="mt-6 space-y-3 text-sm">
          <SummaryRow label={t("specialist")} value={staffId === "any" ? t("anyStaff") : (staffMember?.name ?? "—")} inverted />
          <SummaryRow label={t("date")} value={dayKey && startMinutes !== null ? `${labelForDay(dayKey, tLocale)} · ${minutesToLabel(startMinutes, tLocale)}` : "—"} inverted />
        </dl>
        <div className="mt-8 border-t border-primary-foreground/20 pt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-primary-foreground/60">{t("steps.date")}</p>
          <p className="mt-2 text-sm leading-relaxed text-primary-foreground/80">{t("dateHint")}</p>
        </div>
      </aside>
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-medium text-muted-foreground hover:text-brand"
    >
      &larr; {label}
    </button>
  );
}
function SummaryRow({ label, value, inverted = false }: { label: string; value: string; inverted?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={inverted ? "text-primary-foreground/60" : "text-muted-foreground"}>{label}</dt>
      <dd className={inverted ? "text-right font-medium text-primary-foreground" : "text-right font-medium text-foreground"}>{value}</dd>
    </div>
  );
}
