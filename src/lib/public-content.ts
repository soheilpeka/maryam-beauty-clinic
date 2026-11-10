import "server-only";
import { prisma } from "@/lib/prisma";
import { SERVICES, localizeService, consultation, consultationFr, normalizeServiceCategory, type Service } from "@/lib/content/services";
import { formatPrice } from "@/lib/content/format";
import { resolveServiceDescription } from "@/lib/content/service-copy";
import { SERVICE_PHOTOS } from "@/lib/content/service-photos";
import type { Locale } from "@/i18n/routing";
import { isPublicService } from "@/lib/public-service";

/** Database content is authoritative, including an intentionally empty/deactivated catalog. */
export async function publicServices(locale: Locale): Promise<Service[]> {
  const records = await prisma.service.findMany({ where: { active: true }, include: { images: { orderBy: { order: "asc" } } }, orderBy: [{ order: "asc" }, { name: "asc" }] });
  return records.filter(isPublicService).map((record) => {
    const source = SERVICES.find((item) => item.slug === record.slug);
    const fallback = source ? localizeService(source, locale) : undefined;
    const description = resolveServiceDescription(record.slug, locale === "fr" ? record.descriptionFr ?? record.description : record.description, locale);
    const ownerPhotos = SERVICE_PHOTOS[record.slug] ?? [];
    const images = record.images.length
      ? record.images.map(({ id, url, altEn, altFr }) => ({ id, url, altEn, altFr }))
      : ownerPhotos;
    return {
      slug: record.slug,
      name: locale === "fr" ? record.nameFr ?? record.name : record.name,
      summary: description?.summary || fallback?.summary || "",
      detail: description?.detail ?? fallback?.detail,
      // Preserve custom CMS categories so every public menu can group them dynamically.
      category: normalizeServiceCategory(record.category),
      price: record.price, duration: record.duration, order: record.order,
      priceLabel: record.price > 0 ? formatPrice(record.price, locale) : locale === "fr" ? consultationFr : consultation,
      image: record.slug === "rf-microneedling"
        ? "/media/services/rf-microneedling/featured.jpeg"
        : record.imageUrl ?? record.images[0]?.url ?? ownerPhotos[0]?.url ?? fallback?.image ?? "/preview/salon-generated.png",
      images: record.slug === "rf-microneedling" ? ownerPhotos : images,
    };
  });
}
