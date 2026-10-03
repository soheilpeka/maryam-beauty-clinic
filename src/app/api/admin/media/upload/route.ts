import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminMutation } from "@/lib/admin-guard";
import { consumeRateLimit } from "@/lib/rate-limit";
import { readImageBody, processImage, ImageUploadError } from "@/lib/image-upload";
import { storeImage } from "@/lib/upload-storage";
import { writeAuditLog } from "@/lib/audit";
import { logServerError } from "@/lib/safe-log";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response;
  const budget = await consumeRateLimit(`media-upload:${auth.session.adminId}`, { limit: 20, windowMs: 60_000 });
  if (!budget.ok) return NextResponse.json({ error: "RATE_LIMIT" }, { status: budget.unavailable ? 503 : 429, headers: { "Retry-After": String(Math.ceil(budget.retryAfterMs / 1000)) } });
  if (!["image/jpeg", "image/png", "image/webp"].includes(request.headers.get("content-type") ?? "")) return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 415 });
  try {
    const image = await processImage(await readImageBody(request));
    const stored = await storeImage(image);
    await writeAuditLog({ adminId: auth.session.adminId, action: "media.upload", targetType: "MediaUpload", targetId: stored.id, detail: "Processed WebP photograph" });
    return NextResponse.json({ ok: true, url: stored.url, width: image.width, height: image.height }, { status: 201 });
  } catch (error) {
    if (error instanceof ImageUploadError) return NextResponse.json({ error: error.code }, { status: error.code === "STORAGE_FULL" ? 409 : error.code === "TOO_LARGE" ? 413 : error.code === "UPLOAD_BUSY" ? 429 : 415 });
    logServerError("media upload failed", error);
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 503 });
  }
}
