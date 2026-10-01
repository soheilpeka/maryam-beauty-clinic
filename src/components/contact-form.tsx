"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { contactSchema, flattenZodErrors } from "@/lib/validation";
import { translateValidationKey } from "@/lib/booking-ui";

export function ContactForm() {
  const t = useTranslations("Contact");
  const tv = useTranslations("Validation");
  const [fields, setFields] = useState<Record<string, string>>({});
  const locale = useLocale() === "fr" ? "fr" : "en";
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<"provider" | "mock" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = contactSchema.safeParse({ ...form, locale });
    if (!parsed.success) {
      setFields(Object.fromEntries(Object.entries(flattenZodErrors(parsed)).map(([key, value]) => [key, translateValidationKey(value, tv)])));
      return;
    }
    setFields({});
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(t("sendError"));
        return;
      }
      setSent(data.delivery === "provider" ? "provider" : "mock");
    } catch {
      setError(t("sendError"));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-[2rem] border border-border bg-card p-8 sm:p-10" role="status">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-xl text-brand" aria-hidden="true">✓</div>
        <h2 className="mt-6 font-serif text-3xl">{t("sent")}</h2>
        {sent === "mock" && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("mockSent")}</p>}
        <button type="button" onClick={() => { setForm({ name: "", email: "", message: "" }); setSent(null); }} className="mt-6 text-sm font-medium text-brand hover:underline">
          {t("send")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[2rem] border border-border bg-card p-7 sm:p-10" noValidate>
      <h2 className="font-serif text-3xl">{t("send")}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("formIntro")}</p>
      <div className="mt-8 space-y-6">

        <ContactField id="contact-name" error={fields.name} label={t("nameLabel")} value={form.name} onChange={(name) => setForm((current) => ({ ...current, name }))} autoComplete="name" />
        <ContactField id="contact-email" error={fields.email} label={t("emailLabelField")} type="email" value={form.email} onChange={(email) => setForm((current) => ({ ...current, email }))} autoComplete="email" />
        <div>
          <label htmlFor="contact-message" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("messageLabel")}</label>
          <textarea aria-invalid={Boolean(fields.message)} aria-describedby={fields.message ? "contact-message-error" : undefined} id="contact-message" rows={6} minLength={10} maxLength={2000} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} required className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand focus:outline-none" />
          {fields.message && <p id="contact-message-error" role="alert" className="mt-2 text-sm text-destructive">{fields.message}</p>}
        </div>
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}

      <button type="submit" disabled={busy} className="mt-7 flex w-full items-center justify-center rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-wait disabled:opacity-60">
        {busy ? t("sending") : t("send")}
      </button>
    </form>
  );
}

function ContactField({ id, label, value, onChange, type = "text", autoComplete, error }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      <input aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required minLength={2} maxLength={120} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand focus:outline-none" />
      {error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
