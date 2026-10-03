import { test, expect } from "./local-test";

test("homepage remains readable at all requested widths", async ({ page }) => {
  for (const locale of ["en", "fr"]) {
    await page.goto(`/${locale}`);
    for (const width of [320, 375, 390, 430, 768, 1024]) {
      await page.setViewportSize({ width, height: 884 });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const faq = page.locator(".luxury-faq").first();
    await faq.locator("summary").click();
    await expect(faq).toHaveAttribute("open", "");
    await expect(faq.locator("p")).toBeVisible();
  }
});

test("gallery filters and keyboard lightbox work in both languages", async ({ page }) => {
  for (const locale of ["en", "fr"]) {
    await page.goto(`/${locale}/gallery`);
    await page.getByRole("main").getByRole("button", { name: locale === "fr" ? "Soins" : "Treatment", exact: true }).click();
    await expect(page.locator(".gallery-image-button")).toHaveCount(1);
    await page.locator(".gallery-image-button").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("img")).toHaveAttribute("src", "/media/salon/caver1.webp");
    await dialog.getByRole("button").press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(page.locator(".gallery-image-button")).toBeFocused();
  }
});

test("mobile menu traps focus and booking does not have an extra floating CTA", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/en");
  const open = page.getByRole("button", { name: "Open menu", exact: true });
  await open.click();
  const close = page.getByRole("button", { name: "Close menu", exact: true });
  await close.press("Shift+Tab");
  await expect(page.getByRole("navigation", { name: "Mobile", exact: true }).getByRole("link").last()).toBeFocused();
  await page.getByRole("navigation", { name: "Mobile", exact: true }).getByRole("link").last().press("Tab");
  await expect(close).toBeFocused();
  await close.press("Escape");
  await expect(open).toBeFocused();
  await page.goto("/en/booking");
  await expect(page.locator(".mobile-consultation")).toHaveCount(0);
});
