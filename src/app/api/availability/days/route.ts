import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };

/**
 * Returns day keys (YYYY-MM-DD) within the booking window where the selected service/staff
 * combination has at least one working schedule. Used to grey out closed days in the UI.
 */
export async function GET(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const rl = rateLimit(`days:${ip}`, RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const serviceSlug = searchParams.get("service");
  const staffSlug = searchParams.get("staff");
  const windowDays = Math.min(Number(searchParams.get("days") ?? "21"), 90);

  if (!serviceSlug || !staffSlug) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { slug: serviceSlug } });
  if (!service || !service.active) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  let staffIds: string[] = [];
  if (staffSlug === "any") {
    const all = await prisma.staff.findMany({
      where: { active: true, services: { some: { serviceId: service.id } } },
      select: { id: true },
    });
    staffIds = all.map((s) => s.id);
  } else {
    const one = await prisma.staff.findUnique({
      where: { slug: staffSlug },
      select: { id: true, active: true, services: { select: { serviceId: true } } },
    });
    if (!one || !one.active || !one.services.some((s) => s.serviceId === service.id)) {
      return NextResponse.json({ days: [] });
    }
    staffIds = [one.id];
  }

  const schedules = await prisma.staffSchedule.findMany({
    where: { staffId: { in: staffIds } },
    select: { dayOfWeek: true, staffId: true },
  });
  if (schedules.length === 0) return NextResponse.json({ days: [] });

  const workedDays = new Set(schedules.map((s) => s.dayOfWeek));
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    // Day of week in the salon timezone (approximation by local calendar day is acceptable here
    // because the UI only uses this to hint at open days).
    if (workedDays.has(d.getDay())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      days.push(`${y}-${m}-${day}`);
    }
  }
  return NextResponse.json({ days });
}