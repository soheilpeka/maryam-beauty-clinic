import { describe, expect, it } from "vitest";
import { categoryLabel, normalizeServiceCategory, serviceCategoriesFor } from "@/lib/content/services";

describe("CMS service categories", () => {
  it("preserves a custom category instead of mapping it to Aesthetic", () => {
    expect(normalizeServiceCategory("  New treatment  ")).toBe("New treatment");
  });

  it("falls back to the existing public group only when a category is empty", () => {
    expect(normalizeServiceCategory("  ")).toBe("Aesthetic");
  });

  it("adds custom service categories to the menu after the standard groups", () => {
    expect(serviceCategoriesFor([
      { category: "Hair" },
      { category: "New treatment" },
      { category: "New treatment" },
      { category: "Bridal" },
    ])).toEqual(["Hair", "Makeup", "Aesthetic", "Wellness", "New treatment", "Bridal"]);
  });

  it("translates built-in groups and leaves custom CMS names readable", () => {
    expect(categoryLabel("Hair", "fr")).toBe("Coiffure");
    expect(categoryLabel("Bridal", "fr")).toBe("Bridal");
  });
});
