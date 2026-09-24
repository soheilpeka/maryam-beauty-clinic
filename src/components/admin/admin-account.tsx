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

  const onSignOut = useCallback(async () => {
    setSigningOut(true);
    await signOutAdmin(locale);
  }, [locale]);

  return (
    <div className="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
      <span className="hidden sm:inline">
        {t("signedInAs")} {name ?? email}
      </span>
      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        {signingOut ? t("signingOut") : t("signOut")}
      </button>
    </div>
  );
}