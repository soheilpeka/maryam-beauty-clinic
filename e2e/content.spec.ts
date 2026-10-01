import { test, expect } from "@playwright/test";
import { SERVICES } from "../src/lib/content/services";
import { adminForProject } from "./admin-credentials";

test("narrow bilingual homepage and booking content stays within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const locale of ["en", "fr"]) {
    for (const path of ["", "/booking", "/service-page/rf-microneedling", "/contact", "/store/cart", "/store/checkout", "/admin/login"]) {
      await page.goto(`/${locale}${path}`);
      await expect(page.locator("#main h1").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${locale}${path}`).toBeLessThanOrEqual(321);
    }
  }
});

test("all public pages and sixteen localized service routes render with working images", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const locale of ["en", "fr"]) {
    for (const path of ["", "/about", "/book-online", "/gallery", "/contact", "/store", "/store/cart", "/store/checkout", "/pricing-plans/packages", ...SERVICES.map(service => `/service-page/${service.slug}`)]) {
      const response = await page.goto(`/${locale}${path}`);
      expect(response?.status(), path).toBe(200);
      await expect(page.locator("#main h1").first()).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await page.locator("#main img").evaluateAll(images => Promise.all(images.map(image => {
        const img = image as HTMLImageElement;
        img.loading = "eager";
        return img.complete ? Promise.resolve() : new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); });
      })));
      expect(await page.locator("#main img").evaluateAll(images => images.filter(image => !(image as HTMLImageElement).naturalWidth).map(image => (image as HTMLImageElement).src)), path).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), path).toBe(true);
    }
  }
  expect(errors).toEqual([]);
  await page.goto("/en");
  await page.screenshot({ path: info.outputPath("homepage.png"), fullPage: true });
  await page.locator(".preview-parallax").scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("salon-background.png") });
});

test("bilingual contact forms validate and disclose simulated delivery", async ({ page }) => {
  for (const locale of ["en", "fr"]) {
    await page.goto(`/${locale}/contact`);
    const form = page.locator("#main form");
    await form.locator('button[type="submit"]').click();
    await expect(form.getByRole("alert").first()).toBeVisible();
    await page.locator("#contact-name").fill("QA Contact");
    await page.locator("#contact-email").fill("qa-contact@example.com");
    await page.locator("#contact-message").fill("Temporary browser verification message, not a real appointment request.");
    const response = page.waitForResponse(r => r.url().endsWith("/api/contact") && r.request().method() === "POST");
    await form.locator('button[type="submit"]').click();
    expect((await response).status()).toBe(200);
    await expect(page.locator("#main [role=status]")).toBeVisible();
  }
});

test("About video loads and plays on desktop and mobile", async ({ page }) => {
  await page.goto("/en/about");
  const video = page.locator("video");
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).duration)).toBeGreaterThan(0);
  await video.click();
  await video.evaluate(v => (v as HTMLVideoElement).play());
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await video.evaluate(v => (v as HTMLVideoElement).pause());
});

test("owner can manage bilingual services, packages and gallery through accessible forms", async ({ page }, info) => {
  test.setTimeout(90_000);
  const credentials = adminForProject(info.project.name);
  await page.goto("/en/admin/login");
  await page.locator("#admin-email").fill(credentials.email);
  await page.locator("#admin-password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  const label = `QA content ${info.project.name}`;
  await page.goto("/en/admin/services");
  await page.getByRole("button", { name: "Add service" }).click();
  await page.locator("#services-name").fill(label);
  await page.locator("#services-nameFr").fill(`Contenu QA ${info.project.name}`);
  await page.locator("#services-description").fill("Temporary QA description in the isolated test database.");
  await page.locator("#services-descriptionFr").fill("Description temporaire dans la base de test isolée.");
  await page.locator("#services-price").fill("0");
  await page.getByRole("dialog").getByLabel("Primary image", { exact: true }).fill("/example-pics/hair-look-1.png");
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Search", { exact: true }).fill(label);
  const serviceRow = page.locator("#main li").filter({ hasText: label });
  await serviceRow.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Temporary QA description");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const href = await serviceRow.getByRole("link", { name: "View page" }).getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  await expect(page.locator("#main")).toContainText("Temporary QA description");
  await page.goto(href!.replace("/en/", "/fr/"));
  await expect(page.locator("#main")).toContainText("Description temporaire");
  await page.goto("/en/admin/packages");
  await page.getByRole("button", { name: "Add package" }).click();
  await page.locator("#packages-name").fill(label);
  await page.locator("#packages-nameFr").fill(`Forfait QA ${info.project.name}`);
  await page.locator("#packages-price").fill("0");
  await page.getByRole("dialog").getByLabel(label, { exact: true }).check();
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/en/pricing-plans/packages");
  await expect(page.locator("#main")).toContainText(label);
  await page.goto("/en/admin/gallery");
  await page.getByRole("button", { name: "Add image" }).click();
  await page.locator("#gallery-altEn").fill(label);
  await page.locator("#gallery-altFr").fill(`Image QA ${info.project.name}`);
  await page.getByRole("dialog").getByLabel("Primary image", { exact: true }).fill("/example-pics/hair-look-2.jpeg");
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/en/gallery");
  await expect(page.getByRole("img", { name: label, exact: true })).toBeVisible();
  await page.goto("/en/admin/staff");
  await page.getByRole("button", { name: "Add specialist" }).click();
  await page.screenshot({ path: info.outputPath("admin-staff-form.png") });
  await page.locator("#staff-name").fill(label);
  await page.locator("#staff-role").fill("QA role");
  await page.locator("#staff-bio").fill("Temporary team biography in the isolated database.");
  await page.getByRole("dialog").getByLabel("French description").fill("Biographie temporaire de test.");
  await page.locator("#staff-avatar").fill("/preview/studio.jpeg");
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/fr");
  await expect(page.locator("#main")).toContainText("Biographie temporaire de test.");
  await page.goto("/en/admin/staff");
  const teamRow = page.locator("#main li").filter({ hasText: label });
  await teamRow.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("dialog").getByLabel("This specialist is bookable online").uncheck();
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/fr");
  await expect(page.locator("#main")).not.toContainText("Biographie temporaire de test.");
  await page.goto("/en/admin/services");
  await page.getByLabel("Search", { exact: true }).fill(label);
  await serviceRow.getByRole("button", { name: "Deactivate" }).click();
  await expect(serviceRow).toContainText("Inactive");
  expect((await page.goto(href!))?.status()).toBe(404);
});
