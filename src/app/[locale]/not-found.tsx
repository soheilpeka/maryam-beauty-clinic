import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export default async function NotFoundPage({ params }: { params?: Promise<{ locale?: string }> }) {
  const resolved = await params;
  const locale = resolved?.locale === "fr" ? "fr" : "en";
  const t = await getTranslations({ locale, namespace: "Nav" });

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-32 text-center">
      <h1 className="font-serif text-4xl font-bold text-stone-900 dark:text-stone-50">404</h1>
      <p className="mt-4 text-stone-600 dark:text-stone-400">
        {locale === "fr" ? "Cette page est introuvable." : "This page could not be found."}
      </p>
      <Link href="/" className="mt-8 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white">
        {t("home")}
      </Link>
    </div>
  );
}