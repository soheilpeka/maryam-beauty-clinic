"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link, useRouter, usePathname as useLocalePathname } from "@/i18n/routing";
import { SERVICES, SERVICE_CATEGORIES, categoryLabel } from "@/lib/content/services";
import type { ServiceCategory } from "@/lib/content/services";
import { Locale } from "@/i18n/routing";

/**
 * Premium site header: sticky, hairline-bordered, with a "Treatments" mega dropdown that
 * groups the complete catalog by category (so no service is hidden behind a "popular"
 * filter), plus a purpose-built mobile drawer.
 */
export function SiteHeader() {
  const t = useTranslations("Nav");
  const tServices = useTranslations("Services");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [treatmentsOpen, setTreatmentsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = useLocalePathname();
  const router = useRouter();
  const rawPath = usePathname();

  // Close everything on route change.
  useEffect(() => {
    setMobileOpen(false);
    setTreatmentsOpen(false);
  }, [rawPath]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const locale: Locale = (pathname.split("/")[1] === "fr" ? "fr" : "en") as Locale;

  const onTreatmentsEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setTreatmentsOpen(true);
  };
  const onTreatmentsLeave = () => {
    closeTimer.current = setTimeout(() => setTreatmentsOpen(false), 150);
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-colors duration-300 ${
        scrolled || mobileOpen
          ? "border-border bg-background/90 backdrop-blur-md"
          : "border-transparent bg-background"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-70"
          aria-label="Maryam Beauty Clinic home"
        >
          <span className="font-serif text-lg leading-none tracking-tight sm:text-xl">
            Maryam
          </span>
          <span className="font-serif text-lg leading-none tracking-tight text-brand sm:text-xl">
            Beauty Clinic
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
          <div
            className="relative"
            onMouseEnter={onTreatmentsEnter}
            onMouseLeave={onTreatmentsLeave}
          >
            <button
              type="button"
              onClick={() => setTreatmentsOpen((v) => !v)}
              aria-expanded={treatmentsOpen}
              aria-haspopup="true"
              className="flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-brand"
            >
              {t("treatments")}
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  treatmentsOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {treatmentsOpen && (
              <div className="absolute left-1/2 top-full z-50 w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 pt-3">
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/5">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6 p-6 xl:grid-cols-3 xl:p-8">
                    {SERVICE_CATEGORIES.map((cat) => (
                      <div key={cat}>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand">
                          {categoryLabel(cat, locale)}
                        </p>
                        <ul className="space-y-2.5">
                          {SERVICES.filter((s) => s.category === cat).map((s) => (
                            <li key={s.slug}>
                              <Link
                                href={`/service-page/${s.slug}`}
                                className="group flex items-baseline justify-between gap-3 text-sm text-foreground transition-colors hover:text-brand"
                              >
                                <span>{s.name}</span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                  {s.priceLabel.replace(/^From\s/, "")}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-border bg-muted/50 px-6 py-3 xl:px-8">
                    <p className="text-xs text-muted-foreground">
                      {SERVICES.length} {t("allServices").toLowerCase()}
                    </p>
                    <Link
                      href="/book-online"
                      className="text-xs font-semibold text-brand transition-opacity hover:opacity-70"
                    >
                      {t("allServices")} &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/pricing-plans/packages"
            className="text-sm font-medium text-foreground transition-colors hover:text-brand"
          >
            {t("packages")}
          </Link>
          <Link
            href="/gallery"
            className="text-sm font-medium text-foreground transition-colors hover:text-brand"
          >
            {t("results")}
          </Link>
          <Link
            href="/blog"
            className="text-sm font-medium text-foreground transition-colors hover:text-brand"
          >
            {t("blog")}
          </Link>
          <Link
            href="/gift-card"
            className="text-sm font-medium text-foreground transition-colors hover:text-brand"
          >
            {t("giftCard")}
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-foreground transition-colors hover:text-brand"
          >
            {t("contact")}
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />

          <Link
            href="/booking"
            className="hidden rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.03] sm:inline-flex"
          >
            {t("book")}
          </Link>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted lg:hidden"
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-40 overflow-y-auto bg-background lg:hidden">
          <nav className="mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-6" aria-label="Mobile">
            <MobileSection title={t("treatments")}>
              {SERVICE_CATEGORIES.map((cat) => (
                <div key={cat} className="py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand">
                    {categoryLabel(cat, locale)}
                  </p>
                  <ul className="space-y-1">
                    {SERVICES.filter((s) => s.category === cat).map((s) => (
                      <li key={s.slug}>
                        <Link
                          href={`/service-page/${s.slug}`}
                          className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-muted"
                        >
                          <span>{s.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {s.priceLabel.replace(/^From\s/, "")}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </MobileSection>

            <MobileSection title={t("clinic")}>
              <Link href="/pricing-plans/packages" className="block rounded-lg px-2 py-2.5 text-sm hover:bg-muted">{t("packages")}</Link>
              <Link href="/gallery" className="block rounded-lg px-2 py-2.5 text-sm hover:bg-muted">{t("results")}</Link>
              <Link href="/blog" className="block rounded-lg px-2 py-2.5 text-sm hover:bg-muted">{t("blog")}</Link>
              <Link href="/gift-card" className="block rounded-lg px-2 py-2.5 text-sm hover:bg-muted">{t("giftCard")}</Link>
              <Link href="/contact" className="block rounded-lg px-2 py-2.5 text-sm hover:bg-muted">{t("contact")}</Link>
            </MobileSection>

            <div className="mt-6">
              <Link
                href="/booking"
                className="flex w-full items-center justify-center rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground"
              >
                {t("book")}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function MobileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-serif text-base">{title}</span>
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && children}
    </div>
  );
}

function LanguageSwitcher() {
  const t = useTranslations("Nav");
  const router = useRouter();
  const pathname = useLocalePathname();
  const locale: Locale = (pathname.split("/")[1] === "fr" ? "fr" : "en") as Locale;
  const other = locale === "en" ? "fr" : "en";

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: other })}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
      aria-label={t("switchLanguage")}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="10" cy="10" r="8" />
        <path d="M2.5 10h15M10 2.5c2.2 2.2 3.3 4.8 3.3 7.5s-1.1 5.3-3.3 7.5c-2.2-2.2-3.3-4.8-3.3-7.5S7.8 4.7 10 2.5z" />
      </svg>
      {t("languageCode")}
    </button>
  );
}

export { categoryLabel };
export type { ServiceCategory };