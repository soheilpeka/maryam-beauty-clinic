import { describe, expect, it, vi, beforeEach } from "vitest";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { readImageBody, processImage, MAX_UPLOAD_BYTES } from "@/lib/image-upload";
import { isSafeImageUrl } from "@/lib/media";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), admin: vi.fn(), published: vi.fn(), store: vi.fn(), read: vi.fn(), rate: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/admin-guard", () => ({ authorizeAdminMutation: mocks.auth, authorizeAdmin: mocks.admin }));
vi.mock("@/lib/upload-storage", () => ({ storeImage: mocks.store, imageIsPublished: mocks.published }));
vi.mock("@/lib/prisma", () => ({ prisma: { mediaUpload: { findUnique: mocks.read } } }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit: mocks.rate }));
vi.mock("@/lib/audit", () => ({ writeAuditLog: mocks.audit }));
import { POST } from "@/app/api/admin/media/upload/route";
import { GET } from "@/app/media/uploads/[file]/route";
const id = "a".repeat(32);
beforeEach(() => { vi.clearAllMocks(); mocks.rate.mockResolvedValue({ ok: true }); mocks.auth.mockResolvedValue({ ok: true, session: { adminId: "synthetic-admin" } }); });

describe("processed CMS uploads", () => {
  it("resizes real pixels, strips EXIF/GPS and returns decoded WebP", async () => {
    const original = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "red" } }).jpeg().withMetadata().toBuffer();
    const result = await processImage(original);
    const metadata = await sharp(result.data).metadata();
    expect(metadata.format).toBe("webp"); expect(metadata.width).toBe(1600); expect(metadata.height).toBe(800); expect(metadata.exif).toBeUndefined();
    expect(result.data.length).toBeLessThanOrEqual(512 * 1024);
  });
  it("rejects SVG, spoofed bytes and damaged files", async () => {
    for (const file of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), Buffer.from("not a photograph"), Buffer.from([255, 216, 255, 1])]) await expect(processImage(file)).rejects.toMatchObject({ code: "INVALID_IMAGE" });
  });
  it("bounds streamed bodies even without content-length", async () => {
    const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(MAX_UPLOAD_BYTES)); c.enqueue(new Uint8Array(1)); c.close(); } });
    const request = new Request("http://localhost/upload", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    await expect(readImageBody(request)).rejects.toMatchObject({ code: "TOO_LARGE" });
  });
  it("requires authentication and CSRF before reading or storing files", async () => {
    for (const status of [401, 403]) {
      mocks.auth.mockResolvedValueOnce({ ok: false, response: new Response(null, { status }) });
      expect((await POST(new NextRequest("http://localhost/api/admin/media/upload", { method: "POST" }))).status).toBe(status);
    }
    expect(mocks.store).not.toHaveBeenCalled(); expect(mocks.rate).not.toHaveBeenCalled();
  });
  it("refuses uploads when the durable budget is unavailable", async () => {
    mocks.rate.mockResolvedValue({ ok: false, unavailable: true, retryAfterMs: 60000 });
    const result = await POST(new NextRequest("http://localhost/api/admin/media/upload", { method: "POST" }));
    expect(result.status).toBe(503); expect(result.headers.get("retry-after")).toBe("60"); expect(mocks.store).not.toHaveBeenCalled();
  });
  it("processes and persists an authorized photo", async () => {
    const file = await sharp({ create: { width: 8, height: 8, channels: 3, background: "blue" } }).png().toBuffer();
    mocks.store.mockResolvedValue({ id, url: `/media/uploads/${id}.webp` });
    const response = await POST(new NextRequest("http://localhost/api/admin/media/upload", { method: "POST", headers: { "content-type": "image/png" }, body: file }));
    expect(response.status).toBe(201); expect(mocks.store.mock.calls[0][0].sizeBytes).toBeGreaterThan(0); expect(mocks.audit).toHaveBeenCalled();
  });
  it("keeps unsaved drafts private and reads published bytes without customer data", async () => {
    const context = { params: Promise.resolve({ file: `${id}.webp` }) };
    const request = new NextRequest(`http://localhost/media/uploads/${id}.webp`);
    mocks.published.mockResolvedValue(false); mocks.admin.mockResolvedValue({ ok: false });
    expect((await GET(request, context)).status).toBe(404); expect(mocks.read).not.toHaveBeenCalled();
    mocks.published.mockResolvedValue(true); mocks.read.mockResolvedValue({ data: new Uint8Array([1, 2]), sizeBytes: 2 });
    const publicImage = await GET(request, context);
    expect(publicImage.status).toBe(200); expect(publicImage.headers.get("content-type")).toBe("image/webp"); expect(publicImage.headers.get("cache-control")).toContain("no-store"); expect(mocks.admin).toHaveBeenCalledTimes(1);
    mocks.published.mockResolvedValue(false); mocks.admin.mockResolvedValue({ ok: true });
    expect((await GET(request, context)).status).toBe(200);
  });
  it("accepts only generated upload paths, excluding traversal and arbitrary names", () => {
    expect(isSafeImageUrl(`/media/uploads/${id}.webp`)).toBe(true);
    for (const path of ["/media/uploads/../photo.webp", "/media/uploads/secret.jpg", "/media/uploads/anything.webp"]) expect(isSafeImageUrl(path)).toBe(false);
  });
});
