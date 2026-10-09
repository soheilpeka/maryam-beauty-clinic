import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminMutation } from "@/lib/admin-guard";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request-body";
import { logServerError } from "@/lib/safe-log";
import { categoryNameFromLegacyId, listStoreCategories } from "@/lib/store-categories";
import { prisma } from "@/lib/prisma";
import { flattenZodErrors, storeCategorySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  let body: unknown;
  try { body = await readJsonBody(request); }
  catch { return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body." }, { status: 400 }); }

  const parsed = storeCategorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please enter a category name in both languages." }, { status: 400 });
  const data = parsed.data;

  const existing = await prisma.storeCategory.findUnique({ where: { id } });
  const legacyName = existing ? null : categoryNameFromLegacyId(id);
  const previousName = existing?.name ?? legacyName;
  if (!previousName) return NextResponse.json({ error: "NOT_FOUND", message: "Category not found." }, { status: 404 });
  const listedCategories = await listStoreCategories(true);
  const order = existing?.order ?? listedCategories.find((category) => category.id === id)?.order ?? 0;

  const conflicts = await prisma.storeCategory.findMany({ where: { id: { not: existing?.id ?? "" } }, select: { name: true } });
  if (conflicts.some((category) => category.name.localeCompare(data.name, "en", { sensitivity: "accent" }) === 0)) {
    return NextResponse.json({ error: "CONFLICT", message: "A category with this English name already exists." }, { status: 409 });
  }

  try {
    const category = await prisma.$transaction(async (tx) => {
      const managed = existing
        ? await tx.storeCategory.update({
            where: { id: existing.id },
            data: { name: data.name, nameFr: data.nameFr?.trim() || null },
          })
        : await tx.storeCategory.create({
            data: { name: data.name, nameFr: data.nameFr?.trim() || null, order },
          });

      if (previousName !== data.name) {
        await tx.product.updateMany({ where: { category: previousName }, data: { category: data.name } });
      }
      return managed;
    });

    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "store.category.update",
      targetType: "StoreCategory",
      targetId: category.id,
      detail: `${previousName} → ${category.name}`,
      ip: clientIpFromHeaders(request.headers),
    });
    return NextResponse.json({ ok: true, category });
  } catch (error) {
    logServerError("admin store category update error", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "CONFLICT", message: "A category with this English name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}
