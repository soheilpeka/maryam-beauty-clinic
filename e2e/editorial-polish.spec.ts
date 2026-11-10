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

test("mobile menu keeps the masthead visible and scrolls without moving the page", async ({ page, isMobile }) => {
  await page.setViewportSize({ width: 334, height: 656 });
  await page.goto("/en");
  const initialY = await page.evaluate(() => {
    window.scrollTo({ top: 150, behavior: "instant" });
    return window.scrollY;
  });
  expect(initialY).toBeGreaterThan(0);
  await expect(page.locator(".site-header")).toHaveClass(/backdrop-blur-md/);

  const open = page.getByRole("button", { name: "Open menu", exact: true });
  const menuBox = await open.boundingBox();
  if (!menuBox) throw new Error("Mobile menu button is missing");
  // Click the visible sticky button without auto-scrolling the document to its original position.
  const x = menuBox.x + menuBox.width / 2, y = menuBox.y + menuBox.height / 2;
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  const close = page.getByRole("button", { name: "Close menu", exact: true });
  const drawer = page.locator(".site-mobile-drawer");
  const treatments = drawer.getByRole("button", { name: "Treatments", exact: true });

  await expect.poll(() => drawer.evaluate(element => {
    const header = document.querySelector(".site-header")!.getBoundingClientRect();
    return [header.top, element.getBoundingClientRect().top - header.bottom];
  })).toEqual([0, 0]);

  await page.mouse.move(150, 300);
  await page.mouse.wheel(0, 300);
  await expect.poll(() => drawer.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect.poll(() => treatments.evaluate(button =>
    button.getBoundingClientRect().top - button.closest(".site-mobile-drawer")!.getBoundingClientRect().top,
  )).toBe(0);

  await page.mouse.wheel(0, 3000);
  await expect(drawer.getByRole("link", { name: "Book Appointment" })).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(initialY);
  await expect(close).toBeInViewport();
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await expect(drawer).toHaveCount(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(initialY);

  await page.mouse.wheel(0, 300);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(initialY);
});
