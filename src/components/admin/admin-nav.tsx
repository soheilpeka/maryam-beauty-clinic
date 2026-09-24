"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Admin section navigation. Every entry is a plain link so the whole dashboard is usable
 * without JavaScript, and the active section is marked with aria-current for screen readers.
 */
const SECTIONS = [
  { key: "dashboard", suffix: "" },
  { key: "requests", suffix: "/requests" },
  { key: "services", suffix: "/services" },
  { key: "staff", suffix: "/staff" },
  { key: "customers", suffix: "/customers" },
] as const;

export function AdminNav({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("navLabel")}
      className="mb-8 flex flex-wrap gap-1.5 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-sm dark:border-stone-800 dark:bg-[#1a1512]"
    >
      {SECTIONS.map((section) => {
        const href = `/${locale}/admin${section.suffix}`;
        const active =
          section.suffix === "" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={section.key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 " +
              (active
                ? "bg-brand-600 text-white"
                : "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800")
            }
          >
            {t(section.key)}
          </Link>
        );
      })}
    </nav>
  );
}