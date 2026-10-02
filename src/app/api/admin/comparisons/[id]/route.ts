import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminMutation } from "@/lib/admin-guard";
import { comparisonPatchSchema } from "@/lib/comparison-validation";
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminMutation(request); if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 }); }
  const parsed = comparisonPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  try {
    const item = await prisma.$transaction(async tx => {
      for (const url of new Set([parsed.data.imageUrl, parsed.data.afterImageUrl].filter((url): url is string => Boolean(url)))) await tx.mediaAsset.upsert({ where: { url }, create: { url }, update: {} });
      const record = await tx.comparisonItem.update({ where: { id }, data: parsed.data });
      await tx.auditLog.create({ data: { adminId: auth.session.adminId, action: "comparison.update", targetType: "ComparisonItem", targetId: id, detail: Object.keys(parsed.data).join(", ") } });
      return record;
    });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025" ? "NOT_FOUND" : "INTERNAL" }, { status: error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025" ? 404 : 500 });
  }
}
