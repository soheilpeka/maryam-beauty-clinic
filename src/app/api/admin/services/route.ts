import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin, authorizeAdminMutation } from "@/lib/admin-guard";
import { serviceSchema, flattenZodErrors } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { uniqueSlug } from "@/lib/slug";
import { shapeService } from "@/lib/admin-views";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/services
 *
 * Lists every service, including inactive ones (the salon needs to see what it has hidden),
 * with a booking count so the UI can warn before a delete. Requires a valid admin session.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;

  const services = await prisma.service.findMany({
    include: { _count: { select: { bookings: true } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ ok: true, services: services.map(shapeService) });
}

/**
 * POST /api/admin/services
 *
 * Creates a service. The slug is derived from the name (suffixed on collision) so the salon
 * never manages it directly; the new service is ordered last. The public booking page reads
 * these rows, so a new service is bookable immediately.
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

  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the service details." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const slug = await uniqueSlug(data.name, async (candidate) => {
    const found = await prisma.service.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return found !== null;
  });

  const last = await prisma.service.findFirst({ orderBy: { order: "desc" }, select: { order: true } });

  try {
    const created = await prisma.service.create({
      data: {
        slug,
        name: data.name,
        description: data.description?.trim() || null,
        price: data.price,
        duration: data.duration,
        bufferMin: data.bufferMin ?? 0,
        category: data.category?.trim() || "General",
        active: data.active ?? true,
        order: (last?.order ?? 0) + 1,
      },
      include: { _count: { select: { bookings: true } } },
    });

    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "service.create",
      targetType: "Service",
      targetId: created.id,
      detail: `${created.name} (${slug}, ${created.price / 100} CAD, ${created.duration} min)`,
      ip,
    });

    return NextResponse.json({ ok: true, service: shapeService(created) }, { status: 201 });
  } catch (e) {
    console.error("admin service create error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}