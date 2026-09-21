import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadStaffDay, computeSlots, ServiceNotFoundError, StaffNotFoundError, StaffNotQualifiedError } from "@/lib/availability";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };

export async function GET(request: NextRequest) {
  const ip = clientIpFromHeaders(request.headers);
  const rl = rateLimit(`slots:${ip}`, RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "TOO_MANY_REQUESTS", message: "Please slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const serviceSlug = searchParams.get("service");
  const staffSlug = searchParams.get("staff");
  const dayKey = searchParams.get("date");

  if (!serviceSlug || !staffSlug || !dayKey) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "service, staff and date are required" },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid date" }, { status: 400 });
  }

  const setting = await prisma.businessSetting.findUnique({ where: { id: "default" } });
  const slotIntervalMin = setting?.slotIntervalMin ?? 30;

  // "any" staff: return merged availability across all qualified staff.
  if (staffSlug === "any") {
    const service = await prisma.service.findUnique({ where: { slug: serviceSlug } });
    if (!service || !service.active) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Service not found" }, { status: 404 });
    }
    const staff = await prisma.staff.findMany({
      where: { active: true, services: { some: { serviceId: service.id } } },
      include: { schedules: { include: { breaks: true } }, daysOff: true },
    });

    const collected: Array<{ startMinutes: number; staffId: string }> = [];
    for (const member of staff) {
      try {
        const data = await loadStaffDay(prisma, { serviceId: service.id, staffId: member.id, dayKey });
        const slots = computeSlots(data, { serviceId: service.id, staffId: member.id, dayKey }, {
          slotIntervalMin,
          now: new Date(),
        });
        for (const s of slots) collected.push({ startMinutes: s.startMinutes, staffId: member.id });
      } catch {
        // Staff member unavailable on this day; skip.
      }
    }
    // Deduplicate by start time, keeping the first staff member per time.
    const byTime = new Map<number, string>();
    for (const c of collected) if (!byTime.has(c.startMinutes)) byTime.set(c.startMinutes, c.staffId);
    const merged = [...byTime.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([startMinutes, staffId]) => ({ startMinutes, staffId }));

    return NextResponse.json({ slots: merged });
  }

  const service = await prisma.service.findUnique({ where: { slug: serviceSlug } });
  if (!service || !service.active) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Service not found" }, { status: 404 });
  }
  const staff = await prisma.staff.findUnique({ where: { slug: staffSlug } });
  if (!staff || !staff.active) {
    return NextResponse.json({ error: "NOT_FOUND", message: "Staff not found" }, { status: 404 });
  }

  try {
    const data = await loadStaffDay(prisma, { serviceId: service.id, staffId: staff.id, dayKey });
    const slots = computeSlots(data, { serviceId: service.id, staffId: staff.id, dayKey }, {
      slotIntervalMin,
      now: new Date(),
    }).map((s) => ({ startMinutes: s.startMinutes, staffId: s.staffId }));
    return NextResponse.json({ slots });
  } catch (e) {
    if (e instanceof ServiceNotFoundError || e instanceof StaffNotFoundError || e instanceof StaffNotQualifiedError) {
      return NextResponse.json({ error: "NOT_FOUND", message: "No availability" }, { status: 404 });
    }
    console.error("slots error", e);
    return NextResponse.json({ error: "INTERNAL", message: "Something went wrong" }, { status: 500 });
  }
}