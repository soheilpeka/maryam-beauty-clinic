import "server-only";
import { prisma } from "@/lib/prisma";
import { comparisonSchema } from "@/lib/comparison-validation";
import { COMPARISONS } from "@/lib/content/comparisons";
import { SERVICE_REFERENCE_IDS, servicePhotoComparisons, type ServiceComparison } from "@/lib/content/service-comparisons";

export async function publicServiceComparisons(slug: string, availableUrls: ReadonlySet<string>): Promise<ServiceComparison[]> {
  const photos = servicePhotoComparisons(slug, availableUrls);
  const originals = (SERVICE_REFERENCE_IDS[slug] ?? []).map(number => COMPARISONS.find(item => item.id === `comparison-${String(number).padStart(2, "0")}`)).filter(item => item !== undefined);
  if (!originals.length) return photos;
  // CMS activation, framing, captions and ordering remain authoritative.
  const records = await prisma.comparisonItem.findMany({
    where: { active: true, id: { in: originals.map(item => item.id) } },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, nameFr: true, description: true, descriptionFr: true, imageUrl: true, afterImageUrl: true, beforeCrop: true, afterCrop: true, aspectRatio: true, category: true, active: true, order: true },
  });
  for (const { id, ...data } of records) {
    const original = originals.find(item => item.id === id);
    // Replaced artwork needs a new explicit treatment assignment, never a guessed one.
    if (data.imageUrl !== original?.image || data.afterImageUrl !== original.image) continue;
    const parsed = comparisonSchema.safeParse(data);
    if (parsed.success) photos.push({ id, ...parsed.data });
  }
  return photos;
}
