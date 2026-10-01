import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "@/components/contact-form";
import { BUSINESS, localizedHours } from "@/lib/content/business";
import { Link } from "@/i18n/routing";
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
    alternates: { canonical: `/${locale}/contact`, languages: { en: "/en/contact", fr: "/fr/contact" } },
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
    <div className="editorial-page contact-editorial">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="eyebrow">Maryam C Beauté · Brossard</p>
          <h1 className="display-heading mt-4 max-w-4xl text-5xl sm:text-6xl lg:text-7xl">{tSections("contactTitle")}</h1>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/booking" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">{locale === "fr" ? "Demander un rendez-vous" : "Request an appointment"}</Link>
            <a href={BUSINESS.instagramHref} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:border-brand hover:text-brand">Instagram</a>
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
        <div>
          <p className="eyebrow">{tSections("contactEyebrow")}</p>
          <h2 className="display-heading mt-4 text-4xl sm:text-5xl">{BUSINESS.neighborhood}</h2>

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
                {localizedHours(locale === "fr" ? "fr" : "en").map((row) => (
                  <li key={row.days} className="flex justify-between gap-6 text-muted-foreground">
                    <span>{row.days}</span>
                    <span className="text-foreground/80">{row.open}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              {t("mapTitle")}
            </p>
            <a href={BUSINESS.mapsHref} target="_blank" rel="noopener noreferrer" className="group mt-3 flex aspect-[16/9] flex-col justify-end overflow-hidden rounded-2xl border border-border bg-[linear-gradient(135deg,var(--color-champagne),var(--color-muted))] p-7 transition-colors hover:border-brand">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{BUSINESS.city}, Québec</span>
              <strong className="mt-2 font-serif text-3xl font-normal">{BUSINESS.address}</strong>
              <span className="mt-4 text-sm text-brand group-hover:underline">{tSections("getDirections")} &rarr;</span>
            </a>
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
