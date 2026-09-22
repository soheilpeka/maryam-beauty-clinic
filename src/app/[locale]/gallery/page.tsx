import { getTranslations, setRequestLocale } from "next-intl/server";
import { GalleryFilter } from "@/components/gallery-filter";
import { GALLERY_INTRO } from "@/lib/content/gallery";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("galleryTitle"),
    description: t("galleryDescription"),
    alternates: { canonical: `/${locale}/gallery` },
  };
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Sections" });

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">{t("galleryEyebrow")}</p>
          <h1 className="display-heading mt-4 text-4xl sm:text-5xl lg:text-6xl">
            {t("galleryTitle")}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            {GALLERY_INTRO}
          </p>
        </div>
        <div className="mt-14">
          <GalleryFilter />
        </div>
      </div>
    </div>
  );
}