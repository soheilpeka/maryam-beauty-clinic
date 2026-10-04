import { describe, expect, it } from "vitest";
import { SKIN_PROGRAM_DETAILS, skinProgramDetails } from "@/lib/content/skin-program-details";
import { SKIN_PROGRAMS } from "@/lib/content/skin-programs";

describe("complete owner-supplied skin program detail", () => {
  it("keeps the Discovery consultation separate from an actual Matrix treatment", () => {
    const detail = skinProgramDetails("discovery", "en")!;
    expect(detail.experiences).toHaveLength(3);
    expect(detail.experiences![2].title).toContain("Consultation");
    expect(detail.experiences![0].points).toHaveLength(2);
    expect(detail.experiences![1].points).toHaveLength(3);
    expect(detail.experiences![2].points).toHaveLength(3);
    expect(detail.offer).toContain("new clients only");
  });
  it("preserves every appointment and interval supplied in the artwork", () => {
    expect(skinProgramDetails("glow-renewal", "en")!.visits).toHaveLength(6);
    const essential = skinProgramDetails("essential", "en")!;
    expect(essential.visits!.map(v => v.when)).toEqual(["Month 1", "Month 2", "Month 3", "Visit 4", "Visit 5", "Visit 6"]);
    expect(essential.visits![3].interval).toBe("6 weeks after your final Matrix treatment");
    expect(essential.visits!.every(v => !v.duration)).toBe(true);
    const platinum = skinProgramDetails("platinum", "en")!;
    expect(platinum.visits).toHaveLength(7);
    expect(platinum.visits!.filter(v => v.treatment === "Signature Hydra Facial")).toHaveLength(4);
    expect(platinum.visits![0].duration).toBe("2.5 hours");
    expect(platinum.visits![3].interval).toBe("2 months between visits");
    const diamond = skinProgramDetails("diamond", "en")!;
    expect(diamond.visits).toHaveLength(10);
    expect(diamond.visits!.at(-1)!.when).toBe("Visit 10");
    expect(diamond.visits!.every(v => !v.duration && !v.interval)).toBe(true);
  });
  it("retains program-specific goals, aftercare-related concerns and package mix", () => {
    expect(skinProgramDetails("essential", "en")!.goals).toHaveLength(5);
    for (const slug of ["platinum", "diamond"]) {
      const detail = skinProgramDetails(slug, "en")!;
      expect(detail.goals).toHaveLength(6);
      expect(detail.extraConcerns).toContain("Acne scars & skin damage");
      expect(detail.summary).toHaveLength(2);
    }
  });
  it("provides nonempty English and French for every structured detail", () => {
    function check(value: unknown): void {
      if (!value || typeof value !== "object") return;
      if ("en" in value && "fr" in value) {
        expect((value as { en: string }).en.trim()).not.toBe("");
        expect((value as { fr: string }).fr.trim()).not.toBe("");
      } else Object.values(value).forEach(check);
    }
    check(SKIN_PROGRAM_DETAILS);
    expect(skinProgramDetails("diamond", "fr")!.visits!.at(-1)!.when).toBe("Visite 10");
    expect(skinProgramDetails("discovery", "fr")!.experiences![0].title).toContain("Analyse");
  });
  it("does not invent source detail for a custom CMS package", () => {
    expect(skinProgramDetails("owner-custom", "en")).toBeUndefined();
  });
  it("uses the revised brochure prices, financing and crossed-out exclusions", () => {
    expect(SKIN_PROGRAMS.filter(p => p.slug !== "discovery").map(p => [p.slug, p.price, p.regular, p.saving, p.payment])).toEqual([
      ["glow-renewal", "$1,248", "$2,094", "Save $950", "$104/month · 12 monthly payments · 0% interest"],
      ["essential", "$1,800", "$2,516", "Save $716", "$150/month · 12 monthly payments · 0% interest"],
      ["platinum", "$2,712", "$3,773", "Save $1,061", "$226/month · 12 monthly payments · 0% interest"],
      ["diamond", "$4,200", "$6,295", "Save $2,095", "$350/month · 12 monthly payments · 0% interest"],
    ]);
    for (const slug of ["glow-renewal", "diamond"]) {
      const p = SKIN_PROGRAMS.find(p => p.slug === slug)!;
      expect(p.included.join(" ")).not.toMatch(/Progress Tracking|Progress Monitoring|Chemical Peel|Oxygen/i);
      expect(JSON.stringify(skinProgramDetails(slug, "en"))).not.toMatch(/before-and-after|Progress monitoring/i);
    }
  });
});
