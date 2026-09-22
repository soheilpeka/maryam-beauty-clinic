"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { FormField } from "@/components/booking/form-field";

/**
 * Admin sign-in form. Submits to /api/admin/login and, on success, stores the CSRF token
 * (returned by the server, HMAC-bound to the session) for later state-changing requests.
 * Only the generic "invalid email or password" error is ever shown, on purpose.
 */
export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  const tValidation = useTranslations("Validation");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFormError(null);
    setErrors({});

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (res.ok) {
        // Keep the CSRF token client-side for the admin dashboard mutations.
        if (typeof window !== "undefined" && json.csrfToken) {
          window.sessionStorage.setItem("admin-csrf", json.csrfToken);
        }
        router.push(`/${locale}/admin`);
        router.refresh();
        return;
      }

      if (res.status === 429) {
        setFormError(t("tooManyAttempts"));
        return;
      }
      if (json.fieldErrors) {
        setErrors(json.fieldErrors);
        return;
      }
      // Any credential problem - unknown email, wrong password - shows the same message.
      setFormError(t("invalidCredentials"));
    } catch {
      setFormError(t("invalidCredentials"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          {formError}
        </p>
      )}
      <FormField
        id="admin-email"
        label={t("email")}
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
        error={errors.email ? tValidation("email.invalid") : undefined}
      />
      <FormField
        id="admin-password"
        label={t("password")}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
        error={errors.password ? tValidation("password.min") : undefined}
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? t("signingIn") : t("signInButton")}
      </button>
    </form>
  );
}
