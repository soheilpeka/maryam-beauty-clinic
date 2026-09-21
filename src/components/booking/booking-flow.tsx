"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { formatPrice, formatDuration } from "@/lib/datetime";
import { customerSchema, flattenZodErrors } from "@/lib/validation";
import { minutesToLabel, labelForDay, dayKeyForDate, translateValidationKey } from "@/lib/booking-ui";
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
export interface Slot {
  startMinutes: number;
  staffId?: string;
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

export function BookingFlow({
  services,
  staff,
  initialServiceSlug,
  initialStaffSlug,
  locale,
  bookingWindowDays,
  slotIntervalMin,
}: {
  services: ServiceOption[];
  staff: StaffOption[];
  initialServiceSlug?: string;
  initialStaffSlug?: string;
  locale: string;
  bookingWindowDays: number;
  leadTimeMin: number;
  slotIntervalMin: number;
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
  const [dayKey, setDayKey] = useState<string>("");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", note: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);

  const service = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const staffMember = useMemo(
    () => (staffId === "any" ? null : (staff.find((s) => s.id === staffId) ?? null)),
    [staff, staffId],
  );
  const stepNumber = Math.min(STEP_ORDER.indexOf(step) + 1, STEP_ORDER.length);

  const staffSlugForFetch = useCallback(
    () => {
      if (staffId === "any" || !staffId) return "any";
      return staff.find((s) => s.id === staffId)?.slug ?? "any";
    },
    [staff, staffId],
  );

  const loadSlots = useCallback(
    async (key: string) => {
      if (!serviceId || !staffId || !service) return;
      setLoadingSlots(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          service: service.slug,
          staff: staffSlugForFetch(),
          date: key,
        });
        const res = await fetch(`/api/bookings/slots?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "INTERNAL");
        setSlots(data.slots ?? []);
      } catch {
        setSlots([]);
        setError(t("errorGeneric"));
      } finally {
        setLoadingSlots(false);
      }
    },
    [serviceId, staffId, service, staffSlugForFetch, t],
  );

  useEffect(() => {
    if (step === "date" && dayKey) loadSlots(dayKey);
  }, [step, dayKey, loadSlots]);

  // Days that have any working schedule for the selected service/staff.
  useEffect(() => {
    if (!serviceId || step === "done") return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      service: service!.slug,
      staff: staffSlugForFetch(),
      days: String(bookingWindowDays),
    });
    fetch(`/api/availability/days?${params.toString()}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { days: [] }))
      .then((d) => setAvailableDays(d.days ?? []))
      .catch(() => { /* keep previous */ });
    return () => controller.abort();
  }, [serviceId, staffId, service, staffSlugForFetch, bookingWindowDays, step]);

  function handleServiceSelect(id: string) {
    setServiceId(id);
    setStaffId(null);
    setDayKey("");
    setSlot(null);
    setStep("staff");
  }
  function handleStaffSelect(id: string) {
    setStaffId(id);
    setDayKey("");
    setSlot(null);
    setStep("date");
  }
  function handleSlotSelect(s: Slot) {
    setSlot(s);
    setError(null);
    setStep("details");
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

    if (!service || !staffId || !dayKey || !slot) {
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
          // Resolve "any" to the concrete staff the slot belongs to.
          staffId: staffId === "any" && slot.staffId ? slot.staffId : staffId,
          dayKey,
          startMinutes: slot.startMinutes,
          customer: parsed.data,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "SLOT_UNAVAILABLE" || data.error === "CONFLICT") {
          setError(t("errorConflict"));
          setStep("date");
          await loadSlots(dayKey);
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
      setResult(data as BookingResult);
      setStep("done");
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done" && result) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <span aria-hidden="true" className="text-3xl text-green-600 dark:text-green-400">Ã¢Å“â€œ</span>
        </div>
        <h1 className="mt-6 font-serif text-3xl font-bold text-stone-900 dark:text-stone-50">
          {t("successTitle")}
        </h1>
        <p className="mt-4 text-stone-600 dark:text-stone-400">
          {t("successBody", { email: form.email })}
        </p>
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-sm dark:border-stone-800 dark:bg-[#211b16]">
          <dl className="space-y-3 text-sm">
            <SummaryRow label={t("service")} value={result.service} />
            <SummaryRow label={t("specialist")} value={result.staff} />
            <SummaryRow label={t("date")} value={result.whenLabel} />
            <SummaryRow label={t("duration")} value={formatDuration(result.durationMin, tLocale)} />
            <div className="flex justify-between gap-4 border-t border-stone-200 pt-3 dark:border-stone-800">
              <dt className="text-stone-500 dark:text-stone-400">{t("total")}</dt>
              <dd className="font-semibold text-brand-600 dark:text-brand-400">
                {formatPrice(result.priceTotal, tLocale)}
              </dd>
            </div>
          </dl>
          <a
            href={result.manageUrl}
            className="mt-6 block rounded-full bg-brand-600 px-6 py-3 text-center text-sm font-semibold text-white"
          >
            {t("manageLink")}
          </a>
        </div>
        <button
          type="button"
          onClick={() => router.push("/booking")}
          className="mt-6 text-sm font-medium text-stone-600 hover:text-brand-600 dark:text-stone-400"
        >
          {t("bookAnother")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-50">{t("title")}</h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          {t("step", { current: stepNumber, total: STEP_ORDER.length })}
        </p>
        <ol className="mt-4 flex items-center gap-2" aria-label="Progress">
          {STEP_ORDER.map((s, i) => (
            <li key={s} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  stepNumber > i + 1
                    ? "bg-brand-600"
                    : stepNumber === i + 1
                      ? "bg-brand-400"
                      : "bg-stone-200 dark:bg-stone-800"
                }`}
              />
              <span className="mt-1 hidden text-xs text-stone-500 sm:block dark:text-stone-400">
                {t(`steps.${s}`)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {step === "service" && (
        <section aria-label={t("chooseService")}>
          <h2 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-50">
            {t("chooseService")}
          </h2>
          <ul className="mt-6 grid gap-4">
            {services.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => handleServiceSelect(s.id)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition-all hover:border-brand-400 hover:shadow-md dark:border-stone-800 dark:bg-[#211b16]"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-stone-900 dark:text-stone-50">{s.name}</span>
                    {s.description && (
                      <span className="mt-1 block text-sm text-stone-600 dark:text-stone-400">{s.description}</span>
                    )}
                    <span className="mt-2 block text-xs text-stone-500 dark:text-stone-400">
                      {formatDuration(s.duration, tLocale)}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-brand-600 dark:text-brand-400">
                    {formatPrice(s.price, tLocale)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === "staff" && service && (
        <section aria-label={t("chooseStaff")}>
          <h2 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-50">
            {t("chooseStaff")}
          </h2>
          <ul className="mt-6 grid gap-4">
            <li>
              <button
                type="button"
                onClick={() => handleStaffSelect("any")}
                className="flex w-full items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition-all hover:border-brand-400 hover:shadow-md dark:border-stone-800 dark:bg-[#211b16]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  â˜…
                </span>
                <span>
                  <span className="block font-medium text-stone-900 dark:text-stone-50">{t("anyStaff")}</span>
                  <span className="mt-1 block text-sm text-stone-600 dark:text-stone-400">{t("anyStaffHint")}</span>
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
                    className="flex w-full items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition-all hover:border-brand-400 hover:shadow-md dark:border-stone-800 dark:bg-[#211b16]"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-200 to-brand-400 font-semibold text-white">
                      {m.name.charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-stone-900 dark:text-stone-50">{m.name}</span>
                      <span className="block text-xs uppercase tracking-wide text-brand-600 dark:text-brand-400">
                        {m.role}
                      </span>
                      {m.bio && (
                        <span className="mt-1 block text-sm text-stone-600 dark:text-stone-400">{m.bio}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
          {staff.filter((m) => m.serviceIds.includes(service.id)).length === 0 && (
            <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">{t("errorClosed")}</p>
          )}
          <BackButton onClick={() => setStep("service")} label={t("back")} />
        </section>
      )}

      {step === "date" && service && (
        <section aria-label={t("chooseDate")}>
          <h2 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-50">
            {t("chooseDate")}
          </h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {Array.from({ length: Math.min(bookingWindowDays, 21) }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const key = dayKeyForDate(d);
              const hasAvailability = availableDays.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setDayKey(key);
                    setSlot(null);
                  }}
                  aria-pressed={dayKey === key}
                  aria-label={labelForDay(key, tLocale)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    dayKey === key
                      ? "border-brand-600 bg-brand-600 text-white"
                      : hasAvailability
                        ? "border-stone-200 bg-white text-stone-900 hover:border-brand-400 dark:border-stone-800 dark:bg-[#211b16] dark:text-stone-50"
                        : "border-stone-200 bg-stone-50 text-stone-400 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-600"
                  }`}
                >
                  {d.toLocaleDateString(tLocale === "fr" ? "fr-CA" : "en-CA", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </button>
              );
            })}
          </div>

          {dayKey && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{t("selectTime")}</h3>
              {loadingSlots ? (
                <p className="mt-4 text-sm text-stone-500 dark:text-stone-400" role="status">
                  {t("loadingSlots")}
                </p>
              ) : slots.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">{t("noSlots")}</p>
              ) : (
                <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {slots.map((s) => (
                    <li key={s.startMinutes}>
                      <button
                        type="button"
                        onClick={() => handleSlotSelect(s)}
                        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-900 transition-colors hover:border-brand-400 hover:bg-brand-50 dark:border-stone-800 dark:bg-[#211b16] dark:text-stone-50 dark:hover:bg-stone-800"
                      >
                        {minutesToLabel(s.startMinutes, tLocale)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <BackButton onClick={() => setStep(staffId ? "staff" : "service")} label={t("back")} />
        </section>
      )}

      {step === "details" && service && (
        <form onSubmit={handleSubmit} className="max-w-xl" noValidate>
          <h2 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-50">
            {t("chooseDetails")}
          </h2>
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
              <label htmlFor="note" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                {t("noteLabel")}
              </label>
              <textarea
                id="note"
                rows={3}
                maxLength={500}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder={t("notePlaceholder")}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none dark:border-stone-700 dark:bg-[#211b16] dark:text-stone-50"
              />
              {fieldErrors.note && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {fieldErrors.note}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#211b16]">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">{t("summary")}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <SummaryRow label={t("service")} value={service.name} />
              <SummaryRow
                label={t("specialist")}
                value={staffId === "any" ? t("anyStaff") : (staffMember?.name ?? "")}
              />
              {dayKey && slot && (
                <SummaryRow
                  label={t("date")}
                  value={`${labelForDay(dayKey, tLocale)} Â· ${minutesToLabel(slot.startMinutes, tLocale)}`}
                />
              )}
              <div className="flex justify-between gap-4 border-t border-stone-200 pt-2 dark:border-stone-800">
                <dt className="text-stone-500 dark:text-stone-400">{t("total")}</dt>
                <dd className="font-semibold text-brand-600 dark:text-brand-400">
                  {formatPrice(service.price, tLocale)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? t("confirming") : t("confirm")}
            </button>
            <button
              type="button"
              onClick={() => setStep("date")}
              disabled={submitting}
              className="text-sm font-medium text-stone-600 hover:text-brand-600 dark:text-stone-400"
            >
              â† {t("back")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 text-sm font-medium text-stone-600 hover:text-brand-600 dark:text-stone-400"
    >
      â† {label}
    </button>
  );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="text-right font-medium text-stone-900 dark:text-stone-50">{value}</dd>
    </div>
  );
}