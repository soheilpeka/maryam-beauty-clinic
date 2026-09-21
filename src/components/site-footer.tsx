import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

export async function SiteFooter() {
  const t = useTranslations("Footer");
  const tNav = useTranslations("Nav");
  const setting = await prisma.businessSetting.findUnique({ where: { id: "default" } });

  return (
    <footer className="border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-[#1c1713]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-50">
            Maryam Beauty Clinic
          </p>
          <p className="mt-3 max-w-sm text-sm text-stone-600 dark:text-stone-400">
            {t("about")}
          </p>
          <p className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            {t("demoNotice")}
          </p>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {t("quickLinks")}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/booking" className="text-stone-600 hover:text-brand-600 dark:text-stone-400 dark:hover:text-brand-400">{tNav("book")}</Link></li>
            <li><Link href="/#services" className="text-stone-600 hover:text-brand-600 dark:text-stone-400 dark:hover:text-brand-400">{tNav("services")}</Link></li>
            <li><Link href="/#faq" className="text-stone-600 hover:text-brand-600 dark:text-stone-400 dark:hover:text-brand-400">{tNav("faq")}</Link></li>
            <li><Link href="/admin/login" className="text-stone-600 hover:text-brand-600 dark:text-stone-400 dark:hover:text-brand-400">{tNav("admin")}</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {t("contact")}
          </h2>
          {setting && (
            <ul className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-400">
              {setting.phone && <li>{setting.phone}</li>}
              {setting.email && <li>{setting.email}</li>}
              {setting.address && <li>{setting.address}</li>}
              {setting.city && <li>{setting.city}</li>}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-stone-200 py-6 text-center text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
        © {new Date().getFullYear()} Maryam Beauty Clinic. {t("rights")}
      </div>
    </footer>
  );
}