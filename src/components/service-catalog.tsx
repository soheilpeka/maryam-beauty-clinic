"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { SERVICES, categoryLabel, serviceCategoriesFor } from "@/lib/content/services";
import type { Service } from "@/lib/content/services";
import type { Locale } from "@/i18n/routing";

/**
 * Complete service catalog with search and category filtering. Public data is supplied by
 * the database so an admin save is reflected here without a source edit.
 */
export function ServiceCatalog({ locale, services = SERVICES }: { locale: Locale; services?: Service[] }) {
  const t = useTranslations("Services");
  const tNav = useTranslations("Nav");
  const [active, setActive] = useState<string>("All");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      const catOk = active === "All" || s.category === active;
      const qOk =
        q === "" ||
        s.name.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [active, query, services]);

  const tabs = ["All", ...serviceCategoriesFor(services)];

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
        {t("resultsCount", { count: visible.length })}
      </p>

      {visible.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-serif text-2xl">{t("noResults")}</p>
          <button
            type="button"
            onClick={() => { setActive("All"); setQuery(""); }}
            className="mt-5 rounded-full border border-border px-5 py-2.5 text-sm transition-colors hover:border-brand hover:text-brand"
          >
            {t("all")}
          </button>
        </div>
      ) : (
        <div className="service-editorial-grid mt-6 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <div key={s.slug} className="service-discovery-card group flex flex-col border-b border-border pb-8">
              <div className="mb-5 aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image}
                  alt={s.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
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
              <div className="mt-5 border-t border-border pt-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{t("duration")}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{s.duration > 0 ? `${s.duration} ${t("min")}` : t("consultationDuration")}</p>
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
