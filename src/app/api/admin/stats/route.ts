import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-guard";
import { localDayKey, parseDayKey, localToUtc, addDays } from "@/lib/datetime";
import { BookingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/** How many days the "bookings per day" chart covers. */
const CHART_DAYS = 14;
const SOLID: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];

/**
 * GET /api/admin/stats
 *
 * Dashboard numbers: request inbox size, today's and the coming week's confirmed
 * appointments, customer count and revenue; a bookings-per-day series for the chart; the
 * most popular services; and each specialist's load for the next seven days. Everything is
 * computed server-side from the DB so the dashboard never trusts client math.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if (!auth.ok) return auth.response as NextResponse;

  const now = new Date();
  const { year, month, day } = parseDayKey(localDayKey(now));
  const todayStart = localToUtc(year, month, day, 0);
  const weekEnd = addDays(todayStart, 7);
  const chartEnd = addDays(todayStart, CHART_DAYS);

  const [
    pending,
    confirmedToday,
    confirmedThisWeek,
    customerCount,
    revenueAllTime,
    revenueThisWeek,
    solidRows,
    pendingRows,
    popular,
    staffLoadRows,
  ] = await Promise.all([
    prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
    prisma.booking.count({
      where: { status: BookingStatus.CONFIRMED, startUtc: { gte: todayStart, lt: addDays(todayStart, 1) } },
    }),
    prisma.booking.count({ where: { status: BookingStatus.CONFIRMED, startUtc: { gte: todayStart, lt: weekEnd } } }),
    prisma.customer.count(),
    prisma.booking.aggregate({ _sum: { priceTotal: true }, where: { status: { in: SOLID } } }),
    prisma.booking.aggregate({
      _sum: { priceTotal: true },
      where: { status: BookingStatus.CONFIRMED, startUtc: { gte: todayStart, lt: weekEnd } },
    }),
    prisma.booking.findMany({
      where: { status: { in: SOLID }, startUtc: { gte: todayStart, lt: chartEnd } },
      select: { startUtc: true },
    }),
    prisma.booking.findMany({
      where: { status: BookingStatus.PENDING, startUtc: { gte: todayStart, lt: chartEnd } },
      select: { startUtc: true },
    }),
    prisma.booking.groupBy({
      by: ["serviceId"],
      where: { status: { in: SOLID } },
      _count: { serviceId: true },
      _sum: { priceTotal: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 5,
    }),
    prisma.booking.groupBy({
      by: ["staffId"],
      where: { status: BookingStatus.CONFIRMED, startUtc: { gte: todayStart, lt: weekEnd } },
      _count: { staffId: true },
    }),
  ]);

  const days = Array.from({ length: CHART_DAYS }, (_, i) => {
    const start = addDays(todayStart, i);
    const end = addDays(todayStart, i + 1);
    const inDay = (rows: { startUtc: Date }[]) => rows.filter((r) => r.startUtc >= start && r.startUtc < end).length;
    return {
      dayKey: localDayKey(start),
      confirmed: inDay(solidRows),
      pending: inDay(pendingRows),
    };
  });

  const popularServices = await Promise.all(
    popular.map(async (p) => {
      const service = await prisma.service.findUnique({
        where: { id: p.serviceId },
        select: { name: true, duration: true, price: true },
      });
      return {
        serviceId: p.serviceId,
        name: service?.name ?? "Unknown service",
        bookings: p._count.serviceId,
        revenue: p._sum.priceTotal ?? 0,
      };
    }),
  );

  const staff = await prisma.staff.findMany({
    where: { id: { in: staffLoadRows.map((s) => s.staffId) } },
    select: { id: true, name: true },
  });
  const staffLoad = staffLoadRows.map((row) => ({
    staffId: row.staffId,
    name: staff.find((s) => s.id === row.staffId)?.name ?? "Unknown specialist",
    bookings: row._count.staffId,
  }));

  return NextResponse.json({
    ok: true,
    generatedAt: now.toISOString(),
    todayKey: localDayKey(todayStart),
    counts: {
      pending,
      confirmedToday,
      confirmedThisWeek,
      customers: customerCount,
      revenueAllTime: revenueAllTime._sum.priceTotal ?? 0,
      revenueThisWeek: revenueThisWeek._sum.priceTotal ?? 0,
    },
    days,
    popularServices,
    staffLoad,
  });
}