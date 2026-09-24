"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { formatPrice, formatDuration } from "@/lib/datetime";
import { serviceSchema, flattenZodErrors } from "@/lib/validation";
import { translateValidationKey } from "@/lib/booking-ui";
import { getCsrfToken } from "@/lib/admin-client";
import type { ServiceView } from "@/lib/admin-views";

/**
 * Services manager. The list comes from /api/admin/services and every create/update/delete
 * goes back through it with a session + CSRF token; the form is validated on the client with
 * the same Zod schema the server uses, then validated again on the server.
 */

interface ServicesList {
  ok: true;
  services: ServiceView[];
}

type FormState = {
  mode: "create" | "edit";
  id: string | null;
  name: string;
  category: string;
  priceInput: string;
  durationInput: string;
  bufferInput: string;
  description: string;
  active: boolean;
  errors: Record<string, string>;
  submitting: boolean;
};

type DeleteState = {
  id: string;
  name: string;
  bookingCount: number;
  error: string | null;
  submitting: boolean;
};

type DialogState = FormState | DeleteState | null;

function emptyForm(): FormState {
  return {
    mode: "create",
    id: null,
    name: "",
    category: "",
    priceInput: "",
    durationInput: "",
    bufferInput: "0",
    description: "",
    active: true,
    errors: {},
    submitting: false,
  };
}

function formFromService(service: ServiceView): FormState {
  return {
    ...emptyForm(),
    mode: "edit",
    id: service.id,
    name: service.name,
    category: service.category === "General" ? "" : service.category,
    priceInput: (service.price / 100).toFixed(2),
    durationInput: String(service.duration),
    bufferInput: String(service.bufferMin),
    description: service.description ?? "",
    active: service.active,
  };
}

export function ServicesView({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  const tValidation = useTranslations("Validation");
  const [services, setServices] = useState<ServiceView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/services", { cache: "no-store" });
      if (!res.ok) throw new Error("services failed");
      const json = (await res.json()) as ServicesList;
      setServices(json.services ?? []);
    } catch {
      setError(t("errorHint"));
      setServices(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function closeDialog() {
    setDialog((current) => (current && "submitting" in current && current.submitting ? current : null));
  }

  async function submitForm(state: FormState) {
    const priceCents = Math.round(Number(state.priceInput) * 100);
    const payload = {
      name: state.name.trim(),
      category: state.category.trim() || undefined,
      price: Number.isFinite(priceCents) ? priceCents : NaN,
      duration: Number(state.durationInput),
      bufferMin: Number(state.bufferInput),
      description: state.description.trim() || undefined,
      active: state.active,
    };

    // Client-side gate: same schema as the server, so a bad value is caught before the
    // request and the messages are already translated for the form.
    const clientParsed = serviceSchema.safeParse(payload);
    if (!clientParsed.success) {
      const translated: Record<string, string> = {};
      for (const [k, v] of Object.entries(flattenZodErrors(clientParsed))) {
        translated[k] = translateValidationKey(v, tValidation);
      }
      setDialog({ ...state, errors: translated });
      return;
    }

    setDialog({ ...state, submitting: true, errors: {} });
    const token = await getCsrfToken();
    if (!token) {
      setDialog({ ...state, submitting: false, errors: { form: tValidation("form") } });
      return;
    }

    try {
      const url = state.id ? `/api/admin/services/${state.id}` : "/api/admin/services";
      const method = state.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json", "x-admin-csrf": token },
        body: JSON.stringify(clientParsed.data),
      });
      const json = (await res.json()) as { ok?: boolean; service?: ServiceView; message?: string };

      if (!res.ok) {
        const errors: Record<string, string> = {};
        if (json.message) errors.form = json.message;
        setDialog({ ...state, submitting: false, errors });
        return;
      }
      setDialog(null);
      void load();
    } catch {
      setDialog({ ...state, submitting: false, errors: { form: t("errorHint") } });
    }
  }

  async function submitDelete(state: DeleteState) {
    setDialog({ ...state, submitting: true, error: null });
    const token = await getCsrfToken();
    if (!token) {
      setDialog({ ...state, submitting: false, error: tValidation("form") });
      return;
    }
    try {
      const res = await fetch(`/api/admin/services/${state.id}`, {
        method: "DELETE",
        headers: { "x-admin-csrf": token },
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) {
        // 409 means bookings still reference it; the server message says to deactivate instead.
        setDialog({ ...state, submitting: false, error: json.message ?? t("errorHint") });
        return;
      }
      setDialog(null);
      void load();
    } catch {
      setDialog({ ...state, submitting: false, error: t("errorHint") });
    }
  }

  if (loading) {
    return (
      <div aria-busy="true" aria-label={t("loadingServices")} className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-[#1a1512]"
          >
            <div className="h-4 w-1/3 rounded bg-stone-200 dark:bg-stone-800" />
            <div className="mt-3 h-3 w-2/3 rounded bg-stone-200 dark:bg-stone-800" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm dark:border-red-800 dark:bg-red-950/40">
        <p className="font-medium text-red-700 dark:text-red-300">{t("errorTitle")}</p>
        <p className="mt-0.5 text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/60"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setDialog(emptyForm())}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {t("addService")}
        </button>
      </div>

      {services && services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center dark:border-stone-700 dark:bg-[#1a1512]">
          <p className="text-sm text-stone-600 dark:text-stone-400">{t("emptyServices")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {services?.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              locale={locale}
              onEdit={() => setDialog(formFromService(service))}
              onDelete={() =>
                setDialog({
                  id: service.id,
                  name: service.name,
                  bookingCount: service.bookingCount,
                  error: null,
                  submitting: false,
                })
              }
            />
          ))}
        </ul>
      )}

      {dialog && "mode" in dialog && (
        <ServiceFormDialog
          state={dialog}
          onChange={(patch) => setDialog((d) => (d && "mode" in d ? { ...d, ...patch } : d))}
          onClose={closeDialog}
          onSubmit={submitForm}
        />
      )}
      {dialog && "bookingCount" in dialog && (
        <DeleteServiceDialog
          state={dialog}
          onClose={closeDialog}
          onSubmit={submitDelete}
        />
      )}
    </div>
  );
}

function ServiceRow({
  service,
  locale,
  onEdit,
  onDelete,
}: {
  service: ServiceView;
  locale: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("Admin");
  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1a1512]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-50">
              {service.name}
            </h3>
            <span
              className={
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
                (service.active
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-stone-300 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400")
              }
            >
              {service.active ? t("active") : t("inactive")}
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400">{service.category}</span>
          </div>
          <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
            <span className="font-medium">{t("price")}:</span> {formatPrice(service.price, locale)}
            <span className="mx-2 text-stone-300 dark:text-stone-700">|</span>
            <span className="font-medium">{t("duration")}:</span>{" "}
            {formatDuration(service.duration, locale)}
            {service.bufferMin > 0 && (
              <>
                <span className="mx-2 text-stone-300 dark:text-stone-700">|</span>
                <span className="font-medium">{t("buffer")}:</span> {formatDuration(service.bufferMin, locale)}
              </>
            )}
          </p>
          {service.description && (
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{service.description}</p>
          )}
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {service.bookingCount} {t("bookingsWord")}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {t("edit")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-300 px-3.5 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            {t("delete")}
          </button>
        </div>
      </div>
    </li>
  );
}

function ServiceFormDialog({
  state,
  onChange,
  onClose,
  onSubmit,
}: {
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
  onClose: () => void;
  onSubmit: (s: FormState) => void;
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
      aria-labelledby="service-form-title"
      className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-xl dark:border-stone-800 dark:bg-[#1a1512] dark:text-stone-50"
    >
      <h2 id="service-form-title" className="font-serif text-xl font-semibold">
        {state.mode === "create" ? t("addService") : t("editService")}
      </h2>
      {state.errors.form && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {state.errors.form}
        </p>
      )}
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(state);
        }}
      >
        <Field label={t("name")} id="service-name" error={state.errors.name}>
          <input
            id="service-name"
            type="text"
            required
            maxLength={80}
            value={state.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("priceCad")} id="service-price" error={state.errors.price}>
            <input
              id="service-price"
              type="number"
              step="0.01"
              min="0"
              required
              value={state.priceInput}
              onChange={(e) => onChange({ priceInput: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={t("duration")} id="service-duration" error={state.errors.duration}>
            <input
              id="service-duration"
              type="number"
              step="5"
              min="5"
              max="480"
              required
              value={state.durationInput}
              onChange={(e) => onChange({ durationInput: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("category")} id="service-category" error={state.errors.category}>
            <input
              id="service-category"
              type="text"
              maxLength={40}
              value={state.category}
              onChange={(e) => onChange({ category: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={t("buffer")} id="service-buffer" error={state.errors.bufferMin}>
            <input
              id="service-buffer"
              type="number"
              step="5"
              min="0"
              max="240"
              value={state.bufferInput}
              onChange={(e) => onChange({ bufferInput: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label={t("description")} id="service-description" error={state.errors.description}>
          <textarea
            id="service-description"
            rows={3}
            maxLength={500}
            value={state.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className={inputClass}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
          <input
            type="checkbox"
            checked={state.active}
            onChange={(e) => onChange({ active: e.target.checked })}
            className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
          />
          {t("activeService")}
        </label>
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
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.submitting ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function DeleteServiceDialog({
  state,
  onClose,
  onSubmit,
}: {
  state: DeleteState;
  onClose: () => void;
  onSubmit: (s: DeleteState) => void;
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
      aria-labelledby="service-delete-title"
      className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-xl dark:border-stone-800 dark:bg-[#1a1512] dark:text-stone-50"
    >
      <h2 id="service-delete-title" className="font-serif text-xl font-semibold">
        {t("deleteServiceTitle")}
      </h2>
      <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
        {t("deleteServiceHint", { name: state.name })}
      </p>
      {state.error && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          {state.error}
        </div>
      )}
      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={state.submitting}
          className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={() => void onSubmit(state)}
          disabled={state.submitting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.submitting ? t("deleting") : t("delete")}
        </button>
      </div>
    </dialog>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-stone-700 dark:bg-[#211b16]";

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}