import { getTranslations, setRequestLocale } from "next-intl/server";
import { GiftCardForm } from "@/components/gift-card-form";
import { BUSINESS } from "@/lib/content/business";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("giftCardTitle"),
    description: t("giftCardDescription"),
    alternates: { canonical: `/${locale}/gift-card` },
  };
}

export default async function GiftCardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "GiftCard" });

  return (
    <div className="bg-background">
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
        <div>
          <p className="eyebrow">{t("title")}</p>
          <h1 className="display-heading mt-4 text-4xl sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>
          <div className="mt-10 aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/gallery-2.png"
              alt="Maryam Beauty Clinic gift card"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            {BUSINESS.neighborhood} &middot; {BUSINESS.address}
          </p>
        </div>

        <div>
          <GiftCardForm />
        </div>
      </div>
    </div>
  );
}