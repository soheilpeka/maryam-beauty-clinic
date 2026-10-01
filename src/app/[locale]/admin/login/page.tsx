import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return {
    title: t("signIn"),
    description: t("title"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });

  return (
    <div className="admin-login editorial-page">
      <div className="admin-login-intro">
        <p className="eyebrow">Maryam C Beauté</p>
        <h1>
          {t("signIn")}
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          {t("signInHint")}
        </p>
      </div>
      <div className="admin-login-form"><LoginForm locale={locale} /></div>
    </div>
  );
}
