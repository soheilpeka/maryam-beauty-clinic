import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdminSession } from "@/lib/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { PackagesView } from "@/components/admin/packages-view";
export const dynamic = "force-dynamic";
export default async function AdminPackagesPage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; setRequestLocale(locale); const t = await getTranslations({ locale, namespace: "Admin" }); const session = await requireAdminSession(locale); return <AdminPageShell locale={locale} title={t("packagesTitle")} hint={t("packagesHint")} adminName={session.name} adminEmail={session.email}><PackagesView locale={locale} /></AdminPageShell>; }
