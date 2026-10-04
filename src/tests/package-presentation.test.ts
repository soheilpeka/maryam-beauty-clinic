import { describe, expect, it } from "vitest";
import { presentPackage } from "@/lib/package-presentation";

const essential = { slug: "essential", name: "Essential Package", nameFr: "Forfait Essential", description: "Owner copy", descriptionFr: "Texte de la propriétaire", price: 180000, sessions: 6, badge: null, validityDays: null, services: [] };

describe("approved package presentation", () => {
  it("keeps CMS copy, price and session count authoritative", () => {
    const p = presentPackage(essential, "en");
    expect(p.description).toBe("Owner copy");
    expect(p.price).toBe("$1,800");
    expect(p.count).toBe(6);
    expect(p.payment).toContain("$150/month");
    expect(p.included).toContain("3 Candela Matrix RF Microneedling treatments");
  });
  it("localizes CMS content, prices and savings in French", () => {
    const p = presentPackage(essential, "fr");
    expect(p.name).toBe("Forfait Essential");
    expect(p.description).toBe("Texte de la propriétaire");
    expect(p.price).toContain("1");
    expect(p.price).toMatch(/800\s*\$/);
    expect(p.saving).toMatch(/Économisez 716\s*\$/);
    expect(p.strapline).not.toContain("Your first");
  });
  it("does not show stale discounts or installments after a CMS price edit", () => {
    const p = presentPackage({ ...essential, price: 190000 }, "en");
    expect(p.price).toBe("$1,900");
    expect(p.payment).toBeUndefined();
    expect(p.regular).toBe("");
    expect(p.saving).toBe("");
  });
  it("reflects edited session counts rather than old artwork stats", () => {
    const p = presentPackage({ ...essential, sessions: 8 }, "fr");
    expect(p.stats).toEqual(["8 séances"]);
    expect(p.count).toBe(8);
  });
  it("supports new CMS packages and excludes inactive linked services", () => {
    const p = presentPackage({ ...essential, slug: "custom", price: 50000, sessions: 2, services: [{ service: { active: true, name: "HydraFacial", nameFr: "HydraFacial FR" } }, { service: { active: false, name: "Hidden", nameFr: "Masqué" } }] }, "fr");
    expect(p.included).toEqual(["HydraFacial FR"]);
    expect(p.payment).toBeUndefined();
    expect(p.count).toBe(2);
  });
  it("represents Discovery as three experiences in one appointment", () => {
    const p = presentPackage({ ...essential, slug: "discovery", price: 9900, sessions: 1 }, "en");
    expect(p.count).toBe(3);
    expect(p.stats).toContain("1 session");
    expect(p.payment).toBeUndefined();
  });
});
