import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareUpload } from "@/lib/prepare-upload";

afterEach(() => vi.unstubAllGlobals());
describe("upload transport preparation", () => {
  it("bounds dimensions and retries compression before sending", async () => {
    const close = vi.fn();
    const drawImage = vi.fn();
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob: vi.fn() };
    canvas.toBlob.mockImplementationOnce(callback => callback(new Blob([new Uint8Array(600 * 1024)], { type: "image/webp" })))
      .mockImplementationOnce(callback => callback(new Blob([new Uint8Array(300 * 1024)], { type: "image/webp" })));
    vi.stubGlobal("document", { createElement: () => canvas });
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }));
    const output = await prepareUpload(new File(["synthetic"], "photo.png", { type: "image/png" }));
    expect(output.size).toBe(300 * 1024);
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(1200);
    expect(close).toHaveBeenCalledOnce();
  });
  it("rejects excessive decoded pixels and releases the bitmap", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 10000, height: 10000, close }));
    await expect(prepareUpload(new File(["synthetic"], "photo.png", { type: "image/png" }))).rejects.toThrow("INVALID_IMAGE");
    expect(close).toHaveBeenCalledOnce();
  });
  it("refuses unsupported files before decoding", async () => {
    const decode = vi.fn(); vi.stubGlobal("createImageBitmap", decode);
    await expect(prepareUpload(new File(["synthetic"], "photo.svg", { type: "image/svg+xml" }))).rejects.toThrow("INVALID_IMAGE");
    expect(decode).not.toHaveBeenCalled();
  });
});
