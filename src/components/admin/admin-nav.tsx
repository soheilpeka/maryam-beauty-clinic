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
  { key: "products", suffix: "/products" },
  { key: "packages", suffix: "/packages" },
  { key: "gallery", suffix: "/gallery" },
  { key: "orders", suffix: "/orders" },
  { key: "storeSettings", suffix: "/store-settings" },
] as const;

export function AdminNav({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("navLabel")}
      className="admin-navigation"
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
            className="transition-colors"
          >
            {t(section.key)}
          </Link>
        );
      })}
    </nav>
  );
}
