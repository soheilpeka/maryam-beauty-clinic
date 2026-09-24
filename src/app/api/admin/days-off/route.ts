import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin, authorizeAdminMutation } from "@/lib/admin-guard";
import { dayOffSchema, flattenZodErrors } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { localToUtc, parseDayKey } from "@/lib/datetime";
import { shapeDayOff } from "@/lib/admin-views";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/days-off?staffId=<id>
 *
 * Lists days off (optionally for one specialist). A null staffId is a salon-wide closure;
 * both kinds are returned sorted by date ascending.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;

  const staffId = request.nextUrl.searchParams.get("staffId");

  const rows = await prisma.dayOff.findMany({
    where: staffId ? { staffId } : undefined,
    include: { staff: { select: { name: true } } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ ok: true, daysOff: rows.map(shapeDayOff) });
}

/**
 * POST /api/admin/days-off
 *
 * Adds a full or partial day off. A partial day carries start/end minutes (salon local time);
 * omitting both means the whole day. The date is stored as UTC midnight of the salon-local
 * date, matching how the availability engine reads it back.
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

  const parsed = dayOffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the day off." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.staffId) {
    const staff = await prisma.staff.findUnique({
      where: { id: data.staffId },
      select: { name: true },
    });
    if (!staff) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Specialist not found." }, { status: 404 });
    }
  }

  const { year, month, day } = parseDayKey(data.dayKey);

  try {
    const created = await prisma.dayOff.create({
      data: {
        staffId: data.staffId ?? null,
        date: localToUtc(year, month, day, 0),
        startMin: data.startMin ?? null,
        endMin: data.endMin ?? null,
        note: data.note?.trim() || null,
      },
      include: { staff: { select: { name: true } } },
    });

    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "dayoff.create",
      targetType: "DayOff",
      targetId: created.id,
      detail: `${data.dayKey}${data.startMin !== undefined ? ` ${data.startMin}-${data.endMin}` : ""} for ${
        created.staff?.name ?? "the whole salon"
      }`,
      ip,
    });

    return NextResponse.json({ ok: true, dayOff: shapeDayOff(created) }, { status: 201 });
  } catch (e) {
    console.error("admin day off create error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}