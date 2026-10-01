"use client";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function NotFoundPage() {
  const locale = useLocale();
  const t = useTranslations("Nav");

  return (
    <div className="editorial-page editorial-container">
      <p className="eyebrow mb-6">Maryam C Beauté</p>
      <h1 className="display-heading">404</h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-400">
        {locale === "fr" ? "Cette page est introuvable." : "This page could not be found."}
      </p>
      <Link href="/" className="editorial-action mt-8">
        {t("home")}
      </Link>
    </div>
  );
}
