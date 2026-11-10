import type { PhotoViewport } from "@/lib/content/comparisons";

export interface ServiceComparison {
  id: string;
  name: string;
  nameFr: string;
  imageUrl: string;
  afterImageUrl: string;
  beforeCrop: PhotoViewport;
  afterCrop: PhotoViewport;
  aspectRatio: number;
}

// Assign only boards whose subject and treatment were identified in the supplied artwork.
// Matrix Pro is explicit on boards 14/15; generic Matrix boards are not assigned to another RF service.
export const SERVICE_REFERENCE_IDS: Record<string, number[]> = {
  "laser-hair-removal": [1, 2, 3, 4, 6, 7, 18],
  "vein-removal-treatment": [5, 8, 9],
  "rf-microneedling": [14, 15],
  "pigmented-lesions-laser-treatment": [19, 20],
};

type Board = { number: string; ratio: number; name: string; nameFr: string } & (
  { split: "horizontal" | "vertical" } | { before: PhotoViewport; after: PhotoViewport }
);

const pigmentationBoard = (number: string, height: number, top: number, bottom: number, name: string, nameFr: string): Board => ({
  number, ratio: 1320 / height, name, nameFr,
  before: { x: 1 / 1320, y: top / height, width: 651 / 1320, height: (bottom - top) / height },
  after: { x: 667 / 1320, y: top / height, width: 651 / 1320, height: (bottom - top) / height },
});

const boards: Record<string, Board[]> = {
  "hair-botox-hydration": [
    { number: "01", split: "vertical", ratio: 1, name: "Blonde hair texture", nameFr: "Texture des cheveux blonds" },
    { number: "02", ratio: 736 / 1104, name: "Brunette hair texture", nameFr: "Texture des cheveux bruns",
      before: { x: 0, y: 0, width: 350 / 736, height: 1 }, after: { x: 386 / 736, y: 0, width: 350 / 736, height: 1 } },
  ],
  "lash-brow-lamination": [{ number: "01", split: "horizontal", ratio: 900 / 1600, name: "Lashes & brows", nameFr: "Cils et sourcils" }],
  "lip-blush-dark-lip-neutralization": [
    { number: "02", split: "horizontal", ratio: 900 / 1600, name: "Lip colour", nameFr: "Couleur des lèvres" },
    { number: "03", split: "horizontal", ratio: 828 / 956, name: "Lip tone", nameFr: "Teinte des lèvres" },
  ],
  "microblading-eyebrow-shaping": [
    { number: "01", split: "horizontal", ratio: 1, name: "Brow definition", nameFr: "Définition des sourcils" },
    { number: "02", ratio: 814 / 789, name: "Brow shape", nameFr: "Forme des sourcils",
      before: { x: 2 / 814, y: 0, width: 812 / 814, height: 392 / 789 }, after: { x: 2 / 814, y: 395 / 789, width: 812 / 814, height: 392 / 789 } },
    { number: "03", ratio: 1, name: "Brow fullness", nameFr: "Densité des sourcils",
      before: { x: 0, y: 0, width: 530 / 1080, height: 1 }, after: { x: 550 / 1080, y: 0, width: 530 / 1080, height: 1 } },
  ],
  "pigmented-lesions-laser-treatment": [
    pigmentationBoard("03", 670, 82, 582, "Cheek · pigmentation", "Joue · pigmentation"),
    pigmentationBoard("04", 659, 90, 590, "Décolletage · pigmentation", "Décolleté · pigmentation"),
  ],
};

/** Do not restore a bundled photo after an administrator replaces the service's photographs. */
export function servicePhotoComparisons(slug: string, availableUrls: ReadonlySet<string>): ServiceComparison[] {
  return (boards[slug] ?? []).flatMap(board => {
    const url = `/media/services/${slug}/${board.number}.webp`;
    if (!availableUrls.has(url)) return [];
    const vertical = "split" in board && board.split === "vertical";
    const beforeCrop = "before" in board ? board.before : { x: 0, y: 0, width: vertical ? .5 : 1, height: vertical ? 1 : .5 };
    const afterCrop = "after" in board ? board.after : { x: vertical ? .5 : 0, y: vertical ? 0 : .5, width: beforeCrop.width, height: beforeCrop.height };
    return [{
      id: `service-pair-${slug}-${board.number}`, name: board.name, nameFr: board.nameFr,
      imageUrl: url, afterImageUrl: url,
      beforeCrop, afterCrop,
      aspectRatio: board.ratio * beforeCrop.width / beforeCrop.height,
    }];
  });
}
