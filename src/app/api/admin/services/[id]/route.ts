import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminMutation } from "@/lib/admin-guard";
import { serviceSchema, flattenZodErrors } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { shapeService } from "@/lib/admin-views";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/services/[id]
 *
 * Updates a service. Only the supplied fields are written. The slug is deliberately NOT
 * editable: it is the stable key existing booking links and translations reference.
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response as NextResponse;
  const { id } = await ctx.params;
  const ip = clientIpFromHeaders(request.headers);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = serviceSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the service details." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Service not found." }, { status: 404 });
  }

  try {
    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() || null } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.duration !== undefined ? { duration: data.duration } : {}),
        ...(data.bufferMin !== undefined ? { bufferMin: data.bufferMin } : {}),
        ...(data.category !== undefined ? { category: data.category.trim() || "General" } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
      include: { _count: { select: { bookings: true } } },
    });

    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "service.update",
      targetType: "Service",
      targetId: updated.id,
      detail: `${updated.name}: ${Object.keys(data).join(", ") || "no change"}`,
      ip,
    });

    return NextResponse.json({ ok: true, service: shapeService(updated) });
  } catch (e) {
    console.error("admin service update error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/services/[id]
 *
 * Refuses (409) while any booking references the service: bookings are the salon's history
 * and must keep pointing at what was charged. The UI offers deactivation instead, which hides
 * the service from the public page without losing the record. When there are no bookings the
 * row is removed (StaffService links cascade).
 */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response as NextResponse;
  const { id } = await ctx.params;
  const ip = clientIpFromHeaders(request.headers);

  const existing = await prisma.service.findUnique({
    where: { id },
    include: { _count: { select: { bookings: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Service not found." }, { status: 404 });
  }
  if (existing._count.bookings > 0) {
    return NextResponse.json(
      {
        error: "CONFLICT",
        message: `${existing._count.bookings} booking(s) reference this service, so it cannot be deleted. Deactivate it instead.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.service.delete({ where: { id } });
    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "service.delete",
      targetType: "Service",
      targetId: id,
      detail: `${existing.name} (${existing.slug})`,
      ip,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin service delete error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}