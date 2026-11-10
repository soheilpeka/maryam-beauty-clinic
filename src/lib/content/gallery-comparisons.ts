import type { ComparisonContent } from "@/lib/comparison-validation";
import { COMPARISONS } from "@/lib/content/comparisons";
import { SERVICE_REFERENCE_IDS, servicePhotoComparisons, type ServiceComparison } from "@/lib/content/service-comparisons";
import type { Service } from "@/lib/content/services";

const treatments = [
  ["laser-hair-removal", "Laser hair removal", "Épilation au laser"],
  ["vein-removal-treatment", "Visible vein treatment", "Traitement des veinules visibles"],
  ["pigmented-lesions-laser-treatment", "Pigmented lesion laser treatment", "Traitement laser des taches pigmentaires"],
  ["rf-microneedling", "RF microneedling", "Microneedling RF"],
  ["matrix-rf", "Matrix radiofrequency", "Radiofréquence Matrix"],
  ["microblading-eyebrow-shaping", "Microblading & eyebrow shaping", "Microblading et mise en forme des sourcils"],
  ["lash-brow-lamination", "Lash & brow lamination", "Rehaussement des cils et lamination des sourcils"],
  ["lip-blush-dark-lip-neutralization", "Lip blush & lip neutralization", "Lip blush et neutralisation des lèvres"],
  ["hair-botox-hydration", "Hair botox & hydration", "Botox capillaire et soins hydratants"],
  ["unspecified-laser", "Other laser comparisons", "Autres comparaisons laser"],
  ["unspecified-rf", "Other radiofrequency comparisons", "Autres comparaisons par radiofréquence"],
  ["other", "Other comparisons", "Autres comparaisons"],
] as const;

type GalleryComparison = ServiceComparison & { description?: string; descriptionFr?: string; reference?: boolean };
export type GalleryComparisonGroup = { id: string; label: string; items: GalleryComparison[] };

const referenceTreatments = new Map<string, string>();
for (const [slug, ids] of Object.entries(SERVICE_REFERENCE_IDS)) {
  for (const id of ids) referenceTreatments.set(`comparison-${String(id).padStart(2, "0")}`, slug);
}
// These source boards identify the Matrix platform without specifying an applicator.
for (const id of [10, 11, 12, 13, 16, 17]) referenceTreatments.set(`comparison-${id}`, "matrix-rf");
const sourceUrls = new Map(COMPARISONS.map(item => [item.id, item.image]));

export function galleryComparisonGroups(
  comparisons: readonly ComparisonContent[],
  services: readonly Pick<Service, "slug" | "name" | "image" | "images">[],
  locale: "en" | "fr",
): GalleryComparisonGroup[] {
  const groups = new Map<string, GalleryComparisonGroup>(treatments.map(([id, en, fr]) => [id, {
    id, label: services.find(service => service.slug === id)?.name ?? (locale === "fr" ? fr : en), items: [],
  }]));
  const add = (id: string, item: GalleryComparison) => groups.get(id)?.items.push(item);
  const serviceBoards = services.flatMap(service => servicePhotoComparisons(
    service.slug, new Set([service.image, ...(service.images ?? []).map(image => image.url)]),
  ).map(item => ({ slug: service.slug, item })));
  const serviceByImage = new Map(serviceBoards.map(({ slug, item }) => [item.imageUrl, slug]));
  const displayedBoards = new Set<string>();
  for (const item of comparisons) {
    if (!item.active) continue;
    const sameSource = item.imageUrl === item.afterImageUrl;
    const reference = sameSource && sourceUrls.get(item.id) === item.imageUrl ? referenceTreatments.get(item.id) : undefined;
    const service = sameSource ? serviceByImage.get(item.imageUrl) : undefined;
    add(reference ?? service ?? (item.category === "other" ? "other" : `unspecified-${item.category}`), { ...item, reference: true });
    if (sameSource) displayedBoards.add(item.imageUrl);
  }
  for (const { slug, item } of serviceBoards) {
    if (!displayedBoards.has(item.imageUrl)) add(slug, item);
  }
  return [...groups.values()].filter(group => group.items.length > 0);
}
