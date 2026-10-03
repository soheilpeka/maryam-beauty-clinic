import { describe, expect, it } from "vitest";
import { SKIN_PROGRAM_DETAILS, skinProgramDetails } from "@/lib/content/skin-program-details";

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
    expect(skinProgramDetails("essential", "en")!.visits!.map(v => v.when)).toEqual(["Month 1", "Month 2", "Month 3", "Month 4.5", "Month 6", "Month 7.5"]);
    expect(skinProgramDetails("platinum", "en")!.visits!.map(v => v.when)).toEqual(["Month 1", "Month 2", "Month 3", "Month 4", "Month 6", "Month 8", "Month 10", "Month 12"]);
    const diamond = skinProgramDetails("diamond", "en")!;
    expect(diamond.visits).toHaveLength(10);
    expect(diamond.visits!.at(-1)!.when).toBe("Month 12.5");
    expect(diamond.visits![4].duration).toBe("2.5 hours");
    expect(diamond.visits![5].interval).toBe("6 weeks between visits");
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
    expect(skinProgramDetails("diamond", "fr")!.visits!.at(-1)!.when).toBe("Mois 12,5");
    expect(skinProgramDetails("discovery", "fr")!.experiences![0].title).toContain("Analyse");
  });
  it("does not invent source detail for a custom CMS package", () => {
    expect(skinProgramDetails("owner-custom", "en")).toBeUndefined();
  });
});
