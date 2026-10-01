import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdminSession } from "@/lib/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { GalleryAdminView } from "@/components/admin/gallery-admin-view";
export const dynamic = "force-dynamic";
export default async function AdminGalleryPage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; setRequestLocale(locale); const t = await getTranslations({ locale, namespace: "Admin" }); const session = await requireAdminSession(locale); return <AdminPageShell locale={locale} title={t("galleryAdminTitle")} hint={t("galleryAdminHint")} adminName={session.name} adminEmail={session.email}><GalleryAdminView locale={locale} /></AdminPageShell>; }
