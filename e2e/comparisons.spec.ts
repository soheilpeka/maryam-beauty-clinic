import { test, expect } from "./local-test";

test("comparison text remains readable under both device preferences", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/gallery");
  const card = page.locator("#before-after article").first();
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await card.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
    const ratios = await card.evaluate(element => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d")!;
      const luminance = (color: string) => {
        // CSS color-mix() may serialize as color(srgb ...), not rgb(...).
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const rgb = Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3), value => {
          const channel = value / 255;
          return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
        });
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
      };
      const background = luminance(getComputedStyle(element).backgroundColor);
      return [...element.querySelectorAll("h4, figcaption, p")].filter(node => node.textContent?.trim()).map(node => {
        const text = luminance(getComputedStyle(node).color);
        return (Math.max(text, background) + .05) / (Math.min(text, background) + .05);
      });
    });
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await card.screenshot({ path: info.outputPath(`comparison-device-${colorScheme}.png`) });
  }
});

for (const locale of ["en", "fr"]) {
  test(`${locale}: all treatment comparisons are reachable, localized and filterable`, async ({ page }) => {
    await page.goto(`/${locale}/gallery`);
    const gallery = page.locator("#before-after");
    await expect(gallery.locator("article")).toHaveCount(6);
    await expect(gallery.getByRole("status")).toContainText("30");
    const images = new Set<string>();
    for (let index = 0; index < 5; index++) {
      for (const image of await gallery.locator("img").all()) images.add((await image.getAttribute("src"))!);
      if (index < 4) await gallery.getByRole("button", { name: locale === "fr" ? "Suivant" : "Next", exact: true }).click();
    }
    expect(images.size).toBe(30);
    await expect(gallery.getByRole("button", { name: locale === "fr" ? "Suivant" : "Next", exact: true })).toBeDisabled();
    await gallery.getByRole("combobox", { name: locale === "fr" ? "Traitement" : "Treatment" }).selectOption("rf-microneedling");
    await expect(gallery.locator("article")).toHaveCount(2);
    await expect(gallery.getByRole("status")).toContainText(locale === "fr" ? "2 comparaisons · Page 1 sur 1" : "2 comparisons · Page 1 of 1");
    for (const src of images) expect((await page.request.get(src)).status()).toBe(200);
  });

  test(`${locale}: comparison supports keyboard and pointer drag`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/gallery`);
    const slider = page.locator("#before-after").getByRole("slider").first();
    await slider.scrollIntoViewIfNeeded();
    await slider.focus();
    await slider.press("Home");
    await expect(slider).toHaveValue("0");
    await slider.press("End");
    await expect(slider).toHaveValue("100");
    await slider.press("ArrowLeft");
    await expect(slider).toHaveValue("99");
    const box = await slider.boundingBox();
    if (!box) throw new Error("Missing slider geometry");
    await page.mouse.move(box.x + box.width * .8, box.y + box.height * .5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .2, box.y + box.height * .5, { steps: 10 });
    await page.mouse.up();
    expect(Number(await slider.inputValue())).toBeGreaterThanOrEqual(18);
    expect(Number(await slider.inputValue())).toBeLessThanOrEqual(22);
  });
}

test("touch swipes reveal photos while vertical swipes still scroll the page", async ({ page, context, isMobile }) => {
  test.skip(!isMobile, "Touch interaction is tested in the mobile project");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/fr/gallery");
  const slider = page.locator("#before-after").getByRole("slider").first();
  await slider.scrollIntoViewIfNeeded();
  await slider.focus();
  const box = await slider.boundingBox();
  if (!box) throw new Error("Missing slider geometry");
  const session = await context.newCDPSession(page);
  const startX = box.x + box.width * .8, y = box.y + box.height * .5;
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y }] });
  for (let step = 1; step <= 10; step++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: startX - box.width * .6 * step / 10, y }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  expect(Number(await slider.inputValue())).toBeLessThan(30);
  const previous = await slider.inputValue();
  const scroll = await page.evaluate(() => window.scrollY);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width * .5, y }] });
  for (let step = 1; step <= 8; step++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + box.width * .5, y: y - step * 10 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scroll);
  await expect(slider).toHaveValue(previous);
  await session.detach();
});

test("gallery comparisons fit narrow screens and reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 522, 768, 1280]) {
    await page.setViewportSize({ width, height: 884 });
    await page.goto("/fr/gallery");
    const gallery = page.locator("#before-after");
    await gallery.getByRole("slider").first().focus();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const before = gallery.getByRole("img", { name: "Nuque · pilosité — Avant", exact: true });
    await expect.poll(() => before.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    if (width === 390 || width === 1280) {
      await gallery.getByRole("slider").first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: `artifacts/comparisons-${width}.png` });
    }
  }
});
