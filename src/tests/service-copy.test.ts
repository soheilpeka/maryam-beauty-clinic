import { describe, expect, it } from "vitest";
import { OWNER_SERVICE_COPY, PREVIOUS_OWNER_SERVICE_COPY } from "@/lib/content/owner-service-copy";
import { LEGACY_FULL_SERVICE_DESCRIPTIONS, LEGACY_PUBLIC_SERVICE_PREVIEWS, parseServiceDescription, resolveServiceDescription } from "@/lib/content/service-copy";
import { SERVICES } from "@/lib/content/services";

describe("owner service copy", () => {
  it("renders all supplied services in English and French as editable sections", () => {
    for (const [slug, copy] of Object.entries(OWNER_SERVICE_COPY)) {
      for (const locale of ["en", "fr"] as const) {
        const parsed = parseServiceDescription(slug, copy[locale], locale);
        if (/^(Preview|Aperçu)$/m.test(copy[locale])) expect(parsed?.summary, `${slug} ${locale} preview`).toBeTruthy();
        else expect(parsed?.summary).toBe("");
        expect(parsed?.detail?.paragraphs.length, `${slug} ${locale} description`).toBeGreaterThan(0);
        expect(parsed?.detail?.customSections).toBe(true);
      }
    }
    expect(Object.keys(OWNER_SERVICE_COPY)).toHaveLength(12);
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
    expect(skinFirming?.detail?.paragraphs.join(" ")).toContain("Candela GentleMax Pro Plus");
  });

  it("provides localized, service-specific FAQs across the catalogue", () => {
    for (const service of SERVICES) {
      expect(service.detail?.faqs?.length, `${service.slug} English FAQs`).toBeGreaterThan(0);
      expect(service.detailFr?.faqs?.length, `${service.slug} French FAQs`).toBeGreaterThan(0);
    }

    const microblading = SERVICES.find((service) => service.slug === "microblading-eyebrow-shaping");
    expect(microblading?.detail?.faqs?.map((faq) => faq.question).join(" ")).not.toMatch(/skin|peau/i);
    expect(microblading?.detail?.faqs?.map((faq) => faq.answer).join(" ")).toMatch(/brow|pigment/i);
  });

  it("separates supplied haircut, brow and lip sections without losing their own FAQs", () => {
    for (const slug of ["haircuts", "microblading-eyebrow-shaping", "lip-blush-dark-lip-neutralization"]) {
      for (const locale of ["en", "fr"] as const) {
        const detail = parseServiceDescription(slug, OWNER_SERVICE_COPY[slug][locale], locale)?.detail;
        expect(detail?.highlights, `${slug}/${locale} highlights`).toHaveLength(3);
        expect(detail?.highlights?.every(item => !item.startsWith("*"))).toBe(true);
        expect(detail?.personalApproachTitle).toBe(locale === "en" ? "Your Visit, Thoughtfully Planned" : "Une visite pensée pour vous");
        expect(detail?.personalApproachLabel).toBe(locale === "en" ? "MADE FOR YOU" : "UNE APPROCHE PERSONNALISÉE");
        expect(detail?.personalApproach).toHaveLength(1);
        expect(detail?.faqs, `${slug}/${locale} FAQs`).toHaveLength(3);
        expect(detail?.paragraphs.join(" ")).not.toMatch(/Highlights|Les points forts|MADE FOR YOU|UNE APPROCHE PERSONNALISÉE/);
        expect(detail?.durationText).toBe(locale === "en" ? "Confirmed during consultation." : "Confirmée lors de la consultation.");
      }
    }
    const haircut = parseServiceDescription("haircuts", OWNER_SERVICE_COPY.haircuts.en, "en")?.detail;
    expect(haircut?.highlightsTitle).toBe("Haircut Highlights");
    expect(haircut?.faqs?.map(faq => faq.question)).toEqual(["What Can I Expect?", "How Should I Prepare for My Appointment?", "How Often Should I Book a Haircut?"]);
    expect(haircut?.faqs?.[1].answer).toContain("shampoo");
    expect(haircut?.faqs?.[0].answer).not.toContain("How Should");
  });

  it("recognizes new CMS questions while preserving questions inside ordinary prose", () => {
    const parsed = parseServiceDescription("haircuts", "Service Description\n\nWondering which style to choose? Bring a photo.\n\nCan I discuss my fringe?\n\nYes, discuss your preferred length with your stylist.", "en");
    expect(parsed?.detail?.paragraphs).toEqual(["Wondering which style to choose? Bring a photo."]);
    expect(parsed?.detail?.faqs).toEqual([{ question: "Can I discuss my fringe?", answer: "Yes, discuss your preferred length with your stylist." }]);
    expect(parseServiceDescription("haircuts", "Can I discuss my fringe?", "en")?.detail?.paragraphs).toEqual(["Can I discuss my fringe?"]);
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

  it("replaces earlier owner text and keeps the latest treatment plan and FAQs in their own sections", () => {
    const rf = resolveServiceDescription("rf-skin-treatment", PREVIOUS_OWNER_SERVICE_COPY["rf-skin-treatment"].en, "en");
    expect(rf?.detail?.paragraphs.join(" ")).toContain("Fractional RF resurfacing");
    expect(rf?.detail?.highlights).toHaveLength(4);
    expect(rf?.detail?.personalApproachTitle).toBe("A Treatment Plan Made With Your Skin in Mind");
    expect(rf?.detail?.personalApproach).toHaveLength(1);
    expect(rf?.detail?.faqs).toHaveLength(3);
    expect(rf?.detail?.highlights?.join(" ")).not.toContain("Frequently Asked Questions");

    const pigmentation = SERVICES.find(service => service.slug === "pigmented-lesions-laser-treatment");
    expect(pigmentation?.detailFr?.faqs).toHaveLength(3);
    expect(pigmentation?.detailFr?.faqs?.at(-1)?.answer).not.toContain("Treatment Highlights");
    expect(pigmentation?.detailFr?.highlights).toHaveLength(3);
  });

  it("replaces only exact previous public previews and places custom text in the description", () => {
    for (const [slug, previews] of Object.entries(LEGACY_PUBLIC_SERVICE_PREVIEWS)) {
      for (const locale of ["en", "fr"] as const) {
        const resolved = resolveServiceDescription(slug, previews[locale], locale);
        const expected = parseServiceDescription(slug, OWNER_SERVICE_COPY[slug][locale], locale);
        expect(resolved?.summary, `${locale}/${slug}`).toBe(expected?.summary);
      }
    }

    const custom = "A custom administrator-authored summary.";
    const parsed = resolveServiceDescription("laser-hair-removal", custom, "en");
    expect(parsed?.summary).toBe("");
    expect(parsed?.detail?.paragraphs).toEqual([custom]);
    expect(resolveServiceDescription("laser-hair-removal", `Preview\n${custom}`, "en")?.summary).toBe(custom);
  });
});
