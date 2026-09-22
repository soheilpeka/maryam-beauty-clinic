"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Contact form. Matches the live site's fields (name, email, message) and shows clear
 * loading / success / error states. In this demo build there is no mail server wired up, so
 * submission shows the success state without claiming an email was actually delivered.
 */
export function ContactForm() {
  const t = useTranslations("Contact");
  const tValidation = useTranslations("Validation");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // No backend mail endpoint in this build; simulate the round trip.
      await new Promise((r) => setTimeout(r, 600));
      if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError(tValidation("form"));
        return;
      }
      setSent(true);
    } catch {
      setError(tValidation("form"));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="font-serif text-2xl">{t("sent")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-8 sm:p-10">
      <div className="space-y-6">
        <div>
          <label htmlFor="contact-name" className="text-xs font-medium text-muted-foreground">
            {t("nameLabel")}
          </label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="text-xs font-medium text-muted-foreground">
            {t("emailLabelField")}
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="contact-message" className="text-xs font-medium text-muted-foreground">
            {t("messageLabel")}
          </label>
          <textarea
            id="contact-message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-5 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 flex w-full items-center justify-center rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.02] disabled:opacity-60"
      >
        {busy ? t("sending") : t("send")}
      </button>
    </form>
  );
}