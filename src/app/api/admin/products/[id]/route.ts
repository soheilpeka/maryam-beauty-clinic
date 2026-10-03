import { logServerError } from "@/lib/safe-log";
import { readJsonBody } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin, authorizeAdminMutation } from "@/lib/admin-guard";
import { productPatchSchema, flattenZodErrors } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { shapeProduct } from "@/lib/store-views";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/products/[id]
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } }, images: { orderBy: { order: "asc" } } },
  });
  if (!product) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, product: shapeProduct(product) });
}

/**
 * PATCH /api/admin/products/[id]
 *
 * Only the supplied fields are written. The slug is deliberately NOT editable: it is the
 * stable key order links and translations reference, exactly like a service slug.
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response as NextResponse;
  const { id } = await ctx.params;
  const ip = clientIpFromHeaders(request.headers);

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = productPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the product details." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Product not found." }, { status: 404 });
  }

  const pricing = productPatchSchema.safeParse({ price: data.price ?? existing.price, salePrice: data.salePrice !== undefined ? data.salePrice : existing.salePrice, compareAtPrice: data.compareAtPrice ?? existing.compareAtPrice ?? undefined });
  if (!pricing.success) return NextResponse.json({ error: "VALIDATION", fieldErrors: flattenZodErrors(pricing) }, { status: 400 });

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.nameFr !== undefined ? { nameFr: data.nameFr } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
        ...(data.descriptionFr !== undefined ? { descriptionFr: data.descriptionFr.trim() || null } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.compareAtPrice !== undefined ? { compareAtPrice: data.compareAtPrice || null } : {}),
        ...(data.salePrice !== undefined ? { salePrice: data.salePrice || null } : {}),
        ...(data.category !== undefined ? { category: data.category.trim() || "General" } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl.trim() || null } : {}),
        ...(data.stock !== undefined ? { stock: data.stock } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.featured !== undefined ? { featured: data.featured } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.images !== undefined
          ? {
              images: {
                deleteMany: {},
                create: data.images.map((image, order) => ({ ...image, order })),
              },
            }
          : {}),
      },
      include: { _count: { select: { orderItems: true } }, images: { orderBy: { order: "asc" } } },
    });

    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "product.update",
      targetType: "Product",
      targetId: updated.id,
      detail: `${updated.name}: ${Object.keys(data).join(", ") || "no change"}`,
      ip,
    });

    return NextResponse.json({ ok: true, product: shapeProduct(updated) });
  } catch (e) {
    logServerError("admin product update error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/[id]
 *
 * Refuses (409) while any order references the product: orders are the salon's history and
 * must keep pointing at what was charged. The UI offers deactivation instead, which hides
 * the product from the store without losing the record. When there are no orders the row is
 * removed (orderItem links were already SetNull-safe, but a delete is cleaner here).
 */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response as NextResponse;
  const { id } = await ctx.params;
  const ip = clientIpFromHeaders(request.headers);

  const existing = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Product not found." }, { status: 404 });
  }
  if (existing._count.orderItems > 0) {
    return NextResponse.json(
      {
        error: "CONFLICT",
        message: `${existing._count.orderItems} order(s) reference this product, so it cannot be deleted. Deactivate it instead.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.product.delete({ where: { id } });
    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "product.delete",
      targetType: "Product",
      targetId: id,
      detail: `${existing.name} (${existing.slug})`,
      ip,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logServerError("admin product delete error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}
