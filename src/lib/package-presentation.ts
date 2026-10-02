import { SKIN_PROGRAMS } from "@/lib/content/skin-programs";
import { formatPrice } from "@/lib/content/format";
import { packageCopy } from "@/lib/content/skin-programs-fr";

type Record = { slug: string; name: string; nameFr: string; description: string | null; descriptionFr: string | null; price: number; sessions: number; badge: string | null; validityDays: number | null; services: { service: { active: boolean; name: string; nameFr: string | null } }[] };

/** CMS controls publication and core values; owner-supplied artwork supplies extended program detail. */
export function presentPackage(record: Record, locale: string) {
  const source = SKIN_PROGRAMS.find(p => p.slug === record.slug);
  const language = locale === "fr" ? "fr" : "en";
  const price = (text: string) => formatPrice(Math.round(Number(text.replace(/[^\d.]/g, "")) * 100), language);
  const unchangedPrice = source && record.price === Number(source.price.replace(/[^\d.]/g, "")) * 100;
  return {
    slug: record.slug,
    name: language === "fr" ? record.nameFr : record.name,
    description: (language === "fr" ? record.descriptionFr : record.description) ?? "",
    strapline: source ? packageCopy(source.strapline, locale) : record.badge ?? "",
    stats: source && record.sessions === (record.slug === "discovery" ? 1 : Number(source.stats[0].match(/\d+/)?.[0])) ? source.stats : [language === "fr" ? `${record.sessions} séances` : `${record.sessions} sessions`],
    included: source?.included ?? record.services.filter(link => link.service.active).map(link => language === "fr" ? link.service.nameFr ?? link.service.name : link.service.name),
    idealFor: source?.idealFor ?? [],
    price: formatPrice(record.price, language),
    count: record.slug === "discovery" ? 3 : record.sessions,
    regular: source && unchangedPrice ? price(source.regular) : "",
    saving: source && unchangedPrice ? record.slug === "discovery" ? packageCopy(source.saving, locale) : language === "fr" ? `Économisez ${price(source.saving)}` : source.saving : "",
    payment: source?.payment && unchangedPrice ? `${price(source.payment.split("/")[0])}/month · ${source.payment.split(" · ").slice(1).join(" · ")}` : undefined,
  };
}
