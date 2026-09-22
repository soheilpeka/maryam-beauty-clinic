import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { BUSINESS } from "@/lib/content/business";
import { SERVICES, SERVICE_CATEGORIES } from "@/lib/content/services";
import { BLOG_CATEGORIES } from "@/lib/content/blog";
import type { Locale } from "@/i18n/routing";

/**
 * Editorial footer: brand statement, complete treatment index by category, quick links,
 * real contact details and opening hours. Mirrors the header's full catalog so every
 * service remains one click away.
 */
export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tNav = await getTranslations("Nav");
  const tServices = await getTranslations("Services");

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex flex-col">
              <span className="font-serif text-xl tracking-tight">Maryam</span>
              <span className="font-serif text-xl tracking-tight text-brand">
                Beauty Clinic
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("tagline")}
            </p>
            <div className="mt-6 flex gap-3">
              {BUSINESS.social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-brand hover:text-brand"
                  aria-label={s.label}
                >
                  <span className="text-xs font-semibold">{s.label[0]}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Treatments index */}
          <div className="lg:col-span-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand">
              {t("treatments")}
            </p>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {SERVICE_CATEGORIES.map((cat) => (
                <div key={cat}>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {tServices(`categories.${cat}` as never)}
                  </p>
                  <ul className="space-y-1.5">
                    {SERVICES.filter((s) => s.category === cat)
                      .slice(0, 6)
                      .map((s) => (
                        <li key={s.slug}>
                          <Link
                            href={`/service-page/${s.slug}`}
                            className="text-xs text-muted-foreground transition-colors hover:text-brand"
                          >
                            {s.name}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Contact + hours */}
          <div className="lg:col-span-3">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand">
              {t("contact")}
            </p>
            <address className="space-y-3 text-sm not-italic text-muted-foreground">
              <div>
                <p className="text-foreground">{BUSINESS.neighborhood}</p>
                <p>{BUSINESS.address}</p>
              </div>
              <div>
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
              </div>
            </address>

            <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-widest text-brand">
              {t("hours")}
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {BUSINESS.hours.map((row) => (
                <li key={row.days} className="flex justify-between gap-4">
                  <span>{row.days}</span>
                  <span className="text-foreground/80">{row.open}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("rights").replace("2026", String(year))}</p>
          <p className="text-muted-foreground/70">{t("demoNotice")}</p>
        </div>
      </div>
    </footer>
  );
}

export { BLOG_CATEGORIES };
export type { Locale };