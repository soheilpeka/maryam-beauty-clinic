import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdminSession } from "@/lib/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ServicesView } from "@/components/admin/services-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return {
    title: `${t("servicesTitle")} | ${t("title")}`,
    description: t("servicesHint"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const session = await requireAdminSession(locale);

  return (
    <AdminPageShell
      locale={locale}
      title={t("servicesTitle")}
      hint={t("servicesHint")}
      adminName={session.name}
      adminEmail={session.email}
    >
      <ServicesView locale={locale} />
    </AdminPageShell>
  );
}