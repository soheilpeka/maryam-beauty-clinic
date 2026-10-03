import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientIpFromHeaders, rateLimit, resetRateLimiter } from "@/lib/rate-limit";

beforeEach(() => { resetRateLimiter(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-01T00:00:00Z")); });
afterEach(() => { resetRateLimiter(); vi.useRealTimers(); vi.unstubAllEnvs(); });
const budget = { limit: 2, windowMs: 60_000 };

describe("rate-limit trust and bounded retention", () => {
  it("does not derive an identity from unconfigured client headers", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "");
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "192.0.2.1", "x-real-ip": "192.0.2.2" }))).toBe("unknown");
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "192.0.2.3" }))).toBe("unknown");
  });
  it("uses only the proxy-observed last XFF address", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "x-forwarded-for");
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "192.0.2.1, 192.0.2.2" }))).toBe("192.0.2.2");
  });
  it("validates trusted IPs and header selection", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "x-real-ip");
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "arbitrary-key" }))).toBe("unknown");
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "user-agent");
    expect(clientIpFromHeaders(new Headers({ "user-agent": "192.0.2.1" }))).toBe("unknown");
  });
  it("retains active limits and expires old budgets", () => {
    expect(rateLimit("form:local", budget).ok).toBe(true);
    expect(rateLimit("form:local", budget).ok).toBe(true);
    expect(rateLimit("form:local", budget).ok).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(rateLimit("form:local", budget).ok).toBe(true);
  });
  it("caps key cardinality without evicting active budgets", () => {
    for (let index = 0; index < 10_000; index++) expect(rateLimit(`local-${index}`, budget).ok).toBe(true);
    expect(rateLimit("excess-key", budget).ok).toBe(false);
    expect(rateLimit("local-0", budget).ok).toBe(true);
    expect(rateLimit("local-0", budget).ok).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(rateLimit("excess-key", budget).ok).toBe(true);
  });
});
