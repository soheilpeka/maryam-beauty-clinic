import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminMutation } from "@/lib/admin-guard";
import { scheduleSchema, flattenZodErrors } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { shapeStaff, STAFF_INCLUDE } from "@/lib/admin-views";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/staff/[id]/schedule
 *
 * Replaces a specialist's whole weekly schedule in one transaction: every existing window is
 * deleted (breaks cascade) and the submitted windows are recreated with their breaks. The
 * schema enforces start < end per window and that every break lies inside its window, so the
 * data reaching SQLite is always consistent.
 */
export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the working hours." },
      { status: 400 },
    );
  }

  const existing = await prisma.staff.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Specialist not found." }, { status: 404 });
  }

  const windows = parsed.data.windows;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.staffSchedule.deleteMany({ where: { staffId: id } });
      for (const w of windows) {
        await tx.staffSchedule.create({
          data: {
            staffId: id,
            dayOfWeek: w.dayOfWeek,
            startTime: w.startTime,
            endTime: w.endTime,
            breaks: {
              create: (w.breaks ?? []).map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
            },
          },
        });
      }
    });

    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "staff.schedule",
      targetType: "Staff",
      targetId: id,
      detail: `${existing.name}: ${windows.length} window(s) across week`,
      ip,
    });

    const staff = await prisma.staff.findUniqueOrThrow({
      where: { id },
      include: { ...STAFF_INCLUDE, _count: { select: { bookings: true } } },
    });
    return NextResponse.json({ ok: true, staff: shapeStaff(staff) });
  } catch (e) {
    console.error("admin schedule update error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}