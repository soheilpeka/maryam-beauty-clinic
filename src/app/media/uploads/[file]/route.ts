import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-guard";
import { imageIsPublished } from "@/lib/upload-storage";
import { logServerError } from "@/lib/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
export async function GET(request: NextRequest, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!/^[a-f0-9]{32}\.webp$/.test(file)) return new Response(null, { status: 404, headers });
  try {
    const url = `/media/uploads/${file}`;
    if (!await imageIsPublished(url) && !(await authorizeAdmin(request)).ok) return new Response(null, { status: 404, headers });
    const image = await prisma.mediaUpload.findUnique({ where: { id: file.slice(0, -5) } });
    if (!image) return new Response(null, { status: 404, headers });
    return new Response(new Uint8Array(image.data), { headers: { ...headers, "Content-Type": "image/webp", "Content-Length": String(image.sizeBytes), "Content-Disposition": 'inline; filename="photo.webp"' } });
  } catch (error) {
    logServerError("media read failed", error);
    return new Response(null, { status: 503, headers });
  }
}
