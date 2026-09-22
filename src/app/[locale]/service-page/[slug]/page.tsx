import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getServiceBySlug, SERVICES, categoryLabel } from "@/lib/content/services";
import { BUSINESS } from "@/lib/content/business";
import { formatDuration } from "@/lib/content/format";
import type { Locale } from "@/i18n/routing";
import type { Metadata } from "next";

/**
 * Service detail page. The five services that have long-form copy on the live site render
 * their full description; every service still gets pricing, duration, booking and the
 * contact block, so no service is left without a page.
 */
export async function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("serviceDetailTitle", { name: service.name }),
    description: t("serviceDetailDescription", {
      name: service.name,
      price: service.priceLabel,
      duration: formatDuration(service.duration, locale as Locale),
    }),
    alternates: { canonical: `/${locale}/service-page/${slug}` },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const t = await getTranslations({ locale, namespace: "Services" });
  const tSections = await getTranslations({ locale, namespace: "Sections" });
  const loc = locale as Locale;

  const related = SERVICES.filter(
    (s) => s.category === service.category && s.slug !== service.slug,
  ).slice(0, 3);

  return (
    <article className="bg-background">
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <nav className="mb-8 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/book-online" className="transition-colors hover:text-brand">
              {t("all")}
            </Link>
            <span aria-hidden="true">/</span>
            <span>{categoryLabel(service.category, loc)}</span>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">{service.name}</span>
          </nav>

          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow">{categoryLabel(service.category, loc)}</p>
              <h1 className="display-heading mt-4 text-4xl sm:text-5xl lg:text-6xl">
                {service.name}
              </h1>
              {service.detail?.tagline && (
                <p className="mt-4 font-serif text-xl italic text-brand">
                  {service.detail.tagline}
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-4 border-t border-border pt-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("price")}
                  </p>
                  <p className="mt-1 font-serif text-2xl">{service.priceLabel}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("duration")}
                  </p>
                  <p className="mt-1 font-serif text-2xl">
                    {formatDuration(service.duration, loc)}
                  </p>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/booking?service=${service.slug}`}
                  className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.03]"
                >
                  {t("bookNow")}
                </Link>
                <a
                  href={BUSINESS.phoneHref}
                  className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
                >
                  {BUSINESS.phone}
                </a>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={service.image}
                alt={`${service.name} at ${BUSINESS.neighborhood}`}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-8">
              <h2 className="display-heading text-3xl sm:text-4xl">
                {t("serviceDescription")}
              </h2>
              {service.detail ? (
                <div className="mt-8 space-y-6 text-base leading-relaxed text-muted-foreground">
                  {service.detail.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              ) : (
                <div className="mt-8 space-y-6 text-base leading-relaxed text-muted-foreground">
                  <p>{service.summary}</p>
                  <p>
                    {BUSINESS.neighborhood} &middot; {BUSINESS.address}. {t("contactDetails")}:
                    {BUSINESS.email}, {tSections("contactEyebrow")} {BUSINESS.phone}.
                  </p>
                </div>
              )}

              {service.detail?.highlights && (
                <div className="mt-12 rounded-2xl border border-border bg-card p-8">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-brand">
                    {t("highlights")}
                  </h3>
                  <ul className="mt-5 space-y-3">
                    {service.detail.highlights.map((hl) => (
                      <li
                        key={hl}
                        className="flex items-start gap-3 text-sm text-foreground"
                      >
                        <span
                          className="mt-1.5 h-1 w-4 shrink-0 rounded-full bg-gold"
                          aria-hidden="true"
                        />
                        {hl}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-12 border-t border-border pt-8">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-brand">
                  {t("contactDetails")}
                </h3>
                <div className="mt-5 grid gap-6 sm:grid-cols-2">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{BUSINESS.name}</p>
                    <p>{BUSINESS.neighborhood}</p>
                    <p>{BUSINESS.address}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <a
                      href={BUSINESS.phoneHref}
                      className="block transition-colors hover:text-brand"
                    >
                      {BUSINESS.phone}
                    </a>
                    <a
                      href={`mailto:${BUSINESS.email}`}
                      className="block transition-colors hover:text-brand"
                    >
                      {BUSINESS.email}
                    </a>
                    <Link
                      href="/gallery"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand transition-opacity hover:opacity-70"
                    >
                      {t("seeResults")}
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4">
              <div className="sticky top-24 space-y-6">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {t("price")}
                  </p>
                  <p className="mt-2 font-serif text-3xl">{service.priceLabel}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDuration(service.duration, loc)}
                  </p>
                  <Link
                    href={`/booking?service=${service.slug}`}
                    className="mt-6 flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.03]"
                  >
                    {t("bookNow")}
                  </Link>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {tSections("hoursLabel")}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {BUSINESS.hours.map((row) => (
                      <li key={row.days} className="flex justify-between gap-4 text-muted-foreground">
                        <span>{row.days}</span>
                        <span className="text-foreground/80">{row.open}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border bg-card py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="display-heading text-3xl sm:text-4xl">{t("relatedTreatments")}</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {related.map((s) => (
                <Link
                  key={s.slug}
                  href={`/service-page/${s.slug}`}
                  className="group rounded-2xl border border-border bg-background p-6 transition-colors hover:border-brand"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                    {categoryLabel(s.category, loc)}
                  </p>
                  <h3 className="mt-2 font-serif text-lg transition-colors group-hover:text-brand">
                    {s.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.priceLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDuration(s.duration, loc)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}