import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdminSession } from "@/lib/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProductsView } from "@/components/admin/products-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `${t("productsTitle")} | ${t("title")}`, description: t("productsHint"), robots: { index: false, follow: false } };
}

export default async function AdminProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const session = await requireAdminSession(locale);
  return <AdminPageShell locale={locale} title={t("productsTitle")} hint={t("productsHint")} adminName={session.name} adminEmail={session.email}><ProductsView locale={locale} /></AdminPageShell>;
}
