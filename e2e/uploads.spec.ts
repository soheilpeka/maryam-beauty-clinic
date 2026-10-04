import { test, expect } from "./local-test";
import { adminForProject } from "./admin-credentials";
import sharp from "sharp";
import { randomBytes } from "node:crypto";

for (const locale of ["en", "fr"]) {
  test(`${locale}: admin uploads a photo, saves it and visitors can see it`, async ({ page, playwright }, info) => {
    const fr = locale === "fr";
    const credentials = adminForProject(info.project.name);
    await page.goto(`/${locale}/admin/login`);
    await page.locator("#admin-email").fill(credentials.email);
    await page.locator("#admin-password").fill(credentials.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/admin$`));
    await page.goto(`/${locale}/admin/gallery`);
    await page.getByRole("button", { name: fr ? "Ajouter un image" : "Add image", exact: true }).click();
    const dialog = page.getByRole("dialog");
    // A realistic transport stress case: a noisy PNG larger than typical proxy limits.
    const photo = await sharp(randomBytes(1600 * 1600 * 3), { raw: { width: 1600, height: 1600, channels: 3 } }).png().toBuffer();
    expect(photo.length).toBeGreaterThan(7 * 1024 * 1024);
    const uploaded = page.waitForResponse(response => response.url().endsWith("/api/admin/media/upload"));
    await dialog.locator('input[type="file"]').setInputFiles({ name: "synthetic-photo.png", mimeType: "image/png", buffer: photo });
    const response = await uploaded;
    expect(response.request().postDataBuffer()!.length).toBeLessThanOrEqual(480 * 1024);
    expect(response.status()).toBe(201);
    const { url } = await response.json();
    await expect(dialog.getByLabel(fr ? "Image principale" : "Primary image", { exact: true })).toHaveValue(url);
    const visitor = await playwright.request.newContext({ baseURL: info.project.use.baseURL });
    try {
      expect((await visitor.get(url)).status()).toBe(404);
      expect((await page.request.get(url)).status()).toBe(200);
      const label = `Upload QA ${locale} ${info.project.name}`;
      await dialog.getByLabel(fr ? "Texte alternatif anglais *" : "English alt text *", { exact: true }).fill(label);
      await dialog.getByLabel(fr ? "Texte alternatif français *" : "French alt text *", { exact: true }).fill(label);
      await dialog.getByRole("button", { name: fr ? "Enregistrer" : "Save", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await page.reload();
      const visible = await visitor.get(url);
      expect(visible.status()).toBe(200);
      expect(visible.headers()["content-type"]).toBe("image/webp");
      const image = await sharp(await visible.body()).metadata();
      expect(image.exif).toBeUndefined();
      await page.goto(`/${locale}/gallery`);
      await expect(page.locator(`img[src="${url}"]`)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
      await page.screenshot({ path: info.outputPath(`${locale}-uploaded-gallery.png`), fullPage: true });
    } finally { await visitor.dispose(); }
  });
}
