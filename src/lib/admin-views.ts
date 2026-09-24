/**
 * Response shapers for the admin CRUD API. One place that defines what each admin payload
 * looks like, so GET/POST/PATCH return the same shape and the client can update a single
 * row in place after a mutation instead of reloading the whole list.
 */
import type {
  Service,
  Staff,
  StaffSchedule,
  DayOff,
  Prisma,
} from "@prisma/client";
import { localDayKey } from "@/lib/datetime";

export interface ServiceView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  bufferMin: number;
  category: string;
  active: boolean;
  order: number;
  bookingCount: number;
}

type ServiceWithCount = Service & { _count?: { bookings: number } };

export function shapeService(s: ServiceWithCount): ServiceView {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    description: s.description,
    price: s.price,
    duration: s.duration,
    bufferMin: s.bufferMin,
    category: s.category,
    active: s.active,
    order: s.order,
    bookingCount: s._count?.bookings ?? 0,
  };
}

export interface ScheduleWindowView {
  id: string;
  dayOfWeek: number;
  startTime: number;
  endTime: number;
  breaks: { id: string; startTime: number; endTime: number }[];
}

export interface StaffView {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string | null;
  avatarUrl: string | null;
  active: boolean;
  serviceIds: string[];
  schedule: ScheduleWindowView[];
  daysOff: DayOffView[];
  bookingCount: number;
}

type StaffWithRelations = Staff & {
  services: { serviceId: string }[];
  schedules: (StaffSchedule & { breaks: { id: string; startTime: number; endTime: number }[] })[];
  daysOff: DayOff[];
  _count?: { bookings: number };
};

export function shapeStaff(s: StaffWithRelations): StaffView {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    role: s.role,
    bio: s.bio,
    avatarUrl: s.avatarUrl,
    active: s.active,
    serviceIds: s.services.map((x) => x.serviceId),
    schedule: [...s.schedules]
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime - b.startTime)
      .map((w) => ({
        id: w.id,
        dayOfWeek: w.dayOfWeek,
        startTime: w.startTime,
        endTime: w.endTime,
        breaks: [...w.breaks].sort((a, b) => a.startTime - b.startTime),
      })),
    daysOff: [...s.daysOff]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(shapeDayOff),
    bookingCount: s._count?.bookings ?? 0,
  };
}

export interface DayOffView {
  id: string;
  staffId: string | null;
  staffName: string | null;
  dayKey: string;
  startMin: number | null;
  endMin: number | null;
  note: string | null;
}

export function shapeDayOff(d: DayOff & { staff?: { name: string } | null }): DayOffView {
  return {
    id: d.id,
    staffId: d.staffId,
    staffName: d.staff?.name ?? null,
    dayKey: localDayKey(d.date),
    startMin: d.startMin,
    endMin: d.endMin,
    note: d.note,
  };
}

/** Prisma include object for the staff list (kept here so list and detail agree). */
export const STAFF_INCLUDE = {
  services: { select: { serviceId: true } },
  schedules: { include: { breaks: true } },
  daysOff: true,
} satisfies Prisma.StaffInclude;

export const SERVICE_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  price: true,
  duration: true,
  bufferMin: true,
  category: true,
  active: true,
  order: true,
} satisfies Prisma.ServiceSelect;