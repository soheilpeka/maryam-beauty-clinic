import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { BookingFlow } from "@/components/booking/booking-flow";
import type { Metadata } from "next";
import { publicServices } from "@/lib/public-content";
import { isPublicService } from "@/lib/public-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: t("bookingTitle"), description: t("bookingDescription"), alternates: { canonical: `/${locale}/booking`, languages: { en: "/en/booking", fr: "/fr/booking" } } };
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { locale } = await params;
  const { service: serviceSlug } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Booking" });

  const [services, setting, serviceContent] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { order: "asc" } }).then(services => services.filter(isPublicService)),
    prisma.businessSetting.findUnique({ where: { id: "default" } }),
    publicServices(locale === "fr" ? "fr" : "en"),
  ]);

  return (
    <div className="editorial-page booking-editorial">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="eyebrow">Maryam C Beauté · Brossard</p>
          <h1 className="display-heading mt-4 max-w-4xl text-5xl sm:text-6xl lg:text-7xl">{t("title")}</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">{t("dateHint")}</p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
      <BookingFlow
        services={services.map((s) => ({
          id: s.id, slug: s.slug,
          name: locale === "fr" ? (s.nameFr ?? s.name) : s.name,
          description: serviceContent.find((item) => item.slug === s.slug)?.summary ?? (locale === "fr" ? (s.descriptionFr ?? s.description) : s.description),
          price: s.price, duration: s.duration, bufferMin: s.bufferMin, category: s.category,
        }))}
        initialServiceSlug={serviceSlug}
        locale={locale}
        bookingWindowDays={setting?.bookingWindowDays ?? 60}
      />
      </div>
    </div>
  );
}
