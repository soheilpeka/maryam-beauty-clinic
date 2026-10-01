import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdminSession } from "@/lib/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { OrdersView } from "@/components/admin/orders-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `${t("ordersTitle")} | ${t("title")}`, description: t("ordersHint"), robots: { index: false, follow: false } };
}

export default async function AdminOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const session = await requireAdminSession(locale);
  return <AdminPageShell locale={locale} title={t("ordersTitle")} hint={t("ordersHint")} adminName={session.name} adminEmail={session.email}><OrdersView locale={locale} /></AdminPageShell>;
}
