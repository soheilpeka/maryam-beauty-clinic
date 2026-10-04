"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link, useRouter, usePathname as useLocalePathname } from "@/i18n/routing";
import { SERVICES, SERVICE_CATEGORIES, categoryLabel, localizeService } from "@/lib/content/services";
import type { ServiceCategory } from "@/lib/content/services";
import type { Service } from "@/lib/content/services";
import { BUSINESS } from "@/lib/content/business";
import { Locale } from "@/i18n/routing";
import { CartBadge } from "@/components/store/cart-badge";
import { BOOKING_URL } from "@/lib/site-config";

/**
 * Premium site header: sticky, hairline-bordered, with a "Treatments" mega dropdown that
 * groups the complete catalog by category (so no service is hidden behind a "popular"
 * filter), plus a purpose-built mobile drawer.
 */
export function SiteHeader({ services = [] }: { services?: Service[] }) {
  const t = useTranslations("Nav");
  const locale = (useLocale() === "fr" ? "fr" : "en") as Locale;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [treatmentsOpen, setTreatmentsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const rawPath = usePathname();
  const localePath = useLocalePathname();
  const instagram = BUSINESS.social.find(social => social.label.toLowerCase() === "instagram");
  const facebook = BUSINESS.social.find(social => social.label.toLowerCase() === "facebook");
  const showMobileCta = !mobileOpen && !/^\/(booking|admin|store)(\/|$)/.test(localePath);

  // Close everything on route change.
  useEffect(() => {
    setMobileOpen(false);
    setTreatmentsOpen(false);
  }, [rawPath]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    const regions = [document.getElementById("main"), document.querySelector("footer")];
    regions.forEach(region => { if (region) region.inert = mobileOpen; });
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setMobileOpen(false); setTreatmentsOpen(false); menuButton.current?.focus(); } };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = "";
      regions.forEach(region => { if (region) region.inert = false; });
      document.removeEventListener("keydown", escape);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = [menuButton.current, ...Array.from(drawer.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') ?? [])].filter((node): node is HTMLElement => !!node && node.getClientRects().length > 0);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [mobileOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onTreatmentsEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setTreatmentsOpen(true);
  };
  const onTreatmentsLeave = () => {
    closeTimer.current = setTimeout(() => setTreatmentsOpen(false), 150);
  };

  return (
    <>
    <header
      className={`sticky top-0 z-50 w-full border-b transition-colors duration-300 ${
        scrolled || mobileOpen
          ? "site-header border-border backdrop-blur-md"
          : "site-header border-transparent"
      }`}
    >
      <div className="site-header-inner flex w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-70"
          aria-label="Maryam C Beauté home"
        >
          <img src="/preview/logo.png" alt="Maryam C Beauté" className="h-12 w-28 object-contain" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 xl:flex" aria-label="Main">
          <Link href="/" className="text-sm" aria-current={localePath === "/" ? "page" : undefined}>{locale === "fr" ? "Accueil" : "Home"}</Link>
          <div
            className="treatment-menu"
            onMouseEnter={onTreatmentsEnter}
            onMouseLeave={onTreatmentsLeave}
          >
            <button
              type="button"
              onClick={(event) => setTreatmentsOpen((open) => event.detail === 0 ? !open : true)}
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
                          {services.filter((s) => s.category === cat).map((s) => {
                            return (
                            <li key={s.slug}>
                              <Link
                                href={`/service-page/${s.slug}`}
                                className="group flex items-baseline justify-between gap-3 text-sm text-foreground transition-colors hover:text-brand"
                              >
                                <span>{s.name}</span>
                              </Link>
                            </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-border bg-muted/50 px-6 py-3 xl:px-8">
                    <p className="text-xs text-muted-foreground">
                      {services.length} {t("allServices").toLowerCase()}
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

          <Link href="/pricing-plans/packages" className="text-sm font-medium text-foreground" aria-current={localePath === "/pricing-plans/packages" ? "page" : undefined}>
            {locale === "fr" ? "Forfaits" : "Packages"}
          </Link>
          <Link
            href="/store"
            className="text-sm font-medium text-foreground transition-colors hover:text-brand"
          >
            {t("store")}
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-foreground transition-colors hover:text-brand"
          >
            {t("about")}
          </Link>
          <Link
            href="/gallery"
            className="text-sm font-medium text-foreground transition-colors hover:text-brand"
          >
            {t("results")}
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-foreground transition-colors hover:text-brand"
          >
            {t("contact")}
          </Link>
        </nav>

        {/* Right actions */}
        <div className="site-header-actions flex items-center gap-2 sm:gap-3">
          {instagram && <a className="header-social" href={instagram.href} target="_blank" rel="noopener noreferrer" aria-label={locale === "fr" ? "Maryam C Beauté sur Instagram" : "Maryam C Beauté on Instagram"}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></svg>
            <span>Instagram</span>
          </a>}
          {facebook && <a className="header-social" href={facebook.href} target="_blank" rel="noopener noreferrer" aria-label={locale === "fr" ? "Maryam C Beauté sur Facebook" : "Maryam C Beauté on Facebook"}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2v-2c0-.9.3-1.5 1.6-1.5H17V4.2c-.3 0-1.3-.2-2.4-.2-2.5 0-4.2 1.5-4.2 4.3v2.4H7.6v3.2h2.8V22z" /></svg>
            <span>Facebook</span>
          </a>}
          <div className="hidden sm:block"><CartBadge /></div>
          <LanguageSwitcher />

          <Link
            href={BOOKING_URL}
            className="hidden rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.03] sm:inline-flex"
          >
            {locale === "fr" ? "Réserver" : "Book now"}
          </Link>

          {/* Mobile menu button */}
          <button
            ref={menuButton}
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted xl:hidden"
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

    </header>

    {showMobileCta && <div className="mobile-consultation"><span>{locale === "fr" ? "Pensé autour de vous." : "Thoughtfully yours."}</span><Link href={BOOKING_URL}>{locale === "fr" ? "Demander un rendez-vous" : "Request an appointment"}<span aria-hidden="true">↗</span></Link></div>}

    {/*
      Mobile drawer, rendered OUTSIDE the <header> as a viewport-level overlay. The header
      gains backdrop-filter while the drawer is open, and backdrop-filter becomes the
      containing block for any fixed descendant, so a drawer nested inside the header was
      clamped to the header box instead of covering the viewport - its links then sat
      under the sticky bar and page content and were unclickable. The drawer offset keeps the bar and
      its close button visible; z-[60] lifts the drawer above the header and page content.
    */}
    {mobileOpen && (
      <div ref={drawer} className="site-mobile-drawer fixed inset-0 z-[60] overflow-y-auto bg-background xl:hidden">
          <nav className="mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-6" aria-label="Mobile">
            <MobileSection title={t("treatments")}>
              {SERVICE_CATEGORIES.map((cat) => (
                <div key={cat} className="py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand">
                    {categoryLabel(cat, locale)}
                  </p>
                  <ul className="space-y-1">
                    {services.filter((s) => s.category === cat).map((s) => {
                      return (
                      <li key={s.slug}>
                        <Link
                          href={`/service-page/${s.slug}`}
                          className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-muted"
                        >
                          <span>{s.name}</span>
                        </Link>
                      </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </MobileSection>

            <MobileSection title={t("clinic")}>
              <Link href="/pricing-plans/packages" className="block rounded-lg px-2 py-2.5 text-sm hover:bg-muted">{locale === "fr" ? "Forfaits" : "Packages"}</Link>
              <Link href="/store" className="block rounded-lg px-2 py-2.5 text-sm hover:bg-muted">{t("store")}</Link>
              <Link href="/about" className="block rounded-lg px-2 py-2.5 text-sm hover:bg-muted">{t("about")}</Link>
              <Link href="/store/cart" className="block rounded-lg px-2 py-2.5 text-sm hover:bg-muted">{t("cart")}</Link>
              <Link href="/gallery" className="block rounded-lg px-2 py-2.5 text-sm hover:bg-muted">{t("results")}</Link>
              <Link href="/contact" className="block rounded-lg px-2 py-2.5 text-sm hover:bg-muted">{t("contact")}</Link>
            </MobileSection>

            <div className="mt-6">
              <Link
                href={BOOKING_URL}
                className="flex w-full items-center justify-center rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground"
              >
                {t("book")}
              </Link>
            </div>
            <div className="mt-6 flex gap-4 text-xs uppercase tracking-widest">{BUSINESS.social.map(social => <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer">{social.label}</a>)}</div>
          </nav>
        </div>
      )}
    </>
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
  const locale: Locale = (useLocale() === "fr" ? "fr" : "en") as Locale;
  const other = locale === "en" ? "fr" : "en";

  return (
    <button
      type="button"
      onClick={() => router.replace(`${pathname}${window.location.search}${window.location.hash}`, { locale: other })}
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
