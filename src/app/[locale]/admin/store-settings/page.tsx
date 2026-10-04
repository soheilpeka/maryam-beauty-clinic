import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdminSession } from "@/lib/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { StoreSettingsView } from "@/components/admin/store-settings-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return { title: `${t("storeSettingsTitle")} | ${t("title")}`, description: t("storeSettingsHint"), robots: { index: false, follow: false } };
}

export default async function AdminStoreSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const session = await requireAdminSession(locale);
  return <AdminPageShell locale={locale} title={t("storeSettingsTitle")} hint={t("storeSettingsHint")} adminName={session.name} adminEmail={session.email}><StoreSettingsView /></AdminPageShell>;
}
