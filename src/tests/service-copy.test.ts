import { describe, expect, it } from "vitest";
import { OWNER_SERVICE_COPY } from "@/lib/content/owner-service-copy";
import { LEGACY_FULL_SERVICE_DESCRIPTIONS, LEGACY_PUBLIC_SERVICE_PREVIEWS, parseServiceDescription, resolveServiceDescription } from "@/lib/content/service-copy";

describe("owner service copy", () => {
  it("renders all six supplied services in English and French as editable sections", () => {
    for (const [slug, copy] of Object.entries(OWNER_SERVICE_COPY)) {
      for (const locale of ["en", "fr"] as const) {
        const parsed = parseServiceDescription(slug, copy[locale], locale);
        expect(parsed?.summary, `${slug} ${locale} preview`).toBeTruthy();
        expect(parsed?.detail?.paragraphs.length, `${slug} ${locale} description`).toBeGreaterThan(0);
        expect(parsed?.detail?.customSections).toBe(true);
      }
    }
    expect(Object.keys(OWNER_SERVICE_COPY)).toHaveLength(6);
  });

  it("keeps complete highlights, questions and appointment copy", () => {
    const hairRemoval = parseServiceDescription("laser-hair-removal", OWNER_SERVICE_COPY["laser-hair-removal"].en, "en");
    expect(hairRemoval?.detail?.highlights).toHaveLength(4);
    expect(hairRemoval?.detail?.faqs?.map((faq) => faq.question)).toEqual(["What can I expect?", "How many visits should I plan?"]);
    const veins = parseServiceDescription("vein-removal-treatment", OWNER_SERVICE_COPY["vein-removal-treatment"].fr, "fr");
    expect(veins?.detail?.highlights).toHaveLength(5);
    expect(veins?.detail?.bookingPrompt).toContain("varicosités");
  });

  it("shows the new copy when a database record still contains the previous generated text", () => {
    const resolved = resolveServiceDescription(
      "laser-hair-removal",
      LEGACY_FULL_SERVICE_DESCRIPTIONS["laser-hair-removal"].en,
      "en",
    );
    expect(resolved?.summary).toContain("Candela GentleMax Pro Plus");
    expect(resolved?.detail?.customSections).toBe(true);
  });

  it("replaces only exact previous public previews while preserving custom summaries", () => {
    for (const [slug, previews] of Object.entries(LEGACY_PUBLIC_SERVICE_PREVIEWS)) {
      for (const locale of ["en", "fr"] as const) {
        const resolved = resolveServiceDescription(slug, previews[locale], locale);
        const expected = parseServiceDescription(slug, OWNER_SERVICE_COPY[slug][locale], locale);
        expect(resolved?.summary, `${locale}/${slug}`).toBe(expected?.summary);
      }
    }

    const custom = "A custom administrator-authored summary.";
    expect(resolveServiceDescription("laser-hair-removal", custom, "en")?.summary).toBe(custom);
  });
});
