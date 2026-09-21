import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export async function HeroSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Hero" });
  const tNav = await getTranslations({ locale, namespace: "Nav" });

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-[#faf8f6] to-brand-100 dark:from-[#241a14] dark:via-[#17130f] dark:to-[#241a14]">
      <div className="absolute inset-0 -z-10 opacity-40" aria-hidden="true">
        <div className="absolute left-1/4 top-10 h-72 w-72 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-700/30" />
        <div className="absolute right-1/4 bottom-0 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-800/30" />
      </div>
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-block animate-fade-in-up rounded-full border border-brand-300 bg-white/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:border-brand-700 dark:bg-white/5 dark:text-brand-300">
            {t("eyebrow")}
          </p>
          <h1 className="mt-6 animate-fade-in-up font-serif text-4xl font-bold leading-tight text-stone-900 sm:text-6xl dark:text-stone-50">
            {t("title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-fade-in-up text-lg text-stone-600 dark:text-stone-300">
            {t("subtitle")}
          </p>
          <div className="mt-10 flex animate-fade-in-up flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/booking"
              className="w-full rounded-full bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/20 transition-transform hover:scale-105 hover:bg-brand-700 sm:w-auto"
            >
              {t("cta")}
            </Link>
            <Link
              href="/#services"
              className="w-full rounded-full border border-stone-300 bg-white/70 px-8 py-4 text-base font-semibold text-stone-800 transition-colors hover:border-brand-400 hover:text-brand-600 sm:w-auto dark:border-stone-700 dark:bg-white/5 dark:text-stone-200 dark:hover:text-brand-400"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
          <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-6 text-center">
            {[
              { v: "12+", l: t("stat1") },
              { v: "4", l: t("stat2") },
              { v: "8+", l: t("stat3") },
            ].map((s) => (
              <div key={s.l}>
                <dt className="font-serif text-3xl font-bold text-brand-600 dark:text-brand-400 sm:text-4xl">
                  {s.v}
                </dt>
                <dd className="mt-1 text-xs text-stone-600 dark:text-stone-400 sm:text-sm">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}