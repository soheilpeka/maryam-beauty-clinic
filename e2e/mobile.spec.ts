/**
 * Mobile layout (Phase 5, step 2).
 *
 * The drawer-based header navigation only exists below the lg breakpoint, so those tests are
 * gated on the mobile project. The "no horizontal overflow" checks are viewport-agnostic and
 * run under both projects - a page that spills sideways is broken at any width.
 */
import { test, expect, type TestInfo } from "./local-test";

/** True when running as the mobile project (touch, phone-class viewport). */
function isMobile(testInfo: TestInfo): boolean {
  return Boolean(testInfo.project.use.isMobile);
}

/** Every page must fit the viewport sideways; a horizontal scrollbar on a phone is a bug. */
async function expectNoHorizontalOverflow(page: import("@playwright/test").Page): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, "document must not be wider than the viewport").toBeLessThanOrEqual(innerWidth);
}

test.describe("layout", () => {
  test("homepage fits the viewport with no horizontal overflow", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("booking page fits the viewport with no horizontal overflow", async ({ page }) => {
    await page.goto("/en/booking");
    await expect(page.getByRole("heading", { name: "Choose a service" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("contact page fits the viewport with no horizontal overflow", async ({ page }) => {
    await page.goto("/en/contact");
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalOverflow(page);
  });

  test("the mobile preview navigation remains usable", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), "the preview navigation check only runs on mobile breakpoints");

    await page.goto("/en");

    // The shared navigation remains operable with keyboard-friendly mobile controls.
    await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Book now" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "About", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/about$/);
  });

  test("the booking flow is fully usable at the mobile width", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), "progress-step labels are hidden on narrow screens");

    await page.goto("/en/booking");
    await page.getByRole("button", { name: "Hair Colouring, Highlights & Balayage" }).click();
    await page.getByRole("button", { name: "Any specialist" }).click();

    // Step labels are sm:+ only, but the progress bar itself must remain.
    await expect(page.getByRole("list", { name: "Step 3 of 4" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Preferred date & time" })).toBeVisible();

    const min = await page.locator("#preferred-date").getAttribute("min");
    expect(min).toBeTruthy();
    await page.locator("#preferred-date").fill(min!);
    await page.locator("#preferred-time").fill("11:00");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
    await expect(page.locator("#name")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
