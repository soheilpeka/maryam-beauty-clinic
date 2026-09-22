"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { SERVICES, SERVICE_CATEGORIES, categoryLabel } from "@/lib/content/services";
import type { ServiceCategory } from "@/lib/content/services";
import { formatPrice, formatDuration } from "@/lib/content/format";
import type { Locale } from "@/i18n/routing";

/**
 * Complete service catalog with category filtering. Every one of the 24 services is
 * listed - nothing is hidden behind a "popular" filter.
 */
export function ServiceCatalog({ locale }: { locale: Locale }) {
  const t = useTranslations("Services");
  const tNav = useTranslations("Nav");
  const [active, setActive] = useState<ServiceCategory | "All">("All");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICES.filter((s) => {
      const catOk = active === "All" || s.category === active;
      const qOk =
        q === "" ||
        s.name.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [active, query]);

  const tabs: (ServiceCategory | "All")[] = ["All", ...SERVICE_CATEGORIES];

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col gap-6 border-b border-border pb-8">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-colors sm:text-sm ${
                active === tab
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-foreground hover:border-brand hover:text-brand"
              }`}
              aria-pressed={active === tab}
            >
              {tab === "All" ? t("all") : categoryLabel(tab, locale)}
            </button>
          ))}
        </div>

        <div className="relative max-w-md">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="6" />
            <path strokeLinecap="round" d="M13.5 13.5L18 18" />
          </svg>
          <label htmlFor="service-search" className="sr-only">
            {tNav("search")}
          </label>
          <input
            id="service-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tNav("search")}
            className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {/* Results */}
      <p className="mt-8 text-sm text-muted-foreground" aria-live="polite">
        {visible.length} {visible.length === 1 ? t("all").replace("All Services", "service") : t("all").replace("All Services", "services")}
      </p>

      {visible.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-serif text-xl">{t("all")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{tNav("search")}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <div key={s.slug} className="flex flex-col bg-background p-7">
              <div className="mb-5 aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image}
                  alt={s.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                {categoryLabel(s.category, locale)}
              </p>
              <h3 className="mt-2 font-serif text-xl">{s.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {s.summary}
              </p>
              <div className="mt-5 flex items-baseline justify-between border-t border-border pt-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.priceLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(s.duration, locale)}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Link
                  href={`/service-page/${s.slug}`}
                  className="flex-1 rounded-full border border-border px-4 py-2.5 text-center text-xs font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
                >
                  {t("moreInfo")}
                </Link>
                <Link
                  href={`/booking?service=${s.slug}`}
                  className="flex-1 rounded-full bg-primary px-4 py-2.5 text-center text-xs font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.03]"
                >
                  {t("bookNow")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { formatPrice };