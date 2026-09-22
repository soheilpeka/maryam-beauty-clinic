/**
 * Seed data for Maryam Beauty Clinic.
 *
 * Service catalog, business info, gallery images and testimonials are the REAL data
 * audited from the live site (see CONTENT_AUDIT.md) and are imported from
 * src/lib/content/* so the public site and the booking engine share one source of truth.
 *
 * Staff records exist so the booking engine can compute slots; the live site does not
 * publish a staff page, so the public site does not present invented staff profiles.
 *
 * The admin account is NOT created here: authentication never uses a demo admin. The real
 * initial admin is created by prisma/bootstrap-admin.ts from ADMIN_INITIAL_EMAIL /
 * ADMIN_INITIAL_PASSWORD (.env), and its password is never stored in plaintext.
 */
import "@/lib/env-preload";
import { env } from "@/lib/env";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { SERVICES } from "@/lib/content/services";
import { BUSINESS } from "@/lib/content/business";
import { GALLERY } from "@/lib/content/gallery";
import { TESTIMONIALS } from "@/lib/content/testimonials";

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: env.databaseUrl }),
});

// Minutes-from-midnight helpers (salon local time)
const h = (hour: number, min = 0) => hour * 60 + min;
const MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6, SUN = 0;

async function main() {
  console.info("Seeding Maryam Beauty Clinic catalog (real data)...");

  // ---------------- Business settings (real contact details) ----------------
  await prisma.businessSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: BUSINESS.name,
      timezone: BUSINESS.timezone,
      currency: BUSINESS.currency,
      phone: BUSINESS.phone,
      email: BUSINESS.email,
      address: BUSINESS.address,
      city: "Thornhill, ON",
      // Salon local hours: Mon-Fri 10-5, Sat 11-4, Sun closed.
      leadTimeMin: 60,
      bookingWindowDays: 60,
      slotIntervalMin: 30,
    },
  });

  // ---------------- Services (24, real catalog) ----------------
  const serviceRecords = [];
  for (const s of SERVICES) {
    serviceRecords.push(
      await prisma.service.upsert({
        where: { slug: s.slug },
        update: {
          name: s.name,
          category: s.category,
          price: s.price,
          duration: s.duration,
          description: s.summary,
          order: s.order,
        },
        create: {
          slug: s.slug,
          name: s.name,
          category: s.category,
          price: s.price,
          duration: s.duration,
          description: s.summary,
          order: s.order,
        },
      }),
    );
  }
  const bySlug = Object.fromEntries(serviceRecords.map((s) => [s.slug, s]));

  // ---------------- Staff (support the booking engine) ----------------
  const staffDefs = [
    { slug: "specialist-1", name: "Specialist 1", role: "Aesthetician", bio: null },
    { slug: "specialist-2", name: "Specialist 2", role: "Aesthetician", bio: null },
    { slug: "specialist-3", name: "Specialist 3", role: "Aesthetician", bio: null },
  ];
  const staffRecords = [];
  for (const s of staffDefs) {
    staffRecords.push(
      await prisma.staff.upsert({
        where: { slug: s.slug },
        update: {},
        create: s,
      }),
    );
  }
  const staffBySlug = Object.fromEntries(staffRecords.map((s) => [s.slug, s]));

  // Every specialist can perform every service ("any specialist" flow).
  for (const staff of staffRecords) {
    for (const service of serviceRecords) {
      await prisma.staffService.upsert({
        where: { staffId_serviceId: { staffId: staff.id, serviceId: service.id } },
        update: {},
        create: { staffId: staff.id, serviceId: service.id },
      });
    }
  }

  // ---------------- Working hours: real salon hours (Mon-Fri 10-5, Sat 11-4) ----------------
  const weekday = { start: h(10), end: h(17), breaks: [[h(12, 30), h(13)]] as Array<[number, number]> };
  const saturday = { start: h(11), end: h(16), breaks: [[h(12, 30), h(13)]] as Array<[number, number]> };
  const scheduleDefs: Array<{ staff: string; day: number }> = [];
  // Specialist 1: Mon-Fri
  for (const d of [MON, TUE, WED, THU, FRI]) scheduleDefs.push({ staff: "specialist-1", day: d });
  // Specialist 2: Tue-Sat
  for (const d of [TUE, WED, THU, FRI, SAT]) scheduleDefs.push({ staff: "specialist-2", day: d });
  // Specialist 3: Wed-Sat
  for (const d of [WED, THU, FRI, SAT]) scheduleDefs.push({ staff: "specialist-3", day: d });

  for (const sd of scheduleDefs) {
    const tpl = sd.day === SAT ? saturday : weekday;
    const created = await prisma.staffSchedule.upsert({
      where: {
        staffId_dayOfWeek_startTime: {
          staffId: staffBySlug[sd.staff].id,
          dayOfWeek: sd.day,
          startTime: tpl.start,
        },
      },
      update: {},
      create: {
        staffId: staffBySlug[sd.staff].id,
        dayOfWeek: sd.day,
        startTime: tpl.start,
        endTime: tpl.end,
      },
    });
    for (const [bs, be] of tpl.breaks) {
      await prisma.break.upsert({
        where: { id: `brk-${created.id}-${bs}` },
        update: {},
        create: { id: `brk-${created.id}-${bs}`, scheduleId: created.id, startTime: bs, endTime: be },
      });
    }
  }

  // ---------------- Gallery (real clinic images) ----------------
  for (const [i, g] of GALLERY.entries()) {
    await prisma.galleryItem.upsert({
      where: { id: `gallery-${g.slug}` },
      update: {},
      create: {
        id: `gallery-${g.slug}`,
        title: g.title,
        imageUrl: g.image,
        altText: g.caption,
        order: i + 1,
      },
    });
  }

  // ---------------- Testimonials (real reviews published by the business) ----------------
  const reviewSrc = "site";
  for (const [i, t] of TESTIMONIALS.entries()) {
    for (const locale of ["en", "fr"] as const) {
      await prisma.review.upsert({
        where: { id: `review-${i + 1}-${locale}` },
        update: {},
        create: {
          id: `review-${i + 1}-${locale}`,
          author: `${t.author}, ${t.location}`,
          rating: 5,
          text: t.quote,
          locale,
          source: reviewSrc,
          order: i + 1,
        },
      });
    }
  }

  console.info(
    `Seeded: ${serviceRecords.length} services, ${staffRecords.length} staff, ${GALLERY.length} gallery items, ${TESTIMONIALS.length} testimonials.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });