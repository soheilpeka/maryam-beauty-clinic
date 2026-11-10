import type { ServicePhoto } from "@/lib/content/services";

/** Owner-supplied service photos, bundled with the site so they work on every deployment. */
const photos = (slug: string, labelEn: string, labelFr: string, count: number): ServicePhoto[] =>
  Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      id: `owner-photo-${slug}-${number}`,
      url: `/media/services/${slug}/${number}.webp`,
      altEn: `${labelEn} — photo ${index + 1}`,
      altFr: `${labelFr} — photo ${index + 1}`,
    };
  });

export const SERVICE_PHOTOS: Record<string, ServicePhoto[]> = {
  // Keep the scanner as the cover and show the diagnostic maps in the gallery.
  "ai-skin-analysis": (() => {
    const images = photos("ai-skin-analysis", "AI skin analysis", "Analyse de la peau par IA", 4);
    return [
      { ...images[3], altEn: "Skin analysis scanner", altFr: "Appareil d’analyse de la peau" },
      { ...images[0], id: "owner-photo-ai-skin-analysis-wrinkle-map", url: "/media/services/ai-skin-analysis/wrinkle-map.webp", altEn: "Facial map of wrinkles", altFr: "Cartographie des rides du visage" },
      { ...images[1], altEn: "Facial map of sunspots", altFr: "Cartographie des taches solaires du visage" },
      { ...images[2], altEn: "Facial map of skin sensitivity", altFr: "Cartographie de la sensibilité de la peau" },
      { ...images[0], altEn: "Facial map of deep pigmentation", altFr: "Cartographie de la pigmentation profonde du visage" },
    ];
  })(),
  "deep-cleansing-facials": photos("deep-cleansing-facials", "Deep-cleansing facial", "Soin du visage nettoyant en profondeur", 1),
  // The third supplied file duplicates the second exactly; show it only once.
  "lash-brow-lamination": photos("lash-brow-lamination", "Lash and brow lamination", "Lamination des cils et des sourcils", 2),
  "hair-botox-hydration": photos("hair-botox-hydration", "Hair botox and hydration", "Botox capillaire et hydratation", 2),
  "hair-colour-balayage": photos("hair-colour-balayage", "Hair colour and balayage", "Coloration et balayage", 1),
  "laser-hair-removal": photos("laser-hair-removal", "Candela laser equipment", "Appareil laser Candela", 1),
  hydrafacial: photos("hydrafacial", "HydraFacial treatment", "Soin HydraFacial", 1),
  "vein-removal-treatment": photos("vein-removal-treatment", "Illustration of laser treatment for visible leg veins", "Illustration du traitement laser des veinules visibles sur la jambe", 1),
  "laser-skin-rejuvenation": photos("laser-skin-rejuvenation", "Laser skin rejuvenation", "Rajeunissement cutané au laser", 1),
  "pigmented-lesions-laser-treatment": (() => {
    const images = photos("pigmented-lesions-laser-treatment", "Pigmented lesion laser treatment", "Traitement laser des taches pigmentaires", 4);
    return [
      { id: "owner-photo-pigmented-lesions-laser-treatment-cover", url: "/media/services/pigmented-lesions-laser-treatment/cover.webp", altEn: "Close-up of facial pigmentation", altFr: "Gros plan de la pigmentation du visage" },
      images[2], images[3], images[0], images[1],
    ];
  })(),
  "lip-blush-dark-lip-neutralization": photos("lip-blush-dark-lip-neutralization", "Lip blush", "Lip blush", 3),
  "microblading-eyebrow-shaping": photos("microblading-eyebrow-shaping", "Microblading and eyebrow shaping", "Microblading et mise en forme des sourcils", 3),
  microneedling: photos("microneedling", "Microneedling treatment", "Soin de microneedling", 1),
  "rf-microneedling": (() => {
    const images = photos("rf-microneedling", "RF microneedling", "Microneedling RF", 2);
    return [
      {
        ...images[0],
        id: "owner-photo-rf-microneedling-comparison",
        url: "/media/services/rf-microneedling/microneedling-comparison.jpeg",
        altEn: "Illustration comparing microneedling and RF microneedling",
        altFr: "Illustration comparant le microneedling et le microneedling RF",
      },
      images[1],
    ];
  })(),
  "rf-skin-treatment": photos("rf-skin-treatment", "Fractional RF equipment", "Appareil de radiofréquence fractionnée", 2),
  "swedish-relaxation-massage": photos("swedish-relaxation-massage", "Swedish relaxation massage", "Massage suédois et de relaxation", 1),
};
