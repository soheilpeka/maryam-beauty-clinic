import { getTranslations, setRequestLocale } from "next-intl/server";
import { GalleryFilter } from "@/components/gallery-filter";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

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
    alternates: { canonical: `/${locale}/gallery`, languages: { en: "/en/gallery", fr: "/fr/gallery" } },
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
  const records = await prisma.galleryItem.findMany({ where: { active: true }, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
  const items = records.map((item) => ({ slug: item.id, image: item.imageUrl, alt: (locale === "fr" ? item.altFr : item.altEn) ?? "", caption: locale === "fr" ? (item.captionFr ?? item.altFr ?? item.altText ?? "Gallery image") : (item.captionEn ?? item.altEn ?? item.altText ?? "Gallery image"), title: locale === "fr" ? (item.captionFr ?? item.altFr ?? item.title ?? "Gallery image") : (item.captionEn ?? item.altEn ?? item.title ?? "Gallery image"), tag: item.category }));

  return (
    <div className="editorial-page gallery-editorial">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">{t("galleryEyebrow")}</p>
          <h1 className="display-heading mt-4 text-4xl sm:text-5xl lg:text-6xl">
            {t("galleryTitle")}
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            {locale === "fr"
              ? "Cette galerie présente des images temporaires. Les réalisations finales, les légendes et les autorisations devront être approuvées avant le lancement."
              : "This gallery uses temporary example images. Final client work, captions and permissions must be approved before launch."}
          </p>
        </div>
        <div className="mt-14">
          <GalleryFilter items={items} />
        </div>
      </div>
    </div>
  );
}
