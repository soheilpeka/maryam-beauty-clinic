import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/sessions";
import { env } from "@/lib/env";
import { RequestsView } from "@/components/admin/requests-view";
import { AdminPageShell } from "@/components/admin/admin-page-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return {
    title: `${t("requestsTitle")} | ${t("title")}`,
    description: t("requestsHint"),
    robots: { index: false, follow: false },
  };
}

/**
 * Server-side gate for the Requests view. The UI hiding links is not protection, so the
 * page itself resolves the session cookie and bounces unauthenticated visitors to sign-in
 * before any booking data reaches the client. The list is then loaded from
 * /api/admin/requests, which authorizes again on every request.
 */
export default async function AdminRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const token = (await cookies()).get(env.sessionCookieName)?.value;
  const session = await getSession(token);
  if (!session) {
    redirect(`/${locale}/admin/login`);
  }

  const t = await getTranslations({ locale, namespace: "Admin" });

  return (
    <AdminPageShell
      locale={locale}
      title={t("requestsTitle")}
      hint={t("requestsHint")}
      adminName={session.name}
      adminEmail={session.email}
    >
      <RequestsView locale={locale} />
    </AdminPageShell>
  );
}
