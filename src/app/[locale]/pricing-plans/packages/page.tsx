import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { PACKAGES } from "@/lib/content/packages";
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
    title: t("packagesTitle"),
    description: t("packagesDescription"),
    alternates: { canonical: `/${locale}/pricing-plans/packages` },
  };
}

export default async function PackagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Packages" });

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="display-heading mt-4 text-4xl sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PACKAGES.map((p) => (
            <div
              key={p.slug}
              className="relative flex flex-col rounded-2xl border border-border bg-card p-8"
            >
              {p.badge && (
                <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground">
                  {t("bestValue")}
                </span>
              )}
              <h2 className="font-serif text-2xl">{p.name}</h2>
              <p className="mt-5 text-4xl font-light">{p.priceLabel}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {p.cadence} &middot; {t("validFor")} {p.validity.replace("Valid for ", "").replace("Valid for ", "")}
              </p>
              <p className="mt-5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {p.summary}
              </p>
              <div className="mt-8 border-t border-border pt-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand">
                  {t("included")}
                </p>
                <ul className="space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                      <span
                        className="mt-1.5 h-1 w-4 shrink-0 rounded-full bg-gold"
                        aria-hidden="true"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/booking"
                className="mt-8 flex w-full items-center justify-center rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.03]"
              >
                {t("bookPackage")}
              </Link>
            </div>
          ))}
        </div>

        {/* Consultation CTA */}
        <div className="mt-16 rounded-2xl border border-border bg-card p-8 sm:p-12">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <h2 className="display-heading text-2xl sm:text-3xl">{t("ctaTitle")}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t("ctaBody")}
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
            >
              {t("freeConsultation")}
            </Link>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          {BUSINESS.neighborhood} &middot; {BUSINESS.address} &middot; {BUSINESS.phone}
        </p>
      </div>
    </div>
  );
}