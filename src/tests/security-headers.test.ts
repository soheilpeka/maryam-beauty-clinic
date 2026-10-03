import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { pathToRegexp } = require("next/dist/compiled/path-to-regexp") as { pathToRegexp: (source: string) => RegExp };
const configPath = "../../next.config.mjs";
const { default: config } = await import(configPath);
type HeaderRule = { source: string; headers: Array<{ key: string; value: string }> };

async function responseHeaders(path: string) {
  const rules: HeaderRule[] = await config.headers();
  const headers = new Map<string, string>();
  for (const rule of rules) {
    if (pathToRegexp(rule.source).test(path)) {
      for (const header of rule.headers) headers.set(header.key, header.value);
    }
  }
  return headers;
}

afterEach(() => vi.unstubAllEnvs());

describe("response security headers", () => {
  it("limits framing, objects, base URLs and forms while preserving existing scripts and media", async () => {
    const headers = await responseHeaders("/fr/store");
    const csp = headers.get("Content-Security-Policy");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).not.toMatch(/(?:script|style|img|default)-src/);
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });

  it.each([
    "/api/admin/session", "/api/admin/requests", "/api/bookings", "/api/bookings/reference",
    "/api/store/orders", "/api/store/orders/reference", "/admin/login",
    "/en/admin/requests", "/fr/admin/gallery", "/en/booking", "/fr/booking/reference",
    "/en/store/order/reference", "/fr/store/order/reference",
  ])("prevents caching private responses at %s", async path => {
    expect((await responseHeaders(path)).get("Cache-Control")).toBe("private, no-store, max-age=0");
  });

  it("leaves public catalog cache policy to Next.js", async () => {
    expect((await responseHeaders("/en/store")).has("Cache-Control")).toBe(false);
    expect((await responseHeaders("/api/store/products")).has("Cache-Control")).toBe(false);
  });

  it("sends HSTS in production without claiming subdomain or preload readiness", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await responseHeaders("/en")).get("Strict-Transport-Security")).toBe("max-age=31536000");
    vi.stubEnv("NODE_ENV", "development");
    expect((await responseHeaders("/en")).has("Strict-Transport-Security")).toBe(false);
  });
});
