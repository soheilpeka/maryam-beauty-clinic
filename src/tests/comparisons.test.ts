import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { COMPARISONS, photoViewportStyle } from "@/lib/content/comparisons";

describe("photographic comparison viewports", () => {
  it("keeps all 18 supplied pairs distinct and available locally", () => {
    expect(COMPARISONS).toHaveLength(18);
    expect(new Set(COMPARISONS.map(item => item.id)).size).toBe(18);
    for (const item of COMPARISONS) {
      expect(existsSync(resolve("public", item.image.slice(1)))).toBe(true);
      expect(item.titleFr).not.toBe(item.title);
    }
  });
  it("reveals equal sized, disjoint panels wholly inside each original board", () => {
    for (const item of COMPARISONS) {
      expect(item.before.width).toBe(item.after.width);
      expect(item.before.height).toBe(item.after.height);
      expect(item.before.x + item.before.width).toBeLessThan(item.after.x);
      for (const crop of [item.before, item.after]) {
        expect(crop.width).toBeGreaterThan(0);
        expect(crop.height).toBeGreaterThan(0);
        expect(crop.x).toBeGreaterThanOrEqual(0);
        expect(crop.y).toBeGreaterThanOrEqual(0);
        expect(crop.x + crop.width).toBeLessThanOrEqual(1);
        expect(crop.y + crop.height).toBeLessThanOrEqual(1);
      }
    }
  });
  it("maps board pixels to the viewport without changing the natural proportions", () => {
    for (const item of COMPARISONS) {
      const crop = item.before;
      const style = photoViewportStyle(crop);
      const viewportRatio = crop.width / crop.height * item.boardRatio;
      expect(parseFloat(style.width) / parseFloat(style.height) * viewportRatio).toBeCloseTo(item.boardRatio);
      expect(parseFloat(style.left) + crop.x * parseFloat(style.width)).toBeCloseTo(0);
      expect(parseFloat(style.top) + crop.y * parseFloat(style.height)).toBeCloseTo(0);
    }
  });
});
