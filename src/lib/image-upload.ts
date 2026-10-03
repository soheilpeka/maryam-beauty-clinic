import "server-only";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_STORED_IMAGE_BYTES = 512 * 1024;
export const MEDIA_STORAGE_BYTES = 200 * 1024 * 1024;
let processing = 0;
export class ImageUploadError extends Error {
  constructor(public code: "TOO_LARGE" | "INVALID_IMAGE" | "STORAGE_FULL" | "UPLOAD_BUSY") { super(code); }
}

/** Stream-limit bytes before decoding; a claimed MIME type is never trusted. */
export async function readImageBody(request: Request): Promise<Buffer> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_UPLOAD_BYTES)) throw new ImageUploadError("TOO_LARGE");
  if (!request.body) throw new ImageUploadError("INVALID_IMAGE");
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_UPLOAD_BYTES) { await reader.cancel(); throw new ImageUploadError("TOO_LARGE"); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(parts, size);
}

/** Decode raster bytes, reject animation/vector input, rotate and remove metadata. */
export async function processImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) throw new ImageUploadError("TOO_LARGE");
  const raster = (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    || bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP");
  if (!raster) throw new ImageUploadError("INVALID_IMAGE");
  if (processing >= 2) throw new ImageUploadError("UPLOAD_BUSY");
  processing++;
  try {
    const image = sharp(bytes, { limitInputPixels: 24_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new ImageUploadError("INVALID_IMAGE");
    const { data, info } = await image.rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80, effort: 4 }).timeout({ seconds: 10 }).toBuffer({ resolveWithObject: true });
    if (data.length > MAX_STORED_IMAGE_BYTES) throw new ImageUploadError("TOO_LARGE");
    return { data, width: info.width, height: info.height, sizeBytes: data.length };
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError("INVALID_IMAGE");
  } finally { processing--; }
}
