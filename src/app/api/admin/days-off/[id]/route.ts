import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminMutation } from "@/lib/admin-guard";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { localDayKey } from "@/lib/datetime";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/days-off/[id]
 *
 * Removes one day off. Deleting is always allowed (it only reopens availability); the audit
 * entry keeps the record of what was removed.
 */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response as NextResponse;
  const { id } = await ctx.params;
  const ip = clientIpFromHeaders(request.headers);

  const existing = await prisma.dayOff.findUnique({
    where: { id },
    include: { staff: { select: { name: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Day off not found." }, { status: 404 });
  }

  try {
    await prisma.dayOff.delete({ where: { id } });
    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "dayoff.delete",
      targetType: "DayOff",
      targetId: id,
      detail: `${localDayKey(existing.date)} for ${existing.staff?.name ?? "the whole salon"}`,
      ip,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin day off delete error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}