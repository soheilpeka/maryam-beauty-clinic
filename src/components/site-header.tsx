"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useTheme } from "@/components/theme-provider";
import { routing, type Locale } from "@/i18n/routing";

export function SiteHeader() {
  const t = useTranslations("Nav");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const links = [
    { href: "/#services", label: t("services") },
    { href: "/#team", label: t("staff") },
    { href: "/#gallery", label: t("gallery") },
    { href: "/#reviews", label: t("reviews") },
    { href: "/#faq", label: t("faq") },
    { href: "/#contact", label: t("contact") },
  ] as const;

  const otherLocale: Locale = locale === "en" ? "fr" : "en";

  function switchLocale() {
    startTransition(() => {
      router.replace(pathname, { locale: otherLocale });
    });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/70 bg-[#faf8f6]/85 backdrop-blur-md dark:border-stone-800 dark:bg-[#17130f]/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-serif text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-50"
          aria-label="Maryam Beauty Clinic"
        >
          Maryam <span className="text-brand-600 dark:text-brand-400">Beauty</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-stone-700 transition-colors hover:text-brand-600 dark:text-stone-300 dark:hover:text-brand-400"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={switchLocale}
            disabled={isPending}
            aria-label={t("switchLanguage")}
            className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:text-brand-400"
          >
            {otherLocale.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t("toggleTheme")}
            className="rounded-full border border-stone-300 p-1.5 text-stone-700 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-stone-700 dark:text-stone-300 dark:hover:text-brand-400"
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          </button>
          <Link
            href="/booking"
            className="hidden rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 hover:bg-brand-700 sm:inline-block"
          >
            {t("book")}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            className="rounded-md border border-stone-300 p-2 text-stone-700 md:hidden dark:border-stone-700 dark:text-stone-300"
          >
            <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-stone-200 bg-[#faf8f6] px-4 py-3 md:hidden dark:border-stone-800 dark:bg-[#17130f]" aria-label="Mobile">
          <ul className="flex flex-col gap-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md px-2 py-2 text-sm font-medium text-stone-700 hover:bg-brand-50 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/booking"
                onClick={() => setMenuOpen(false)}
                className="mt-2 block rounded-full bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white"
              >
                {t("book")}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}