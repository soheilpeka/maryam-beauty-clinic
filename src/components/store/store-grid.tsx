"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ProductCard } from "@/components/store/product-card";
import type { ProductView } from "@/lib/store-views";
import { productPricing } from "@/lib/product-pricing";

type StoreCategory = { id: string; name: string; nameFr: string | null; order: number };

type Sort = "featured" | "price-asc" | "price-desc" | "name";

export function StoreGrid({
  products,
  categories,
  locale,
}: {
  products: ProductView[];
  categories: StoreCategory[];
  locale: string;
}) {
  const t = useTranslations("Store");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("featured");

  const shown = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    const filtered = products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesQuery =
        !normalized ||
        product.name.toLocaleLowerCase(locale).includes(normalized) ||
        product.description?.toLocaleLowerCase(locale).includes(normalized) ||
        product.sku.toLocaleLowerCase(locale).includes(normalized);
      return matchesCategory && matchesQuery;
    });
    return filtered.toSorted((a, b) => {
      if (sort === "price-asc") return productPricing(a).price - productPricing(b).price;
      if (sort === "price-desc") return productPricing(b).price - productPricing(a).price;
      if (sort === "name") return a.name.localeCompare(b.name, locale);
      return Number(b.featured) - Number(a.featured) || a.order - b.order || a.name.localeCompare(b.name, locale);
    });
  }, [category, locale, products, query, sort]);

  const clear = () => {
    setCategory("all");
    setQuery("");
    setSort("featured");
  };

  return (
    <div className="mt-10">
      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_13rem]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t("searchLabel")}
            </span>
            <span className="relative block">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground">
                <circle cx="11" cy="11" r="6.5" />
                <path strokeLinecap="round" d="m16 16 4 4" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="min-h-12 w-full rounded-2xl border border-border bg-background py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t("sortLabel")}
            </span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="min-h-12 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-brand focus:outline-none"
            >
              <option value="featured">{t("sortFeatured")}</option>
              <option value="price-asc">{t("sortPriceLow")}</option>
              <option value="price-desc">{t("sortPriceHigh")}</option>
              <option value="name">{t("sortName")}</option>
            </select>
          </label>
        </div>

        <fieldset className="mt-5 border-t border-border pt-4">
          <legend className="sr-only">{t("categoryLabel")}</legend>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterButton active={category === "all"} onClick={() => setCategory("all")}>
              {t("allCategories")}
            </FilterButton>
            {categories.map((item) => (
              <FilterButton key={item.id} active={category === item.name} onClick={() => setCategory(item.name)}>
                {locale === "fr" && item.nameFr ? item.nameFr : t.has("categories." + item.name) ? t(("categories." + item.name) as never) : item.name}
              </FilterButton>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-7 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">{t("resultsCount", { count: shown.length })}</p>
        {(query || category !== "all" || sort !== "featured") && (
          <button type="button" onClick={clear} className="text-sm font-medium text-brand underline-offset-4 hover:underline">
            {t("clearFilters")}
          </button>
        )}
      </div>

      {shown.length > 0 ? (
        <div className="store-grid mt-6">
          {shown.map((product) => <ProductCard key={product.slug} product={product} locale={locale} categories={categories} />)}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">{t("emptyCategory")}</p>
          <button type="button" onClick={clear} className="mt-5 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:border-brand hover:text-brand">
            {t("clearFilters")}
          </button>
        </div>
      )}
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-brand hover:text-brand")
      }
    >
      {children}
    </button>
  );
}
