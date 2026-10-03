import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { MEDIA_STORAGE_BYTES, ImageUploadError } from "@/lib/image-upload";

export async function storeImage(image: { data: Buffer; sizeBytes: number; width: number; height: number }) {
  const id = randomBytes(16).toString("hex");
  // Quota and insert are one SQLite statement, including across concurrent instances.
  const written = await prisma.$executeRaw`
    INSERT INTO "MediaUpload" ("id", "data", "sizeBytes", "width", "height", "createdAt")
    SELECT ${id}, ${image.data}, ${image.sizeBytes}, ${image.width}, ${image.height}, ${new Date()}
    WHERE (SELECT COALESCE(SUM("sizeBytes"), 0) FROM "MediaUpload") + ${image.sizeBytes} <= ${MEDIA_STORAGE_BYTES}
      AND (SELECT COUNT(*) FROM "MediaUpload") < 2000
  `;
  if (!written) throw new ImageUploadError("STORAGE_FULL");
  return { id, url: `/media/uploads/${id}.webp` };
}

/** A draft is not public until it belongs to active public content. */
export async function imageIsPublished(url: string): Promise<boolean> {
  const hits = await Promise.all([
    prisma.galleryItem.findFirst({ where: { active: true, imageUrl: url }, select: { id: true } }),
    prisma.comparisonItem.findFirst({ where: { active: true, OR: [{ imageUrl: url }, { afterImageUrl: url }] }, select: { id: true } }),
    prisma.service.findFirst({ where: { active: true, OR: [{ imageUrl: url }, { images: { some: { url } } }] }, select: { id: true } }),
    prisma.product.findFirst({ where: { active: true, OR: [{ imageUrl: url }, { images: { some: { url } } }] }, select: { id: true } }),
    prisma.package.findFirst({ where: { active: true, OR: [{ imageUrl: url }, { images: { some: { url } } }] }, select: { id: true } }),
    prisma.staff.findFirst({ where: { active: true, avatarUrl: url }, select: { id: true } }),
  ]);
  return hits.some(Boolean);
}
