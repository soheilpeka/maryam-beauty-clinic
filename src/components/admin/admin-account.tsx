"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { signOutAdmin } from "@/lib/admin-client";

/** "Signed in as ..." plus the sign-out button, shared by every admin page. */
export function AdminAccount({
  locale,
  name,
  email,
}: {
  locale: string;
  name: string | null;
  email: string;
}) {
  const t = useTranslations("Admin");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  const onSignOut = useCallback(async () => {
    setSigningOut(true);
    setSignOutFailed(false);
    try { await signOutAdmin(locale); }
    catch { setSignOutFailed(true); setSigningOut(false); }
  }, [locale]);

  return (
    <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
      <span className="hidden sm:inline">
        {t("signedInAs")} {name ?? email}
      </span>
      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        {signingOut ? t("signingOut") : t("signOut")}
      </button>
      {signOutFailed && <span role="alert">{locale === "fr" ? "La déconnexion a échoué. Réessayez." : "Sign out failed. Please try again."}</span>}
    </div>
  );
}
