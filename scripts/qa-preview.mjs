/** Read-only browser sweep of an existing local preview; never submits forms. */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const origin = new URL(process.argv[2] ?? "http://localhost:3050").origin;
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error("Use a local preview only.");
const output = join(process.cwd(), "artifacts", "qa-preview-2026-10-03");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const problems = [];
let checked = 0;
const widths = process.env.QA_WIDTH ? [Number(process.env.QA_WIDTH)] : [320, 390, 1280];
try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width < 768, isMobile: width < 768, serviceWorkers: "block" });
    // No remote trackers, email, payment or third-party traffic in this sweep.
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      return url.origin === origin || ["data:", "blob:"].includes(url.protocol) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    let current = "";
    page.on("pageerror", error => problems.push({ width, path: current, error: error.message }));
    page.on("response", response => {
      const url = new URL(response.url());
      if (url.origin === origin && url.pathname.startsWith("/_next/static/") && response.status() >= 400) {
        problems.push({ width, path: current, asset: url.pathname, status: response.status() });
      }
    });
    page.on("requestfailed", request => {
      const url = new URL(request.url());
      if (url.origin === origin && url.pathname.startsWith("/_next/static/")) {
        problems.push({ width, path: current, asset: url.pathname, failed: true });
      }
    });
    for (const locale of ["en", "fr"]) {
      await page.goto(`${origin}/${locale}`);
      const services = await page.locator('a[href*="/service-page/"]').evaluateAll(anchors => [...new Set(anchors.map(anchor => new URL(anchor.href).pathname))]);
      if (services.length !== 16) problems.push({ width, locale, serviceCount: services.length });
      const core = ["", "/about", "/book-online", "/gallery", "/contact", "/booking", "/store", "/store/cart", "/store/checkout", "/pricing-plans/packages", "/admin/login"];
      const routes = [...core.map(path => `/${locale}${path}`), ...services];
      for (const path of routes) {
        if (process.env.QA_PATH && path !== process.env.QA_PATH) continue;
        current = path;
        const response = await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
        if (response?.status() !== 200) problems.push({ width, path, status: response?.status() });
        const rendered = await page.locator("#main").innerText();
        if (/(?:MISSING_MESSAGE|Application error|(?:Booking|Manage|Store|Admin)\.[a-zA-Z])/.test(rendered)) problems.push({ width, path, untranslatedOrError: true });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (overflow > 1) {
          const elements = await page.evaluate(() => [...document.querySelectorAll("body *")].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(element => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right })));
          problems.push({ width, path, overflow, elements });
          await page.screenshot({ path: join(output, `overflow-${path.split("/").filter(Boolean).join("-")}-${width}.png`) });
        }
        // Trigger each actual photograph's native lazy loading, without editing assets.
        for (const img of await page.locator("#main img").all()) {
          if (!(await img.isVisible())) continue; // Hidden responsive duplicates are not failures.
          await img.scrollIntoViewIfNeeded();
          await img.evaluate(element => element.complete ? null : new Promise(resolve => {
            const timeout = setTimeout(resolve, 10_000);
            const finish = () => { clearTimeout(timeout); resolve(); };
            element.addEventListener("load", finish, { once: true });
            element.addEventListener("error", finish, { once: true });
          }));
          if (!(await img.evaluate(element => element.naturalWidth > 0))) problems.push({ width, path, image: await img.getAttribute("src") });
        }
        if (width === 390 && core.some(suffix => path === `/${locale}${suffix}`)) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: join(output, `${locale}-${path.split("/").slice(2).join("-") || "home"}-${width}.png`) });
        }
        checked++;
      }
    }
    await context.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ preview: origin, checked, viewports: widths, problems, screenshots: output }, null, 2));
if (problems.length) process.exitCode = 1;
