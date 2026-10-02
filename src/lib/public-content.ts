import "server-only";
import { prisma } from "@/lib/prisma";
import { SERVICES, localizeService, consultation, consultationFr, type Service } from "@/lib/content/services";
import { formatPrice } from "@/lib/content/format";
import { resolveServiceDescription } from "@/lib/content/service-copy";
import type { Locale } from "@/i18n/routing";

/** Database content is authoritative, including an intentionally empty/deactivated catalog. */
export async function publicServices(locale: Locale): Promise<Service[]> {
  const records = await prisma.service.findMany({ where: { active: true }, include: { images: { orderBy: { order: "asc" } } }, orderBy: [{ order: "asc" }, { name: "asc" }] });
  return records.map((record) => {
    const source = SERVICES.find((item) => item.slug === record.slug);
    const fallback = source ? localizeService(source, locale) : undefined;
    const description = resolveServiceDescription(record.slug, locale === "fr" ? record.descriptionFr ?? record.description : record.description, locale);
    return {
      slug: record.slug,
      name: locale === "fr" ? record.nameFr ?? record.name : record.name,
      summary: description?.summary ?? fallback?.summary ?? "",
      detail: description?.detail ?? fallback?.detail,
      category: (["Hair", "Makeup", "Aesthetic", "Wellness"].includes(record.category) ? record.category : "Aesthetic") as Service["category"],
      price: record.price, duration: record.duration, order: record.order,
      priceLabel: record.price > 0 ? formatPrice(record.price, locale) : locale === "fr" ? consultationFr : consultation,
      image: record.imageUrl ?? record.images[0]?.url ?? fallback?.image ?? "/preview/salon-generated.png",
    };
  });
}
