"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const AMOUNTS = [25, 50, 100, 150, 200];

/**
 * eGift card form. Mirrors the live site's fields exactly (amounts, recipient choice,
 * delivery date/time, never-expires note, personalized message). Submission is disabled in
 * this demo build - the real checkout is handled at the clinic - but the full form state is
 * preserved so the UX is complete.
 */
export function GiftCardForm() {
  const t = useTranslations("GiftCard");
  const [amount, setAmount] = useState(25);
  const [quantity, setQuantity] = useState(1);
  const [recipient, setRecipient] = useState<"other" | "self">("other");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Demo build: no payment provider is wired up, so we show a confirmation state
    // instead of silently dropping the request.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="font-serif text-2xl">{t("title")}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          ${amount} &times; {quantity} &middot; {t("neverExpires")}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{t("note")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-8 sm:p-10">
      {/* Amount */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-widest text-brand">
          {t("amount")}
        </legend>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(a)}
              className={`rounded-xl border py-4 text-sm font-medium transition-colors ${
                amount === a
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:border-brand"
              }`}
              aria-pressed={amount === a}
            >
              ${a}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Quantity */}
      <div className="mt-8">
        <label htmlFor="gc-qty" className="text-xs font-semibold uppercase tracking-widest text-brand">
          {t("quantity")}
        </label>
        <input
          id="gc-qty"
          type="number"
          min={1}
          max={20}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
          className="mt-3 w-24 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {/* Recipient */}
      <fieldset className="mt-8">
        <legend className="text-xs font-semibold uppercase tracking-widest text-brand">
          {t("recipient")}
        </legend>
        <div className="mt-4 flex gap-3">
          {([
            ["other", t("forSomeoneElse")],
            ["self", t("forMyself")],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setRecipient(val)}
              className={`flex-1 rounded-xl border py-3 text-sm font-medium transition-colors ${
                recipient === val
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:border-brand"
              }`}
              aria-pressed={recipient === val}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Recipient details */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="gc-email" className="text-xs font-medium text-muted-foreground">
            {t("recipientEmail")} *
          </label>
          <input
            id="gc-email"
            type="email"
            required
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="gc-name" className="text-xs font-medium text-muted-foreground">
            {t("recipientName")}
          </label>
          <input
            id="gc-name"
            type="text"
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="gc-date" className="text-xs font-medium text-muted-foreground">
            {t("deliveryDate")}
          </label>
          <input
            id="gc-date"
            type="date"
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="gc-time" className="text-xs font-medium text-muted-foreground">
            {t("deliveryTime")}
          </label>
          <select
            id="gc-time"
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
          >
            <option>{t("now")}</option>
          </select>
        </div>
      </div>

      {/* Message */}
      <div className="mt-8">
        <label htmlFor="gc-msg" className="text-xs font-medium text-muted-foreground">
          {t("message")}
        </label>
        <textarea
          id="gc-msg"
          rows={4}
          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">{t("neverExpires")}</p>

      <button
        type="submit"
        className="mt-6 flex w-full items-center justify-center rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.02]"
      >
        {t("buyNow")}
      </button>
      <p className="mt-4 text-center text-xs text-muted-foreground/70">{t("note")}</p>
    </form>
  );
}