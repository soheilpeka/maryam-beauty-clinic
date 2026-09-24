/**
 * SMOKE TEST - the only e2e test for now.
 *
 * Goal of phase 5 step 1: prove the Playwright pipeline works end to end against the
 * dedicated e2e database - server bootstrapped, e2e.db provisioned, browsers launched.
 * It loads the homepage in both locales and asserts the locale actually rendered
 * (an English string on /fr or vice versa would fail), which also confirms next-intl
 * routing + message loading are wired up.
 *
 * The full booking + admin suites come in the next step; do not add them here.
 */
import { test, expect } from "@playwright/test";

// Anchors that exist only in the given locale's messages, so a wrong-locale render fails.
const EXPECTED = {
  en: {
    title: "Experience the Best of Beauty Treatments",
    book: "Book Appointment",
  },
  fr: {
    title: "Vivez le meilleur des traitements de beaut\u00e9",
    book: "Prendre rendez-vous",
  },
} as const;

for (const locale of ["en", "fr"] as const) {
  test(`homepage renders in ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}`);

    // The h1 is the hero heading; it is translated per locale.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      EXPECTED[locale].title,
    );

    // Header CTA catches a wrong-locale header too.
    await expect(page.getByRole("link", { name: EXPECTED[locale].book }).first()).toBeVisible();

    // No console errors while rendering the page.
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(EXPECTED[locale].title);
    expect(errors).toEqual([]);
  });
}
