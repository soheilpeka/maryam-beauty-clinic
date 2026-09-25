import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { BookingFlow } from "@/components/booking/booking-flow";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: t("bookingTitle"), description: t("bookingDescription") };
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

  const [services, staff, setting] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.staff.findMany({
      where: { active: true },
      include: { services: true },
      orderBy: { name: "asc" },
    }),
    prisma.businessSetting.findUnique({ where: { id: "default" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <BookingFlow
        services={services.map((s) => ({
          id: s.id, slug: s.slug, name: s.name, description: s.description,
          price: s.price, duration: s.duration, bufferMin: s.bufferMin, category: s.category,
        }))}
        staff={staff.map((s) => ({
          id: s.id, slug: s.slug, name: s.name, role: s.role, bio: s.bio,
          serviceIds: s.services.map((x) => x.serviceId),
        }))}
        initialServiceSlug={serviceSlug}
        initialStaffSlug={staffSlug}
        locale={locale}
        bookingWindowDays={setting?.bookingWindowDays ?? 60}
      />
    </div>
  );
}
