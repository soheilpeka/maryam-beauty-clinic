import { describe, expect, it } from "vitest";
import type { ComparisonContent } from "@/lib/comparison-validation";
import { COMPARISONS } from "@/lib/content/comparisons";
import { galleryComparisonGroups } from "@/lib/content/gallery-comparisons";

function reference(index: number): ComparisonContent {
  const item = COMPARISONS.find(board => board.id === `comparison-${String(index).padStart(2, "0")}`)!;
  return {
    id: item.id, name: item.title, nameFr: item.titleFr, description: "", descriptionFr: "",
    imageUrl: item.image, afterImageUrl: item.image, beforeCrop: item.before, afterCrop: item.after,
    aspectRatio: item.boardRatio, category: item.family, active: true, order: index,
  };
}

describe("gallery comparison treatments", () => {
  it("separates known treatments and never assumes replaced artwork is the same treatment", () => {
    const replaced = { ...reference(6), imageUrl: "/media/uploads/new.webp", afterImageUrl: "/media/uploads/new.webp" };
    const groups = galleryComparisonGroups([reference(1), reference(5), reference(10), reference(14), replaced], [], "fr");
    expect(groups.map(group => [group.id, group.items.map(item => item.id)])).toEqual([
      ["laser-hair-removal", ["comparison-01"]], ["vein-removal-treatment", ["comparison-05"]],
      ["rf-microneedling", ["comparison-14"]], ["matrix-rf", ["comparison-10"]],
      ["unspecified-laser", ["comparison-06"]],
    ]);
    expect(groups[0].label).toBe("Épilation au laser");
  });

  it("includes published service pairs once and retains the CMS caption for a matching board", () => {
    const slug = "microblading-eyebrow-shaping";
    const image = `/media/services/${slug}/01.webp`;
    const matched = { ...reference(1), id: "cms-copy", name: "Custom caption", imageUrl: image, afterImageUrl: image };
    const published = { slug, image, name: "Brow treatment" };
    const groups = galleryComparisonGroups([matched], [published], "en");
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ id: slug, label: published.name, items: [{ id: matched.id, name: matched.name }] });
    expect(galleryComparisonGroups([], [{ ...published, image: "/media/uploads/replacement.webp" }], "en")).toEqual([]);
  });
});
