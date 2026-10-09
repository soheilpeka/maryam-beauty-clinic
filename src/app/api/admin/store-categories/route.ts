import { NextRequest, NextResponse } from "next/server";
import { authorizeAdmin, authorizeAdminMutation } from "@/lib/admin-guard";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request-body";
import { logServerError } from "@/lib/safe-log";
import { listStoreCategories } from "@/lib/store-categories";
import { prisma } from "@/lib/prisma";
import { flattenZodErrors, storeCategorySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, categories: await listStoreCategories(true) }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try { body = await readJsonBody(request); }
  catch { return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body." }, { status: 400 }); }

  const parsed = storeCategorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please enter a category name in both languages." }, { status: 400 });

  const data = parsed.data;
  const categories = await listStoreCategories(true);
  if (categories.some((category) => category.name.localeCompare(data.name, "en", { sensitivity: "accent" }) === 0)) {
    return NextResponse.json({ error: "CONFLICT", message: "A category with this English name already exists." }, { status: 409 });
  }

  try {
    const category = await prisma.storeCategory.create({
      data: {
        name: data.name,
        nameFr: data.nameFr?.trim() || null,
        order: categories.length ? Math.max(...categories.map((item) => item.order)) + 1 : 0,
      },
    });
    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "store.category.create",
      targetType: "StoreCategory",
      targetId: category.id,
      detail: `${category.name} / ${category.nameFr ?? ""}`,
      ip: clientIpFromHeaders(request.headers),
    });
    return NextResponse.json({ ok: true, category }, { status: 201 });
  } catch (error) {
    logServerError("admin store category create error", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "CONFLICT", message: "A category with this English name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}
