/**
 * Provisional demo seed data for Maryam C Beauté.
 *
 * Service names, identity, example gallery and verified review excerpts are imported from
 * src/lib/content/* so the public site and booking engine share one source of truth. Prices,
 * durations, staff and schedules remain demo placeholders until the owner approves them.
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
import { DEMO_PRODUCTS } from "@/lib/content/products";

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({
    url: env.databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  }),
});

// Minutes-from-midnight helpers (salon local time)
const h = (hour: number, min = 0) => hour * 60 + min;
const MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6, SUN = 0;

async function main() {
  console.info("Seeding Maryam C Beauté demo catalog...");

  // ---------------- Business settings (verified contact details) ----------------
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
      city: "Brossard, QC",
      // Owner-supplied hours are rendered from src/lib/content/business.ts.
      leadTimeMin: 60,
      bookingWindowDays: 60,
      slotIntervalMin: 30,
    },
  });

  // ---------------- Services (provisional catalog; prices/durations are placeholders) ----------------
  const serviceRecords = [];
  for (const s of SERVICES) {
    serviceRecords.push(
      await prisma.service.upsert({
        where: { slug: s.slug },
        update: {},
        create: {
          slug: s.slug,
          name: s.name,
          nameFr: s.nameFr ?? s.name,
          category: s.category,
          price: s.price,
          duration: s.duration,
          description: s.summary,
          descriptionFr: s.summaryFr ?? s.summary,
          order: s.order,
        },
      }),
    );
  }
  const bySlug = Object.fromEntries(serviceRecords.map((s) => [s.slug, s]));

  await prisma.package.upsert({
    where: { slug: "demo-skin-reset" },
    update: {},
    create: {
      slug: "demo-skin-reset",
      active: false,
      name: "Skin Reset (Demo)",
      nameFr: "Réinitialisation peau (démo)",
      description: "Demo package placeholder; replace with owner-approved services and pricing.",
      descriptionFr: "Forfait de démonstration; à remplacer par les services et prix approuvés.",
      price: 0,
      sessions: 1,
      validityDays: 30,
      badge: "Demo",
      order: 1,
      services: { create: [{ serviceId: bySlug["rf-microneedling"]?.id ?? serviceRecords[0].id }] },
    },
  });

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

  // ---------------- Demo working hours (not published; owner confirmation required) ----------------
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

  // ---------------- Gallery (temporary example images) ----------------
  for (const [i, g] of GALLERY.entries()) {
    await prisma.galleryItem.upsert({
      where: { id: `gallery-${g.slug}` },
      update: {},
      create: {
        id: `gallery-${g.slug}`,
        imageUrl: g.image,
        altEn: g.caption,
        altFr: g.captionFr ?? g.caption,
        captionEn: g.title,
        captionFr: g.titleFr ?? g.title,
        category: g.tag,
        order: i + 1,
      },
    });
  }

  // ---------------- Testimonials (short excerpts verified on Google Maps) ----------------
  const reviewSrc = "google-maps";
  for (const [i, t] of TESTIMONIALS.entries()) {
    for (const locale of ["en", "fr"] as const) {
      await prisma.review.upsert({
        where: { id: `review-${i + 1}-${locale}` },
        update: { author: `${t.author}, ${t.location}`, rating: t.rating, text: t.quote, source: reviewSrc },
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

  // ---------------- Store catalog (demo placeholders) ----------------
  // DEMO products for the e-commerce extension. Clearly sample data: names, prices and
  // stock are placeholders to be replaced with the salon's real retail range.
  await prisma.storeSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      shippingFeeCents: 1500,
      freeShippingThresholdCents: 15000,
      enabled: true,
      reservationMinutes: 15,
    },
  });

  for (const p of DEMO_PRODUCTS) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        sku: p.sku,
        name: p.name,
        nameFr: p.nameFr,
        category: p.category,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        description: p.description,
        descriptionFr: p.descriptionFr,
        imageUrl: p.image,
        stock: p.stock,
        featured: p.featured ?? false,
        demo: true,
        images: {
          deleteMany: {},
          create: [{ url: p.image, altEn: p.name, altFr: p.nameFr, order: 0 }],
        },
      },
      create: {
        slug: p.slug,
        sku: p.sku,
        name: p.name,
        nameFr: p.nameFr,
        category: p.category,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        description: p.description,
        descriptionFr: p.descriptionFr,
        imageUrl: p.image,
        stock: p.stock,
        featured: p.featured ?? false,
        demo: true,
        images: {
          create: [{ url: p.image, altEn: p.name, altFr: p.nameFr, order: 0 }],
        },
      },
    });
  }

  console.info(
    `Seeded: ${serviceRecords.length} services, ${staffRecords.length} staff, ${GALLERY.length} gallery items, ${TESTIMONIALS.length} testimonials, ${DEMO_PRODUCTS.length} store products.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
