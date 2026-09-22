import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/contact-form";
import { BUSINESS } from "@/lib/content/business";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("contactTitle"),
    description: t("contactDescription"),
    alternates: { canonical: `/${locale}/contact` },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Contact" });
  const tSections = await getTranslations({ locale, namespace: "Sections" });

  return (
    <div className="bg-background">
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
        <div>
          <p className="eyebrow">{tSections("contactEyebrow")}</p>
          <h1 className="display-heading mt-4 text-4xl sm:text-5xl lg:text-6xl">
            {tSections("contactTitle")}
          </h1>

          <div className="mt-10 space-y-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                {t("addressLabel")}
              </p>
              <p className="mt-2 text-sm text-foreground">{BUSINESS.neighborhood}</p>
              <p className="text-sm text-muted-foreground">{BUSINESS.address}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                {t("phoneLabel")}
              </p>
              <a
                href={BUSINESS.phoneHref}
                className="mt-2 block text-sm text-foreground transition-colors hover:text-brand"
              >
                {BUSINESS.phone}
              </a>
              <a
                href={`mailto:${BUSINESS.email}`}
                className="block text-sm text-muted-foreground transition-colors hover:text-brand"
              >
                {BUSINESS.email}
              </a>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                {t("hoursLabel")}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {BUSINESS.hours.map((row) => (
                  <li key={row.days} className="flex justify-between gap-6 text-muted-foreground">
                    <span>{row.days}</span>
                    <span className="text-foreground/80">{row.open}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Map placeholder (as on the live site) with a real directions link */}
          <div className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              {t("mapTitle")}
            </p>
            <div className="mt-3 flex aspect-[16/9] items-center justify-center rounded-2xl border border-border bg-muted">
              <span className="text-xs text-muted-foreground">{tSections("mapPlaceholder")}</span>
            </div>
            <a
              href={BUSINESS.mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand transition-opacity hover:opacity-70"
            >
              {tSections("getDirections")}
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>

        <div>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}