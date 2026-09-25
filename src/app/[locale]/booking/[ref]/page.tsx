import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyBookingToken } from "@/lib/tokens";
import { ManageBooking } from "@/components/booking/manage-booking";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; ref: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return { title: `${t("bookingTitle")}`, robots: { index: false, follow: false } };
}

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; ref: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale, ref } = await params;
  const { t: token } = await searchParams;
  setRequestLocale(locale);

  if (!token) notFound();

  // The public URL uses the booking ref while the signed token carries the booking id,
  // so resolve the ref to its row and confirm the token matches it.
  const payload = await verifyBookingToken(token);
  if (!payload) notFound();

  const booking = await prisma.booking.findUnique({
    where: { ref },
    include: { customer: true, service: true, staff: true },
  });
  if (!booking || booking.id !== payload.sub || booking.customerId !== payload.cust) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <ManageBooking
        booking={{
          ref: booking.ref,
          status: booking.status,
          startUtc: booking.startUtc.toISOString(),
          endUtc: booking.endUtc.toISOString(),
          priceTotal: booking.priceTotal,
          serviceName: booking.service.name,
          staffName: booking.staff.name,
          durationMin: booking.service.duration,
          customerName: booking.customer.name,
          customerEmail: booking.customer.email,
        }}
        token={token}
        locale={locale}
      />
    </div>
  );
}
