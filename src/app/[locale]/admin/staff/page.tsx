import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdminSession } from "@/lib/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { StaffView } from "@/components/admin/staff-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return {
    title: `${t("staffTitle")} | ${t("title")}`,
    description: t("staffHint"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminStaffPage({
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
      title={t("staffTitle")}
      hint={t("staffHint")}
      adminName={session.name}
      adminEmail={session.email}
    >
      <StaffView locale={locale} />
    </AdminPageShell>
  );
}