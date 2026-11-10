import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdminSession } from "@/lib/admin-page";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function MessagesPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAdminSession(locale);
  const t = await getTranslations({ locale, namespace: "Admin" });
  const requested = Number((await searchParams).page ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * 30, take: 31 });
  return <AdminPageShell locale={locale} title={t("contactMessages")} hint={t("contactMessagesHint")} adminName={session.name} adminEmail={session.email}>
    <div className="space-y-4">
      {!messages.length && <p className="p-6 text-muted-foreground">{t("contactMessagesEmpty")}</p>}
      {messages.slice(0, 30).map(message => <article key={message.id} className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold break-words">{message.name}</h2>
          <time className="text-sm text-muted-foreground" dateTime={message.createdAt.toISOString()}>{message.createdAt.toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", { timeZone: "America/Toronto" })}</time>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a className="break-all underline" href={`mailto:${message.email}`}>{message.email}</a>
          <a className="underline" href={`tel:${message.phone.replace(/[^+\d]/g, "")}`}>{message.phone}</a>
        </div>
        <p className="mt-5 whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
        <p className="mt-4 text-xs text-muted-foreground">{t("contactDelivery")}: {t(`contactDelivery_${["provider", "mock", "failed"].includes(message.delivery) ? message.delivery : "pending"}`)}</p>
      </article>)}
      <nav className="flex gap-6 text-sm" aria-label={t("contactMessages")}>
        {page > 1 && <a className="underline" href={`?page=${page - 1}`}>← {page - 1}</a>}
        {messages.length > 30 && <a className="underline" href={`?page=${page + 1}`}>{page + 1} →</a>}
      </nav>
    </div>
  </AdminPageShell>;
}
