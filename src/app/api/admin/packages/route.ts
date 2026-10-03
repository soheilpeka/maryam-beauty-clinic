import { logServerError } from "@/lib/safe-log";
import { readJsonBody } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin, authorizeAdminMutation } from "@/lib/admin-guard";
import { packageSchema, flattenZodErrors } from "@/lib/validation";
import { uniqueSlug } from "@/lib/slug";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";
const include = { services: { include: { service: { select: { id: true, name: true, nameFr: true } } } }, images: { orderBy: { order: "asc" as const } } };

export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request); if (!auth.ok) return auth.response;
  const url = new URL(request.url); const q = url.searchParams.get("q")?.trim();
  const packages = await prisma.package.findMany({ where: q ? { OR: [{ name: { contains: q } }, { nameFr: { contains: q } }] } : undefined, include, orderBy: [{ order: "asc" }, { name: "asc" }] });
  return NextResponse.json({ ok: true, packages });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminMutation(request); if (!auth.ok) return auth.response;
  let body: unknown; try { body = await readJsonBody(request); } catch { return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 }); }
  const parsed = packageSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the package details." }, { status: 400 });
  const data = parsed.data;
  if (await prisma.service.count({ where: { id: { in: data.serviceIds } } }) !== data.serviceIds.length) return NextResponse.json({ error: "VALIDATION", fieldErrors: { serviceIds: "validation.service.required" } }, { status: 400 });
  const slug = await uniqueSlug(data.name, async (candidate) => Boolean(await prisma.package.findUnique({ where: { slug: candidate }, select: { id: true } })));
  const last = await prisma.package.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  try {
    const created = await prisma.package.create({ data: { slug, name: data.name, nameFr: data.nameFr, description: data.description || null, descriptionFr: data.descriptionFr || null, price: data.price, sessions: data.sessions, validityDays: data.validityDays ?? null, badge: data.badge || null, imageUrl: data.imageUrl || data.images?.[0]?.url || null, active: data.active ?? true, order: data.order ?? (last?.order ?? 0) + 1, services: { create: data.serviceIds.map((serviceId) => ({ serviceId })) }, images: data.images?.length ? { create: data.images.map((image, order) => ({ ...image, order })) } : undefined }, include });
    await writeAuditLog({ adminId: auth.session.adminId, action: "package.create", targetType: "Package", targetId: created.id, detail: created.name });
    return NextResponse.json({ ok: true, package: created }, { status: 201 });
  } catch (error) { logServerError("admin package create error", error); return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 }); }
}
