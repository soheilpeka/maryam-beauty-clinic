import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin, authorizeAdminMutation } from "@/lib/admin-guard";
import { staffSchema, flattenZodErrors } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { shapeStaff, STAFF_INCLUDE } from "@/lib/admin-views";

export const dynamic = "force-dynamic";

const STAFF_WITH_COUNT = {
  ...STAFF_INCLUDE,
  _count: { select: { bookings: true } },
} as const;

/** GET /api/admin/staff/[id] - one specialist with schedule and days off. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;
  const { id } = await ctx.params;

  const staff = await prisma.staff.findUnique({ where: { id }, include: STAFF_WITH_COUNT });
  if (!staff) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Specialist not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, staff: shapeStaff(staff) });
}

/**
 * PATCH /api/admin/staff/[id]
 *
 * Updates a specialist. When serviceIds is supplied the set of services they perform is
 * replaced wholesale (deleteMany + createMany), which is what the checkbox list in the UI
 * expects. The slug is not editable (stable key for booking links).
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

  const parsed = staffSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the specialist details." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const existing = await prisma.staff.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Specialist not found." }, { status: 404 });
  }

  let serviceIds: string[] | undefined;
  if (data.serviceIds) {
    serviceIds = await prisma.service
      .findMany({ where: { id: { in: data.serviceIds } }, select: { id: true } })
      .then((rows) => rows.map((r) => r.id));
  }

  try {
    const updated = await prisma.staff.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.role !== undefined ? { role: data.role.trim() || "Specialist" } : {}),
        ...(data.bio !== undefined ? { bio: data.bio.trim() || null } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl.trim() || null } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(serviceIds
          ? { services: { deleteMany: {}, createMany: { data: serviceIds.map((s) => ({ serviceId: s })) } } }
          : {}),
      },
      include: STAFF_WITH_COUNT,
    });

    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "staff.update",
      targetType: "Staff",
      targetId: updated.id,
      detail: `${updated.name}: ${Object.keys(data).join(", ") || "no change"}`,
      ip,
    });

    return NextResponse.json({ ok: true, staff: shapeStaff(updated) });
  } catch (e) {
    console.error("admin staff update error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/staff/[id]
 *
 * Same rule as services: a specialist with bookings cannot be removed (their history must
 * stay intact), the UI offers deactivation instead. Without bookings the row is deleted and
 * the schedule, days off and service links cascade away.
 */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response as NextResponse;
  const { id } = await ctx.params;
  const ip = clientIpFromHeaders(request.headers);

  const existing = await prisma.staff.findUnique({
    where: { id },
    include: { _count: { select: { bookings: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Specialist not found." }, { status: 404 });
  }
  if (existing._count.bookings > 0) {
    return NextResponse.json(
      {
        error: "CONFLICT",
        message: `${existing._count.bookings} booking(s) reference this specialist, so they cannot be deleted. Deactivate them instead.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.staff.delete({ where: { id } });
    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "staff.delete",
      targetType: "Staff",
      targetId: id,
      detail: `${existing.name} (${existing.slug})`,
      ip,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin staff delete error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}