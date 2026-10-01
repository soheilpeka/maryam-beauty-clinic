import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin, authorizeAdminMutation } from "@/lib/admin-guard";
import { productSchema, flattenZodErrors } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { uniqueSlug } from "@/lib/slug";
import { shapeProduct } from "@/lib/store-views";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/products
 *
 * Lists every product, including inactive and sold-out ones (the salon needs to see what it
 * has hidden and what needs restocking), with an order count so the UI can warn before a
 * delete. Requires a valid admin session.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;

  const products = await prisma.product.findMany({
    include: { _count: { select: { orderItems: true } }, images: { orderBy: { order: "asc" } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ ok: true, products: products.map(shapeProduct) });
}

/**
 * POST /api/admin/products
 *
 * Creates a product. The slug is derived from the name (suffixed on collision) so the salon
 * never manages it directly, matching how services are handled; the new product is ordered
 * last and is immediately visible on the public store.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response as NextResponse;
  const ip = clientIpFromHeaders(request.headers);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the product details." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const slug = await uniqueSlug(data.name, async (candidate) => {
    const found = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    return found !== null;
  });

  const last = await prisma.product.findFirst({ orderBy: { order: "desc" }, select: { order: true } });

  try {
    const created = await prisma.product.create({
      data: {
        slug,
        sku: data.sku,
        name: data.name,
        nameFr: data.nameFr,
        description: data.description?.trim() || null,
        descriptionFr: data.descriptionFr?.trim() || null,
        price: data.price,
        compareAtPrice: data.compareAtPrice ?? null,
        salePrice: data.salePrice ?? null,
        category: data.category?.trim() || "General",
        imageUrl: data.imageUrl?.trim() || data.images?.[0]?.url || null,
        stock: data.stock ?? 0,
        active: data.active ?? true,
        featured: data.featured ?? false,
        order: data.order ?? ((last?.order ?? 0) + 1),
        images: data.images?.length
          ? {
              create: data.images.map((image, order) => ({ ...image, order })),
            }
          : undefined,
      },
      include: { _count: { select: { orderItems: true } }, images: { orderBy: { order: "asc" } } },
    });

    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "product.create",
      targetType: "Product",
      targetId: created.id,
      detail: `${created.name} (${slug}, ${created.price / 100} CAD, stock ${created.stock})`,
      ip,
    });

    return NextResponse.json({ ok: true, product: shapeProduct(created) }, { status: 201 });
  } catch (e) {
    console.error("admin product create error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}
