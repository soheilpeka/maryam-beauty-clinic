import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin, authorizeAdminMutation } from "@/lib/admin-guard";
import { staffSchema, flattenZodErrors } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { uniqueSlug } from "@/lib/slug";
import { shapeStaff, STAFF_INCLUDE } from "@/lib/admin-views";

export const dynamic = "force-dynamic";

const STAFF_WITH_COUNT = {
  ...STAFF_INCLUDE,
  _count: { select: { bookings: true } },
} as const;

/**
 * GET /api/admin/staff
 *
 * Lists every specialist with the services they perform, their weekly schedule and their
 * upcoming days off, so the Staff page renders in one round trip. Includes inactive staff.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;

  const staff = await prisma.staff.findMany({
    include: STAFF_WITH_COUNT,
    orderBy: [{ name: "asc" }],
  });

  return NextResponse.json({ ok: true, staff: staff.map(shapeStaff) });
}

/**
 * POST /api/admin/staff
 *
 * Creates a specialist. serviceIds (optional) links the services they can perform, which is
 * what makes them selectable on the public booking page. The slug is derived from the name.
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

  const parsed = staffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the specialist details." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const slug = await uniqueSlug(data.name, async (candidate) => {
    const found = await prisma.staff.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return found !== null;
  });

  // Only link services that actually exist; a stale id from the UI must not create a
  // dangling relation.
  const serviceIds = (data.serviceIds ?? []).length
    ? await prisma.service
        .findMany({ where: { id: { in: data.serviceIds } }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id))
    : [];

  try {
    const created = await prisma.staff.create({
      data: {
        slug,
        name: data.name,
        role: data.role?.trim() || "Specialist",
        bio: data.bio?.trim() || null,
        avatarUrl: data.avatarUrl?.trim() || null,
        active: data.active ?? true,
        services: serviceIds.length
          ? { createMany: { data: serviceIds.map((serviceId) => ({ serviceId })) } }
          : undefined,
      },
      include: STAFF_WITH_COUNT,
    });

    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "staff.create",
      targetType: "Staff",
      targetId: created.id,
      detail: `${created.name} (${slug}, ${serviceIds.length} service(s))`,
      ip,
    });

    return NextResponse.json({ ok: true, staff: shapeStaff(created) }, { status: 201 });
  } catch (e) {
    console.error("admin staff create error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}