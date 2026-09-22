import { getTranslations, setRequestLocale } from "next-intl/server";
import { ServiceCatalog } from "@/components/service-catalog";
import type { Locale } from "@/i18n/routing";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("servicesTitle"),
    description: t("servicesDescription"),
    alternates: { canonical: `/${locale}/book-online` },
  };
}

export default async function BookOnlinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Sections" });
  const tServices = await getTranslations({ locale, namespace: "Services" });

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">{tServices("all")}</p>
          <h1 className="display-heading mt-4 text-4xl sm:text-5xl lg:text-6xl">
            {t("treatmentsTitle")}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            {t("treatmentsSubtitle")}
          </p>
        </div>

        <div className="mt-14">
          <ServiceCatalog locale={locale as Locale} />
        </div>
      </div>
    </div>
  );
}