import { describe, it, expect } from "vitest";
import { comparisonSchema, comparisonPatchSchema, FULL_PHOTO } from "@/lib/comparison-validation";
const valid = { name: "Neck comparison", nameFr: "Comparaison nuque", imageUrl: "/media/comparisons/comparison-01.webp", afterImageUrl: "https://example.com/after.jpg", beforeCrop: FULL_PHOTO, afterCrop: FULL_PHOTO, aspectRatio: 4 / 3, category: "laser" };
describe("comparison content validation", () => {
  it("accepts separate photos and bilingual content", () => { expect(comparisonSchema.safeParse(valid).success).toBe(true); });
  it("rejects unsafe image URLs on either side", () => {
    for (const key of ["imageUrl", "afterImageUrl"]) for (const url of ["", "javascript:alert(1)", "http://example.com/p.jpg", "/media/../secret.jpg", "https://example.com/a.svg"]) expect(comparisonSchema.safeParse({ ...valid, [key]: url }).success).toBe(false);
  });
  it("rejects out-of-bounds crops, missing names and invalid ratios", () => {
    expect(comparisonSchema.safeParse({ ...valid, beforeCrop: { ...FULL_PHOTO, x: 0.5 } }).success).toBe(false);
    expect(comparisonSchema.safeParse({ ...valid, afterCrop: { ...FULL_PHOTO, width: 0 } }).success).toBe(false);
    for (const patch of [{ nameFr: "" }, { aspectRatio: 0 }, { order: -1 }, { description: "a".repeat(1001) }, { category: "unknown" }]) expect(comparisonSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it("supports activation patches but rejects extra fields and empty mutations", () => {
    expect(comparisonPatchSchema.safeParse({ active: false }).success).toBe(true);
    expect(comparisonPatchSchema.parse({ active: false })).toEqual({ active: false });
    expect(comparisonPatchSchema.safeParse({}).success).toBe(false);
    expect(comparisonPatchSchema.safeParse({ id: "overwrite" }).success).toBe(false);
  });
});
