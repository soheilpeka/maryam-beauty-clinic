import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMPARISONS } from "@/lib/content/comparisons";
import { servicePhotoComparisons } from "@/lib/content/service-comparisons";
import { publicServiceComparisons } from "@/lib/service-comparisons";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { comparisonItem: { findMany } } }));

describe("service-specific before and after photographs", () => {
  beforeEach(() => { findMany.mockReset(); findMany.mockResolvedValue([]); });

  it("does not restore replaced service photographs or invent pairs for ordinary photos", () => {
    expect(servicePhotoComparisons("microblading-eyebrow-shaping", new Set(["/media/uploads/new-photo.webp"]))).toEqual([]);
    expect(servicePhotoComparisons("lip-blush-dark-lip-neutralization", new Set(["/media/services/lip-blush-dark-lip-neutralization/01.webp"]))).toEqual([]);
    const pairs = servicePhotoComparisons("lip-blush-dark-lip-neutralization", new Set(["/media/services/lip-blush-dark-lip-neutralization/03.webp"]));
    expect(pairs).toHaveLength(1);
    expect(pairs[0].beforeCrop.y).toBe(0);
    expect(pairs[0].afterCrop.y).toBe(.5);
    expect(servicePhotoComparisons("haircuts", new Set([pairs[0].imageUrl]))).toEqual([]);
  });

  it("uses active CMS records without bringing hidden reference boards back", async () => {
    expect(await publicServiceComparisons("laser-hair-removal", new Set())).toEqual([]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { active: true, id: { in: expect.arrayContaining(["comparison-01", "comparison-18"]) } } }));
    const ids = findMany.mock.calls[0][0].where.id.in;
    expect(ids).not.toContain("comparison-05");
    expect(ids).not.toContain("comparison-14");
  });

  it("preserves CMS captions and framing but rejects artwork replaced with a different treatment", async () => {
    const original = COMPARISONS.find(item => item.id === "comparison-14")!;
    const data = { id: original.id, name: "Owner caption", nameFr: "Légende", description: "", descriptionFr: "", imageUrl: original.image, afterImageUrl: original.image, beforeCrop: original.before, afterCrop: original.after, aspectRatio: 1.2, category: "rf", active: true, order: 1 };
    findMany.mockResolvedValue([data]);
    const result = await publicServiceComparisons("rf-microneedling", new Set());
    expect(result[0]).toMatchObject({ name: "Owner caption", beforeCrop: original.before, aspectRatio: 1.2 });
    findMany.mockResolvedValue([{ ...data, imageUrl: "/media/uploads/different-treatment.webp" }]);
    expect(await publicServiceComparisons("rf-microneedling", new Set())).toEqual([]);
  });

  it("does not guess a matching treatment for generic RF or pigmentation boards", async () => {
    expect(await publicServiceComparisons("rf-skin-treatment", new Set())).toEqual([]);
    expect(await publicServiceComparisons("laser-skin-rejuvenation", new Set())).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
