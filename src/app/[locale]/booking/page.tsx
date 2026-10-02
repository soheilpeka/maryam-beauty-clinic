import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { BookingFlow } from "@/components/booking/booking-flow";
import type { Metadata } from "next";
import { PUBLIC_STAFF_WHERE } from "@/lib/public-staff";
import { publicServices } from "@/lib/public-content";

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
  searchParams: Promise<{ service?: string; staff?: string }>;
}) {
  const { locale } = await params;
  const { service: serviceSlug, staff: staffSlug } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Booking" });

  const [services, staff, setting, serviceContent] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.staff.findMany({
      where: PUBLIC_STAFF_WHERE,
      include: { services: true },
      orderBy: { name: "asc" },
    }),
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
          {staff.some(member => /^specialist-[123]$/.test(member.slug) && /^Specialist [123]$/.test(member.name)) && <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{locale === "fr" ? "Les profils numérotés sont des exemples temporaires; la composition finale de l’équipe reste à confirmer par la propriétaire." : "Numbered specialist profiles are temporary examples; the final team roster is awaiting owner confirmation."}</p>}
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
        staff={staff.map((s) => ({
          id: s.id, slug: s.slug, name: s.name, role: s.role,
          bio: locale === "fr" ? (s.bioFr ?? s.bio) : s.bio,
          serviceIds: s.services.map((x) => x.serviceId),
        }))}
        initialServiceSlug={serviceSlug}
        initialStaffSlug={staffSlug}
        locale={locale}
        bookingWindowDays={setting?.bookingWindowDays ?? 60}
      />
      </div>
    </div>
  );
}
