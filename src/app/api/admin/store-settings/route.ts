import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin, authorizeAdminMutation } from "@/lib/admin-guard";
import { readJsonBody } from "@/lib/request-body";
import { storeSettingsSchema, flattenZodErrors } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { logServerError } from "@/lib/safe-log";
import { getStoreSettings } from "@/lib/order";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response;
  const settings = await getStoreSettings(prisma);
  return NextResponse.json({ ok: true, settings: {
    enabled: settings.enabled,
    shippingFeeCents: settings.shippingFeeCents,
    freeShippingThresholdCents: settings.freeShippingThresholdCents,
    reservationMinutes: settings.reservationMinutes,
  } }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminMutation(request);
  if (!auth.ok) return auth.response;
  let body: unknown;
  try { body = await readJsonBody(request); }
  catch { return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON body." }, { status: 400 }); }
  const parsed = storeSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION", fieldErrors: flattenZodErrors(parsed), message: "Please check the store settings." }, { status: 400 });
  try {
    const settings = await prisma.storeSetting.upsert({
      where: { id: "default" },
      create: { id: "default", ...parsed.data },
      update: parsed.data,
    });
    await writeAuditLog({ adminId: auth.session.adminId, action: "store.settings.update", targetType: "StoreSetting", targetId: settings.id, detail: Object.keys(parsed.data).join(", "), ip: clientIpFromHeaders(request.headers) });
    return NextResponse.json({ ok: true, settings: parsed.data });
  } catch (error) {
    logServerError("admin store settings update error", error);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong." }, { status: 500 });
  }
}
