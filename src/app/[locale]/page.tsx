import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { SERVICES, featuredServices, categoryLabel } from "@/lib/content/services";
import { PACKAGES } from "@/lib/content/packages";
import { GALLERY, GALLERY_INTRO, GALLERY_TAGS } from "@/lib/content/gallery";
import { TESTIMONIALS } from "@/lib/content/testimonials";
import { BLOG_POSTS, AUTHOR } from "@/lib/content/blog";
import { BUSINESS } from "@/lib/content/business";
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
    title: t("homeTitle"),
    description: t("description"),
    alternates: { canonical: `/${locale}` },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Sections" });
  const tHero = await getTranslations({ locale, namespace: "Hero" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const tServices = await getTranslations({ locale, namespace: "Services" });
  const tPackages = await getTranslations({ locale, namespace: "Packages" });
  const tBlog = await getTranslations({ locale, namespace: "Blog" });

  const featured = featuredServices();
  const popular = SERVICES.filter((s) =>
    ["womens-laser-hair-removal", "hair-growth-treatment", "microneedling", "facial-classic", "microblading"].includes(
      s.slug,
    ),
  );

  return (
    <div className="flex flex-col">
      {/* ---------------- Hero ---------------- */}
      <section id="top" className="relative overflow-hidden bg-background">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
          <div>
            <p className="eyebrow">{t("philosophyEyebrow").replace("Our philosophy", "Premium aesthetic clinic")}</p>
            <h1 className="display-heading mt-5 text-5xl sm:text-6xl lg:text-7xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("subtitle")}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.03]"
              >
                {tNav("book")}
              </Link>
              <Link
                href="/book-online"
                className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-8">
              {[tHero("stat1"), tHero("stat2"), tHero("stat3")].map((stat) => (
                <div key={stat}>
                  <dd className="text-xs leading-relaxed text-muted-foreground">{stat}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero image with overlapping accent frame */}
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero-clinic.png"
                alt="A calm woman with luminous, healthy skin"
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
            <div
              className="absolute -bottom-5 -left-5 -z-10 hidden h-full w-full rounded-2xl border border-border sm:block"
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      {/* ---------------- Philosophy ---------------- */}
      <section id="about" className="scroll-mt-24 border-t border-border bg-card py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div className="order-2 lg:order-1">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/gallery-facial.png"
                alt="Serene treatment moment at Maryam Beauty Clinic"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow">{t("philosophyEyebrow")}</p>
            <h2 className="display-heading mt-4 text-4xl sm:text-5xl">{t("philosophyTitle")}</h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>{t("philosophyBody1")}</p>
              <p>{t("philosophyBody2")}</p>
            </div>
            <Link
              href="/service-page/womens-laser-hair-removal"
              className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-brand transition-opacity hover:opacity-70"
            >
              {tServices("explore")}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Featured treatments ---------------- */}
      <section id="treatments" className="scroll-mt-24 bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="eyebrow">{t("treatmentsEyebrow")}</p>
              <h2 className="display-heading mt-4 text-4xl sm:text-5xl">
                {t("treatmentsTitle")}
              </h2>
              <p className="mt-4 text-base text-muted-foreground">{t("treatmentsSubtitle")}</p>
            </div>
            <Link
              href="/book-online"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-brand transition-opacity hover:opacity-70"
            >
              {tServices("viewAll")}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s) => (
              <Link
                key={s.slug}
                href={`/service-page/${s.slug}`}
                className="group flex flex-col bg-background p-7 transition-colors hover:bg-card"
              >
                <div className="mb-5 aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image}
                    alt={s.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                  {categoryLabel(s.category, locale as Locale)}
                </p>
                <h3 className="mt-2 font-serif text-xl">{s.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {s.summary}
                </p>
                <div className="mt-5 flex items-baseline justify-between border-t border-border pt-4">
                  <span className="text-sm font-medium text-foreground">{s.priceLabel}</span>
                  <span className="text-xs text-muted-foreground">
                    {Math.floor(s.duration / 60) > 0
                      ? `${Math.floor(s.duration / 60)} ${tServices("hr")}`
                      : ""}{" "}
                    {s.duration % 60 > 0 ? `${s.duration % 60} ${tServices("min")}` : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Featured treatment (editorial) ---------------- */}
      <section className="border-t border-border bg-primary py-20 text-primary-foreground lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/gallery-laser.png"
              alt="Laser hair removal treatment"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
              {t("featuredEyebrow")}
            </p>
            <h2 className="display-heading mt-4 text-4xl text-primary-foreground sm:text-5xl">
              {SERVICES[0].name}
            </h2>
            <p className="mt-4 font-serif text-xl italic text-primary-foreground/80">
              {SERVICES[0].detail?.tagline}
            </p>
            <p className="mt-6 max-w-md text-base leading-relaxed text-primary-foreground/70">
              {SERVICES[0].summary}
            </p>
            <ul className="mt-8 space-y-3">
              {SERVICES[0].detail?.highlights.map((hl) => (
                <li key={hl} className="flex items-start gap-3 text-sm text-primary-foreground/80">
                  <span className="mt-1.5 h-1 w-4 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                  {hl}
                </li>
              ))}
            </ul>
            <Link
              href="/service-page/womens-laser-hair-removal"
              className="mt-9 inline-flex items-center justify-center rounded-full bg-primary-foreground px-7 py-3.5 text-sm font-medium text-primary transition-transform duration-200 hover:scale-[1.03]"
            >
              {tServices("explore")} {SERVICES[0].name}
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Popular services with prices ---------------- */}
      <section id="pricing" className="scroll-mt-24 bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow">{t("treatmentsEyebrow")}</p>
            <h2 className="display-heading mt-4 text-4xl sm:text-5xl">
              {tServices("all")}
            </h2>
            <p className="mt-4 text-base text-muted-foreground">{t("treatmentsSubtitle")}</p>
          </div>
          <div className="mt-12 divide-y divide-border border-y border-border">
            {popular.map((s) => (
              <Link
                key={s.slug}
                href={`/service-page/${s.slug}`}
                className="group grid grid-cols-1 items-center gap-3 py-6 sm:grid-cols-[1fr_auto] sm:gap-6"
              >
                <div>
                  <h3 className="font-serif text-lg transition-colors group-hover:text-brand sm:text-xl">
                    {s.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.summary}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{s.priceLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.floor(s.duration / 60) > 0
                        ? `${Math.floor(s.duration / 60)} ${tServices("hr")}`
                        : ""}{" "}
                      {s.duration % 60 > 0 ? `${s.duration % 60} ${tServices("min")}` : ""}
                    </p>
                  </div>
                  <span className="hidden text-brand transition-transform group-hover:translate-x-1 sm:inline" aria-hidden="true">
                    &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/book-online"
              className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
            >
              {tServices("viewAll")}
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Skin ---------------- */}
      <section className="border-t border-border bg-card py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div>
            <p className="eyebrow">{t("skinEyebrow")}</p>
            <h2 className="display-heading mt-4 text-4xl sm:text-5xl">{t("skinTitle")}</h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              {t("skinBody")}
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {SERVICES.filter((s) => s.category === "Facial")
                .slice(0, 6)
                .map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/service-page/${s.slug}`}
                      className="text-sm text-foreground transition-colors hover:text-brand"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
            </ul>
            <Link
              href="/book-online"
              className="mt-9 inline-flex items-center gap-2 text-sm font-medium text-brand transition-opacity hover:opacity-70"
            >
              {tServices("explore")} {t("skinEyebrow")}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/gallery-microneedling.png"
              alt="Radiant, healthy skin"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ---------------- Results gallery preview ---------------- */}
      <section id="results" className="scroll-mt-24 bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow">{t("resultsEyebrow")}</p>
            <h2 className="display-heading mt-4 text-4xl sm:text-5xl">{t("resultsTitle")}</h2>
            <p className="mt-4 text-base text-muted-foreground">{t("galleryIntro")}</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GALLERY.slice(0, 4).map((g) => (
              <figure
                key={g.slug}
                className="group relative overflow-hidden rounded-2xl bg-muted"
              >
                <div className="aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.image}
                    alt={g.caption}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
                    {g.tag}
                  </span>
                  <p className="mt-1 text-sm font-medium text-white">{g.title}</p>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/gallery"
              className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
            >
              {t("galleryTitle")}
            </Link>
          </div>
          <p className="sr-only">{GALLERY_TAGS.join(", ")}</p>
        </div>
      </section>

      {/* ---------------- Testimonials ---------------- */}
      <section id="testimonials" className="scroll-mt-24 border-t border-border bg-card py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="eyebrow text-center">{t("testimonialsEyebrow")}</p>
          <h2 className="display-heading mt-4 text-center text-4xl sm:text-5xl">
            {t("testimonialsTitle")}
          </h2>
          <div className="mt-12 space-y-12">
            {TESTIMONIALS.map((tm) => (
              <figure key={tm.author} className="text-center">
                <blockquote>
                  <p className="font-serif text-xl italic leading-relaxed sm:text-2xl">
                    &ldquo;{tm.quote}&rdquo;
                  </p>
                </blockquote>
                <figcaption className="mt-5 text-sm font-medium text-brand">
                  {tm.author}
                  <span className="font-normal text-muted-foreground">, {tm.location}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Offers / packages ---------------- */}
      <section id="offers" className="scroll-mt-24 bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow">{t("offersEyebrow")}</p>
            <h2 className="display-heading mt-4 text-4xl sm:text-5xl">{t("offersTitle")}</h2>
            <p className="mt-4 text-base text-muted-foreground">{t("offersBody")}</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PACKAGES.map((p) => (
              <div
                key={p.slug}
                className="relative flex flex-col rounded-2xl border border-border bg-card p-8"
              >
                {p.badge && (
                  <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground">
                    {tPackages("bestValue")}
                  </span>
                )}
                <h3 className="font-serif text-2xl">{p.name}</h3>
                <p className="mt-4 text-3xl font-light">{p.priceLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {p.cadence} &middot; {tPackages("validFor")} {p.validity.replace("Valid for ", "")}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1 w-4 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/booking"
                  className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.03]"
                >
                  {tPackages("bookPackage")}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Clinic ---------------- */}
      <section id="clinic" className="border-t border-border bg-card py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div>
            <p className="eyebrow">{t("clinicEyebrow")}</p>
            <h2 className="display-heading mt-4 text-4xl sm:text-5xl">{t("clinicTitle")}</h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              {t("clinicBody")}
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {BUSINESS.serviceAreas.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                >
                  {a}
                </span>
              ))}
            </div>
            <Link
              href="/contact"
              className="mt-9 inline-flex items-center gap-2 text-sm font-medium text-brand transition-opacity hover:opacity-70"
            >
              {t("ctaSecondary")}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/gallery-1.png"
              alt="Interior of Maryam Beauty Clinic"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ---------------- Journal preview ---------------- */}
      <section className="bg-background py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">{tBlog("eyebrow")}</p>
              <h2 className="display-heading mt-4 text-4xl sm:text-5xl">{tBlog("title")}</h2>
            </div>
            <Link
              href="/blog"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-brand transition-opacity hover:opacity-70"
            >
              {tBlog("allPosts")}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {BLOG_POSTS.slice(0, 3).map((post) => (
              <Link key={post.slug} href={`/post/${post.slug}`} className="group">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                  {post.category}
                </p>
                <h3 className="mt-3 font-serif text-lg transition-colors group-hover:text-brand sm:text-xl">
                  {post.title}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  {tBlog("by")} {AUTHOR} &middot; {post.date} &middot;{" "}
                  {post.readTime}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section id="booking" className="scroll-mt-24 border-t border-border bg-primary py-20 text-primary-foreground lg:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
            {t("ctaEyebrow")}
          </p>
          <h2 className="display-heading mt-4 text-4xl text-primary-foreground sm:text-5xl">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-primary-foreground/70">
            {t("ctaBody")}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/booking"
              className="inline-flex items-center justify-center rounded-full bg-primary-foreground px-7 py-3.5 text-sm font-medium text-primary transition-transform duration-200 hover:scale-[1.03]"
            >
              {t("ctaButton")}
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full border border-primary-foreground/30 px-7 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:border-primary-foreground"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}