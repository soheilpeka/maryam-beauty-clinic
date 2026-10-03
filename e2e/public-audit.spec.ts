import { test, expect } from "./local-test";

for (const locale of ["en", "fr"]) {
  test(`all linked ${locale} public pages and images remain usable`, async ({ page, request, baseURL }, info) => {
    test.setTimeout(300_000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const queue = ["", "/about", "/gallery", "/contact", "/book-online", "/booking", "/store", "/store/cart", "/store/checkout", "/pricing-plans/packages"].map(suffix => `/${locale}${suffix}`);
    const visited = new Set<string>();
    const images = new Set<string>();
    await page.setViewportSize({ width: info.project.name === "mobile" ? 320 : 1280, height: 884 });
    while (queue.length) {
      const path = queue.shift()!;
      if (visited.has(path)) continue;
      visited.add(path);
      const response = await page.goto(path);
      expect(response?.status(), path).toBeLessThan(400);
      await expect(page.locator("main h1").first(), path).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: horizontal overflow`).toBe(true);
      expect(await page.locator("main").innerText(), path).not.toMatch(/(?:MISSING_MESSAGE|INTERNAL_SERVER_ERROR|Application error)/);
      for (const href of await page.locator("a[href]").evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href))) {
        const url = new URL(href);
        if (url.origin !== new URL(baseURL!).origin || !url.pathname.startsWith(`/${locale}`) || /\/admin(?:\/|$)|\/booking\/|\/store\/order\//.test(url.pathname)) continue;
        if (!visited.has(url.pathname) && !queue.includes(url.pathname)) queue.push(url.pathname);
      }
      for (const src of await page.locator("img[src]").evaluateAll(imgs => imgs.map(img => (img as HTMLImageElement).src))) {
        const url = new URL(src);
        if (url.origin === new URL(baseURL!).origin) images.add(url.pathname + url.search);
      }
    }
    for (const image of images) {
      const response = await request.get(image);
      expect(response.status(), `image ${image}`).toBeLessThan(400);
      expect(response.headers()["content-type"], image).toMatch(/^image\//);
    }
    expect(errors).toEqual([]);
    await info.attach("public-audit-summary", { body: JSON.stringify({ pages: [...visited], imageCount: images.size }), contentType: "application/json" });
  });
}
