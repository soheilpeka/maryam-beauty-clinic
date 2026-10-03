import { afterEach, describe, expect, it, vi } from "vitest";
import { loginOriginAllowed } from "@/lib/login-origin";

afterEach(() => vi.unstubAllEnvs());
describe("login origin behind a reverse proxy", () => {
  it("accepts only the configured public production origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://clinic.example");
    const request = (origin: string, extra = {}) => new Request("http://localhost:3000/api/admin/login", {
      headers: { origin, ...extra },
    });
    expect(loginOriginAllowed(request("https://clinic.example"))).toBe(true);
    expect(loginOriginAllowed(request("https://attacker.example", { host: "attacker.example", "x-forwarded-host": "attacker.example" }))).toBe(false);
    expect(loginOriginAllowed(request("http://localhost:3000"))).toBe(false);
    expect(loginOriginAllowed(request("https://clinic.example", { "sec-fetch-site": "cross-site" }))).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "");
    expect(loginOriginAllowed(request("https://clinic.example"))).toBe(false);
  });
  it("checks the request origin in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(loginOriginAllowed(new Request("http://localhost:3050/api/admin/login", { headers: { origin: "http://localhost:3050" } }))).toBe(true);
    expect(loginOriginAllowed(new Request("http://localhost:3050/api/admin/login", { headers: { origin: "https://attacker.example" } }))).toBe(false);
  });
});
