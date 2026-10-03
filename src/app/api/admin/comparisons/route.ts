import { readJsonBody } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin, authorizeAdminMutation } from "@/lib/admin-guard";
import { comparisonSchema } from "@/lib/comparison-validation";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request); if (!auth.ok) return auth.response;
  try {
    const comparisons = await prisma.comparisonItem.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
    return NextResponse.json({ ok: true, comparisons });
  } catch { return NextResponse.json({ error: "INTERNAL" }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  const auth = await authorizeAdminMutation(request); if (!auth.ok) return auth.response;
  let body: unknown; try { body = await readJsonBody(request); } catch { return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 }); }
  const parsed = comparisonSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  try {
    const item = await prisma.$transaction(async tx => {
      for (const url of new Set([parsed.data.imageUrl, parsed.data.afterImageUrl])) await tx.mediaAsset.upsert({ where: { url }, create: { url }, update: {} });
      const record = await tx.comparisonItem.create({ data: parsed.data });
      await tx.auditLog.create({ data: { adminId: auth.session.adminId, action: "comparison.create", targetType: "ComparisonItem", targetId: record.id } });
      return record;
    });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch { return NextResponse.json({ error: "INTERNAL" }, { status: 500 }); }
}
