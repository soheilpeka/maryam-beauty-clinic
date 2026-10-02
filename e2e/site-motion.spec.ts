import { test, expect } from "@playwright/test";

test("scroll entrances reveal content and preserve rounded photographs in both locales", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const locale of ["en", "fr"]) {
    await page.goto(`/${locale}`);
    const photo = page.locator(".preview-work-image");
    await expect(photo).toHaveClass(/site-motion-pending/);
    await photo.scrollIntoViewIfNeeded();
    await expect(photo).toHaveClass(/site-motion-entered/);
    await expect(photo).toHaveCSS("opacity", "1");
    await expect(photo).toHaveCSS("border-radius", "32px");
    await expect(photo.locator("img")).toHaveCSS("padding", "0px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("reduced motion never hides content or animates photographs", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/fr");
  await expect(page.locator(".site-motion-pending")).toHaveCount(0);
  await expect(page.locator(".salon-hero-image")).toHaveCSS("animation-name", "none");
  const photo = page.locator(".preview-work-image");
  await photo.scrollIntoViewIfNeeded();
  await expect(photo).toHaveCSS("opacity", "1");
});

test("service navigation and gallery filters retain visible accessible content", async ({ page }) => {
  await page.goto("/en/book-online");
  const card = page.locator(".service-discovery-card").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveCSS("opacity", "1");
  await expect(card).toHaveCSS("border-radius", "28px");
  await card.getByRole("link", { name: "More Info", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/service-page\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".salon-photo-frame").first()).toHaveCSS("border-radius", "32px");
  await page.goto("/en/gallery");
  await page.getByRole("main").getByRole("button", { name: "Treatment", exact: true }).click();
  const gallery = page.locator(".gallery-photo-card");
  await expect(gallery).toHaveCount(1);
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery).toHaveCSS("opacity", "1");
  await expect(gallery).toHaveCSS("border-radius", "24px");
  await gallery.getByRole("button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("server-rendered homepage stays readable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/en");
  await expect(page.locator(".site-motion-pending")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".preview-work-image")).toHaveCSS("opacity", "1");
  await context.close();
});
