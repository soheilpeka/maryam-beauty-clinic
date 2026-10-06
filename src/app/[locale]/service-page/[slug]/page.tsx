import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getServiceBySlug, SERVICES, categoryLabel, localizeService } from "@/lib/content/services";
import { BUSINESS, localizedHours } from "@/lib/content/business";
import { BusinessAddressLink } from "@/components/business-address-link";
import type { Locale } from "@/i18n/routing";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import type { Service as ContentService } from "@/lib/content/services";
import { publicServices } from "@/lib/public-content";

export const dynamic = "force-dynamic";

/**
 * Service detail page. Localized descriptions are shared with the service catalog and booking flow.
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
  const record = await prisma.service.findUnique({ where: { slug } });
  if (!record?.active) return {};
  const service = { name: locale === "fr" ? record.nameFr ?? record.name : record.name };
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("serviceDetailTitle", { name: service.name }),
    description: t("serviceDetailDescription", { name: service.name }),
    alternates: { canonical: `/${locale}/service-page/${slug}`, languages: { en: `/en/service-page/${slug}`, fr: `/fr/service-page/${slug}` } },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sourceFallback = getServiceBySlug(slug);
  const loc = locale === "fr" ? "fr" : "en";
  const fallback = sourceFallback ? localizeService(sourceFallback, loc) : undefined;
  const record = await prisma.service.findUnique({ where: { slug }, include: { images: { orderBy: { order: "asc" } } } });
  if (!record?.active) notFound();
  const publicCatalog = await publicServices(loc);
  const publishedService = publicCatalog.find((item) => item.slug === slug);
  const service: ContentService | undefined = record
    ? {
        slug: record.slug,
        name: locale === "fr" ? (record.nameFr ?? record.name) : record.name,
        category: (record.category === "Hair" || record.category === "Makeup" || record.category === "Aesthetic" || record.category === "Wellness" ? record.category : "Aesthetic") as ContentService["category"],
        price: record.price,
        duration: record.duration,
        priceLabel: "",
        summary: publishedService?.summary ?? fallback?.summary ?? "",
        detail: publishedService?.detail ?? fallback?.detail,
        image: record.imageUrl ?? record.images[0]?.url ?? fallback?.image ?? "/example-pics/hair-look-1.png",
        order: record.order,
      }
    : fallback;
  if (!service) notFound();

  const t = await getTranslations({ locale, namespace: "Services" });
  const tSections = await getTranslations({ locale, namespace: "Sections" });
  const typedLocale = locale as Locale;

  const related = publicCatalog.filter(
    (s) => s.category === service.category && s.slug !== service.slug,
  ).slice(0, 3);
  const defaultFaqs = loc === "fr" ? [
    { question: "À quoi puis-je m’attendre?", answer: "Votre spécialiste vous accueille, écoute vos envies et vous présente les étapes du soin pour une expérience personnalisée et tout en douceur." },
    { question: "Comment prendre soin de ma peau après la visite?", answer: "Votre spécialiste vous partage des conseils personnalisés pour prolonger la sensation de fraîcheur et prendre soin de votre peau à la maison." },
    { question: "Combien de visites prévoir?", answer: "Votre spécialiste peut vous proposer un rythme de visites personnalisé selon vos objectifs beauté et le soin choisi." },
  ] : [
    { question: "What can I expect?", answer: "Your specialist welcomes you, listens to your goals and guides you through the service for a personalized, feel-good experience." },
    { question: "How can I care for my skin after my visit?", answer: "Your specialist shares personalized tips to help you enjoy a fresh feeling and care for your skin at home." },
    { question: "How many visits should I plan?", answer: "Your specialist can suggest a personalized visit plan around your beauty goals and chosen service." },
  ];
  const serviceFaqs = service.detail?.faqs ?? (service.detail?.customSections ? [] : defaultFaqs);

  return (
    <article className="editorial-page service-editorial">
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-label={locale === "fr" ? "Fil d’Ariane" : "Breadcrumb"}>
            <Link href="/book-online" className="transition-colors hover:text-brand">
              {t("all")}
            </Link>
            <span aria-hidden="true">/</span>
            <span>{categoryLabel(service.category, typedLocale)}</span>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">{service.name}</span>
          </nav>

          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow">{categoryLabel(service.category, typedLocale)}</p>
              <h1 className="display-heading mt-4 text-4xl sm:text-5xl lg:text-6xl">
                {service.name}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{service.summary}</p>
              {service.detail?.tagline && (
                <p className="mt-4 font-serif text-xl italic text-brand">
                  {service.detail.tagline}
                </p>
              )}
              {!service.detail?.customSections && <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-4 border-t border-border pt-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("duration")}</p>
                  <p className="mt-1 text-sm">{service.duration > 0 ? `${service.duration} ${t("min")}` : t("consultationDuration")}</p>
                </div>
              </div>}
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

            <div className="salon-photo-frame relative aspect-[4/3] overflow-hidden bg-muted">
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
              {record.images.length > 0 && <div className="my-8 grid gap-4 sm:grid-cols-2">{record.images.map(image => <div key={image.id} className="salon-photo-frame"><img src={image.url} alt={loc === "fr" ? image.altFr : image.altEn} loading="lazy" className="aspect-[4/3] w-full object-cover" /></div>)}</div>}
              {service.detail ? (
                <div className="mt-8 space-y-6 text-base leading-relaxed text-muted-foreground">
                  {service.detail.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              ) : (
                <div className="mt-8 space-y-6 text-base leading-relaxed text-muted-foreground">
                  <p>
                    {BUSINESS.neighborhood} &middot; <BusinessAddressLink />. {t("contactDetails")}:
                    {BUSINESS.email}, {tSections("contactEyebrow")} {BUSINESS.phone}.
                  </p>
                </div>
              )}

              {service.detail?.highlights && (
                <div className="mt-12 rounded-2xl border border-border bg-card p-8">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-brand">
                    {service.detail.highlightsTitle ?? t("highlights")}
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

              {(!service.detail?.customSections || service.detail.personalApproachTitle || service.detail.personalApproach?.length || service.detail.durationText || service.detail.faqs?.length || service.detail.bookingPrompt) && <section className="treatment-consultation" aria-labelledby="treatment-planning">
                <p className="eyebrow">{loc === "fr" ? "Une approche personnelle" : "A personal approach"}</p>
                <h3 id="treatment-planning" className="font-serif text-3xl mt-3">{service.detail?.personalApproachTitle ?? (loc === "fr" ? "Votre visite, en toute clarté." : "Your visit, clearly considered.")}</h3>
                {service.detail?.personalApproach?.length ? <div className="mt-5 space-y-4 text-base leading-relaxed text-muted-foreground">{service.detail.personalApproach.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div> : !service.detail?.customSections && <div className="treatment-facts"><div><h4>{loc === "fr" ? "Un soin qui vous ressemble" : "Made for you"}</h4><p>{loc === "fr" ? "Nous prenons le temps de connaître vos objectifs beauté et vos préférences afin de personnaliser votre expérience." : "We take time to understand your beauty goals and preferences, then personalize the experience around you."}</p></div></div>}
                <div className="treatment-facts"><div><h4>{loc === "fr" ? "Durée" : "Duration"}</h4><p>{service.detail?.durationText ?? (service.duration > 0 ? `${service.duration} ${t("min")}` : `${t("consultationDuration")}.`)}</p></div></div>
                {serviceFaqs.map((faq) => <details className="luxury-faq" key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
                {service.detail?.bookingPrompt && <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{service.detail.bookingPrompt}</p>}
              </section>}

              <div className="mt-12 border-t border-border pt-8">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-brand">
                  {t("contactDetails")}
                </h3>
                <div className="mt-5 grid gap-6 sm:grid-cols-2">
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{BUSINESS.name}</p>
                    <p>{BUSINESS.neighborhood}</p>
                    <BusinessAddressLink className="block" />
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
                    {localizedHours(locale === "fr" ? "fr" : "en").map((row) => (
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
                    {categoryLabel(s.category, typedLocale)}
                  </p>
                  <h3 className="mt-2 font-serif text-lg transition-colors group-hover:text-brand">
                    {s.name}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
