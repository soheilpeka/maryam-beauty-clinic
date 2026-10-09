import { describe, expect, it } from "vitest";
import { OWNER_SERVICE_COPY } from "@/lib/content/owner-service-copy";
import { LEGACY_FULL_SERVICE_DESCRIPTIONS, LEGACY_PUBLIC_SERVICE_PREVIEWS, parseServiceDescription, resolveServiceDescription } from "@/lib/content/service-copy";
import { SERVICES } from "@/lib/content/services";

describe("owner service copy", () => {
  it("renders all supplied services in English and French as editable sections", () => {
    for (const [slug, copy] of Object.entries(OWNER_SERVICE_COPY)) {
      for (const locale of ["en", "fr"] as const) {
        const parsed = parseServiceDescription(slug, copy[locale], locale);
        expect(parsed?.summary, `${slug} ${locale} preview`).toBeTruthy();
        expect(parsed?.detail?.paragraphs.length, `${slug} ${locale} description`).toBeGreaterThan(0);
        expect(parsed?.detail?.customSections).toBe(true);
      }
    }
    expect(Object.keys(OWNER_SERVICE_COPY)).toHaveLength(8);
  });

  it("keeps complete highlights, questions and appointment copy", () => {
    const hairRemoval = parseServiceDescription("laser-hair-removal", OWNER_SERVICE_COPY["laser-hair-removal"].en, "en");
    expect(hairRemoval?.detail?.highlights).toHaveLength(4);
    expect(hairRemoval?.detail?.faqs?.map((faq) => faq.question)).toEqual(["What can I expect?", "How many visits should I plan?"]);
    const veins = parseServiceDescription("vein-removal-treatment", OWNER_SERVICE_COPY["vein-removal-treatment"].fr, "fr");
    expect(veins?.detail?.highlights).toHaveLength(5);
    expect(veins?.detail?.bookingPrompt).toContain("varicosités");
    const hydra = parseServiceDescription("hydrafacial", OWNER_SERVICE_COPY.hydrafacial.en, "en");
    expect(hydra?.detail?.faqs?.map((faq) => faq.question)).toContain("How often should I book?");
    const hydraFr = parseServiceDescription("hydrafacial", OWNER_SERVICE_COPY.hydrafacial.fr, "fr");
    expect(hydraFr?.detail?.faqs?.map((faq) => faq.question)).toContain("À quelle fréquence devrais-je prendre rendez-vous?");
    const skinFirming = parseServiceDescription("laser-skin-rejuvenation", OWNER_SERVICE_COPY["laser-skin-rejuvenation"].en, "en");
    expect(skinFirming?.detail?.paragraphs.join(" ")).toContain("1064 nm Nd:YAG");
  });

  it("provides localized, service-specific FAQs across the catalogue", () => {
    for (const service of SERVICES) {
      expect(service.detail?.faqs?.length, `${service.slug} English FAQs`).toBeGreaterThan(0);
      expect(service.detailFr?.faqs?.length, `${service.slug} French FAQs`).toBeGreaterThan(0);
    }

    const microblading = SERVICES.find((service) => service.slug === "microblading-eyebrow-shaping");
    expect(microblading?.detail?.faqs?.map((faq) => faq.question).join(" ")).not.toMatch(/skin|peau/i);
    expect(microblading?.detail?.faqs?.map((faq) => faq.question).join(" ")).toMatch(/brow|pigment/i);
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
