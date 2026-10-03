import { describe, expect, it, vi } from "vitest";
import { MAX_JSON_BODY_BYTES, readJsonBody } from "@/lib/request-body";
import { logServerError } from "@/lib/safe-log";

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/contact", { method: "POST", body, headers });
}

describe("bounded JSON request bodies", () => {
  it("accepts normal JSON", async () => {
    await expect(readJsonBody(request('{"name":"Local test"}'))).resolves.toEqual({ name: "Local test" });
  });
  it("rejects oversized bodies with and without declared length", async () => {
    const body = JSON.stringify({ value: "x".repeat(MAX_JSON_BODY_BYTES) });
    await expect(readJsonBody(request(body))).rejects.toThrow("Invalid JSON body");
    await expect(readJsonBody(request("{}", { "content-length": String(MAX_JSON_BODY_BYTES + 1) }))).rejects.toThrow();
    await expect(readJsonBody(request(body, { "content-length": "2" }))).rejects.toThrow();
  });
  it("bounds chunked streams and cancels at the limit", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_JSON_BODY_BYTES));
        controller.enqueue(new Uint8Array(1));
      }, cancel,
    });
    const streamed = new Request("http://localhost", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    await expect(readJsonBody(streamed)).rejects.toThrow();
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("rejects malformed, missing and invalid UTF-8 bodies", async () => {
    await expect(readJsonBody(request("{"))).rejects.toThrow();
    await expect(readJsonBody(new Request("http://localhost", { method: "POST" }))).rejects.toThrow();
    await expect(readJsonBody(new Request("http://localhost", { method: "POST", body: new Uint8Array([255]) }))).rejects.toThrow();
  });
});

describe("privacy-safe server logging", () => {
  it("keeps only a static event and a recognized error code", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      logServerError("booking request error", Object.assign(new Error("synthetic contact details and token"), { code: "P2002" }));
      logServerError("booking request error", { code: "synthetic private data", message: "synthetic contact details" });
      expect(log.mock.calls).toEqual([["booking request error", { code: "P2002" }], ["booking request error", { code: "INTERNAL" }]]);
    } finally { log.mockRestore(); }
  });
});
