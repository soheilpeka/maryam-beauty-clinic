"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useCart } from "@/components/store/cart-context";

/**
 * Cart icon for the site header. Renders an empty shell until the persisted cart has been
 * read on the client (ready), so server and first client markup agree.
 */
export function CartBadge() {
  const t = useTranslations("Store");
  const { count, ready } = useCart();

  return (
    <Link
      href="/store/cart"
      className="relative inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
      aria-label={t("cartWithCount", { count })}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.9a2 2 0 002-1.55L20.5 8H6" />
        <circle cx="10" cy="20" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="17.5" cy="20" r="1.3" fill="currentColor" stroke="none" />
      </svg>
      <span>{t("cart")}</span>
      {ready && count > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold text-brand-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}
