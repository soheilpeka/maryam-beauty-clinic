/**
 * Owner-requested bilingual service catalogue.
 * Prices and durations deliberately remain consultation-based until approved in admin.
 */
import type { Locale } from "@/i18n/routing";
import { SERVICE_COPY } from "@/lib/content/service-copy";

/** Categories are CMS text values; the four original groups remain the built-in defaults. */
export type ServiceCategory = string;
export interface ServiceDetail {
  tagline?: string;
  paragraphs: string[];
  highlights?: string[];
  highlightsTitle?: string;
  personalApproachTitle?: string;
  personalApproach?: string[];
  durationText?: string;
  faqs?: { question: string; answer: string }[];
  bookingPrompt?: string;
  customSections?: boolean;
}
export interface Service {
  slug: string; name: string; nameFr?: string; category: ServiceCategory; priceLabel: string;
  price: number; duration: number; summary: string; summaryFr?: string; image: string;
  detail?: ServiceDetail; detailFr?: ServiceDetail; order: number;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = ["Hair", "Makeup", "Aesthetic", "Wellness"];
export const CATEGORY_LABEL: Record<ServiceCategory, { en: string; fr: string }> = {
  Hair: { en: "Hair", fr: "Coiffure" },
  Makeup: { en: "Brows, lashes & lips", fr: "Sourcils, cils et lèvres" },
  Aesthetic: { en: "Skin & aesthetic", fr: "Peau et esthétique" },
  Wellness: { en: "Wellness", fr: "Bien-être" },
};

/** Keep the original groups in their familiar order, then include any CMS-created groups. */
export function serviceCategoriesFor(services: readonly Pick<Service, "category">[]): string[] {
  const custom = [...new Set(services.map((service) => service.category.trim()).filter(Boolean))]
    .filter((category) => !SERVICE_CATEGORIES.includes(category as typeof SERVICE_CATEGORIES[number]));
  return [...SERVICE_CATEGORIES, ...custom];
}

export function normalizeServiceCategory(category: string): string {
  return category.trim() || "Aesthetic";
}

export const consultation = "Consultation required";
export const consultationFr = "Consultation requise";
export const durationPending = "Confirmed during consultation";
export const durationPendingFr = "Confirmée lors de la consultation";

export function categoryLabel(category: ServiceCategory, locale: Locale): string {
  return CATEGORY_LABEL[category]?.[locale] ?? category;
}

const image = (name: string) => ["salon-generated.png", "treatment.jpeg", "rf-device-product.jpg", "rf-device.jpeg"].includes(name) ? `/preview/${name}` : `/example-pics/${name}`;

export const SERVICES: Service[] = [
  { slug: "laser-hair-removal", name: "Laser Hair Removal", nameFr: "Épilation au laser", category: "Aesthetic", priceLabel: consultation, price: 0, duration: 0, summary: "A personalized laser hair-removal plan shaped around the treatment area, skin assessment and your comfort.", summaryFr: "Un plan d’épilation au laser personnalisé selon la zone, l’évaluation de la peau et votre confort.", image: image("micromachin.jpeg"), order: 1 },
  { slug: "vein-removal-treatment", name: "Vein Removal Treatment", nameFr: "Traitement des veinules visibles", category: "Aesthetic", priceLabel: consultation, price: 0, duration: 0, summary: "A consultation-led service to assess visible superficial veins and discuss appropriate treatment options.", summaryFr: "Un service guidé par une consultation pour évaluer les veinules superficielles visibles et discuter des options appropriées.", image: image("salon-generated.png"), order: 2 },
  { slug: "hydrafacial", name: "HydraFacial", nameFr: "HydraFacial", category: "Aesthetic", priceLabel: consultation, price: 0, duration: 0, summary: "A multi-step facial experience selected around your skin’s current needs, goals and comfort.", summaryFr: "Une expérience faciale en plusieurs étapes choisie selon les besoins actuels de votre peau, vos objectifs et votre confort.", image: image("treatment.jpeg"), order: 3 },
  { slug: "deep-cleansing-facials", name: "Deep-Cleansing Facials", nameFr: "Soins du visage nettoyants en profondeur", category: "Aesthetic", priceLabel: consultation, price: 0, duration: 0, summary: "A considered deep-cleansing facial tailored after a conversation about your skin and daily routine.", summaryFr: "Un soin nettoyant en profondeur adapté après une discussion sur votre peau et votre routine quotidienne.", image: image("salon-generated.png"), order: 4 },
  { slug: "ai-skin-analysis", name: "AI Skin Analysis", nameFr: "Analyse de la peau par IA", category: "Aesthetic", priceLabel: consultation, price: 0, duration: 0, summary: "A guided skin analysis that supports a clearer, more informed conversation about your care options.", summaryFr: "Une analyse guidée de la peau qui favorise une discussion plus claire et mieux informée sur vos options de soin.", image: image("rf-device-product.jpg"), order: 5 },
  { slug: "rf-skin-treatment", name: "RF Skin Treatment", nameFr: "Soin de la peau par radiofréquence", category: "Aesthetic", priceLabel: consultation, price: 0, duration: 0, summary: "Radiofrequency-focused care planned after assessing your skin, expectations and treatment suitability.", summaryFr: "Un soin axé sur la radiofréquence planifié après l’évaluation de votre peau, de vos attentes et de la pertinence du traitement.", image: image("rf-device.jpeg"), order: 6 },
  {
    slug: "rf-microneedling", name: "RF Microneedling", nameFr: "Microneedling RF", category: "Aesthetic", priceLabel: consultation, price: 0, duration: 0,
    summary: "A precision treatment combining microneedling with radiofrequency, planned only after a professional consultation.",
    summaryFr: "Un soin de précision combinant microneedling et radiofréquence, planifié uniquement après une consultation professionnelle.",
    image: "/media/salon/caver1.webp",
    detail: { tagline: "Technology, guided by thoughtful care.", paragraphs: ["RF microneedling combines controlled microneedling with radiofrequency energy. A consultation is required to review suitability, the treatment experience and aftercare for your skin.", "Your specialist will explain the proposed plan and answer questions before any treatment begins. Results and the number of sessions vary from person to person."], highlights: ["Professional consultation first", "Personalized treatment planning", "Aftercare explained clearly"] },
    detailFr: { tagline: "La technologie, guidée par une approche attentionnée.", paragraphs: ["Le microneedling RF combine un microneedling contrôlé à l’énergie de radiofréquence. Une consultation est nécessaire pour évaluer la pertinence, l’expérience du soin et les conseils après-traitement.", "Votre spécialiste expliquera le plan proposé et répondra à vos questions avant tout soin. Les résultats et le nombre de séances varient d’une personne à l’autre."], highlights: ["Consultation professionnelle d’abord", "Plan de soin personnalisé", "Conseils après-traitement expliqués clairement"] },
    order: 7,
  },
  { slug: "microneedling", name: "Microneedling", nameFr: "Microneedling", category: "Aesthetic", priceLabel: consultation, price: 0, duration: 0, summary: "A precision-focused skin service tailored after discussing suitability, expectations and aftercare.", summaryFr: "Un soin de précision adapté après discussion de la pertinence, des attentes et des conseils après-traitement.", image: image("ghazalmicro.jpg"), order: 8 },
  { slug: "microblading-eyebrow-shaping", name: "Microblading & Eyebrow Shaping", nameFr: "Microblading et mise en forme des sourcils", category: "Makeup", priceLabel: consultation, price: 0, duration: 0, summary: "A custom brow consultation and design shaped around your natural features and preferred finish.", summaryFr: "Une consultation et une création sur mesure pensées selon vos traits naturels et le résultat souhaité.", image: "/media/salon/img_8204.webp", order: 9 },
  { slug: "lip-blush-dark-lip-neutralization", name: "Lip Blush & Dark Lip Neutralization", nameFr: "Lip blush et neutralisation des lèvres foncées", category: "Makeup", priceLabel: consultation, price: 0, duration: 0, summary: "A consultation-first lip service with colour goals, suitability and the healing process discussed carefully.", summaryFr: "Un service des lèvres précédé d’une consultation attentive sur la couleur, la pertinence et la cicatrisation.", image: "/media/salon/img_8220.webp", order: 10 },
  { slug: "haircuts", name: "Haircuts", nameFr: "Coupes de cheveux", category: "Hair", priceLabel: consultation, price: 0, duration: 0, summary: "A tailored cut designed around your texture, routine and the shape you want to wear every day.", summaryFr: "Une coupe personnalisée selon votre texture, votre routine et la forme que vous souhaitez porter au quotidien.", image: "/media/salon/img_8204.webp", order: 11 },
  { slug: "hair-colour-balayage", name: "Hair Colouring, Highlights & Balayage", nameFr: "Coloration, mèches et balayage", category: "Hair", priceLabel: consultation, price: 0, duration: 0, summary: "Personalized colour work planned around your starting point, maintenance preferences and desired finish.", summaryFr: "Un travail de couleur personnalisé selon votre point de départ, l’entretien souhaité et le fini recherché.", image: "/media/salon/img_7488.webp", order: 12 },
  { slug: "hair-botox-hydration", name: "Hair Botox & Hydration Treatments", nameFr: "Botox capillaire et soins hydratants", category: "Hair", priceLabel: consultation, price: 0, duration: 0, summary: "Conditioning and hydration options selected after assessing your hair’s texture, history and needs.", summaryFr: "Des options de soin et d’hydratation choisies après l’évaluation de la texture, de l’historique et des besoins de vos cheveux.", image: "/media/salon/img_8220.webp", order: 13 },
  { slug: "swedish-relaxation-massage", name: "Swedish & Relaxation Massage", nameFr: "Massage suédois et de relaxation", category: "Wellness", priceLabel: consultation, price: 0, duration: 0, summary: "A calm massage experience with pressure, areas of focus and comfort discussed before the session.", summaryFr: "Une expérience de massage apaisante dont la pression, les zones ciblées et le confort sont discutés avant la séance.", image: image("salon-generated.png"), order: 14 },
  { slug: "lash-brow-lamination", name: "Lash & Brow Lamination", nameFr: "Rehaussement des cils et lamination des sourcils", category: "Makeup", priceLabel: consultation, price: 0, duration: 0, summary: "A refined lash and brow service selected around your natural growth, features and preferred finish.", summaryFr: "Un soin raffiné des cils et sourcils choisi selon leur croissance naturelle, vos traits et le fini souhaité.", image: "/media/salon/img_8204.webp", order: 15 },
  { slug: "laser-skin-rejuvenation", name: "Laser Skin Rejuvenation", nameFr: "Rajeunissement cutané au laser", category: "Aesthetic", priceLabel: consultation, price: 0, duration: 0, summary: "Technology-led skin care with suitability, expectations and aftercare reviewed before treatment.", summaryFr: "Un soin de la peau assisté par technologie, avec pertinence, attentes et conseils après-traitement examinés avant le soin.", image: image("rf-device.jpeg"), order: 16 },
];

for (const service of SERVICES) {
  const copy = SERVICE_COPY[service.slug];
  if (!copy) continue;
  service.summary = copy.summary;
  service.summaryFr = copy.summaryFr;
  service.detail = copy.detail;
  service.detailFr = copy.detailFr;
}

export function getServiceBySlug(slug: string): Service | undefined { return SERVICES.find((service) => service.slug === slug); }
export function servicesByCategory(category: ServiceCategory): Service[] { return SERVICES.filter((service) => service.category === category).sort((a, b) => a.order - b.order); }
export function featuredServices(): Service[] { return ["haircuts", "hair-colour-balayage", "hydrafacial", "rf-microneedling"].map(getServiceBySlug).filter((service): service is Service => Boolean(service)); }
export function localizeService(service: Service, locale: Locale): Service {
  if (locale === "en") return service;
  return { ...service, name: service.nameFr ?? service.name, summary: service.summaryFr ?? service.summary, priceLabel: service.price > 0 ? service.priceLabel : consultationFr, detail: service.detailFr ?? service.detail };
}
