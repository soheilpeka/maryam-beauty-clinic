/**
 * DEMO SEED DATA - ALL CONTENT IS PLACEHOLDER.
 *
 * Prices, staff, gallery, FAQ and testimonials below are DEMO placeholders created for this
 * sample project. They are NOT real customer reviews and NOT real credentials. Replace them
 * with the salon's real data before going live.
 *
 * The admin account is seeded from ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD (.env) and stored
 * only as a bcrypt hash.
 */
import "@/lib/env-preload";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: env.databaseUrl }),
});

// Minutes-from-midnight helpers (salon local time)
const h = (hour: number, min = 0) => hour * 60 + min;
const MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6, SUN = 0;

async function main() {
  console.info("Seeding DEMO placeholder data...");

  await prisma.businessSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Maryam Beauty Clinic",
      timezone: "America/Toronto",
      currency: "CAD",
      phone: "+1 (514) 555-0142",
      email: "hello@maryambeautyclinic.example",
      address: "1234 Rue Sainte-Catherine Ouest",
      city: "Montreal, QC H3G 1P1",
      mapEmbedUrl: "https://www.openstreetmap.org/export/embed.html?bbox=-73.58%2C45.49%2C-73.56%2C45.50&layer=mapnik",
      leadTimeMin: 60,
      bookingWindowDays: 60,
      slotIntervalMin: 30,
    },
  });

  // ---------------- Services (8) ----------------
  const services = [
    { slug: "signature-facial", name: "Signature Glow Facial", category: "Facials", price: 12000, duration: 60, bufferMin: 10, order: 1, description: "A customized deep-cleanse facial with exfoliation, mask and massage for radiant skin." },
    { slug: "hydra-facial", name: "Hydrating Facial", category: "Facials", price: 9500, duration: 45, bufferMin: 10, order: 2, description: "Intensive moisture treatment for dry or dehydrated skin." },
    { slug: "brow-lamination", name: "Brow Lamination & Shaping", category: "Brows & Lashes", price: 7500, duration: 45, bufferMin: 5, order: 3, description: "Smooth, fuller-looking brows with a tailored shape." },
    { slug: "lash-extensions", name: "Classic Lash Extensions", category: "Brows & Lashes", price: 11000, duration: 90, bufferMin: 15, order: 4, description: "Natural-looking one-to-one lash application." },
    { slug: "lash-lift", name: "Lash Lift & Tint", category: "Brows & Lashes", price: 7000, duration: 45, bufferMin: 5, order: 5, description: "Curled, defined lashes that last for weeks." },
    { slug: "deep-tissue-massage", name: "Deep Tissue Massage", category: "Massage", price: 13000, duration: 75, bufferMin: 15, order: 6, description: "Therapeutic massage targeting tension and tight muscles." },
    { slug: "relaxation-massage", name: "Relaxation Massage", category: "Massage", price: 10000, duration: 60, bufferMin: 10, order: 7, description: "A calming full-body Swedish-style massage." },
    { slug: "medical-peel", name: "Chemical Peel", category: "Treatments", price: 14000, duration: 60, bufferMin: 15, order: 8, description: "Professional exfoliating peel to refresh skin texture and tone." },
  ];
  const serviceRecords = [];
  for (const s of services) {
    serviceRecords.push(await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: s,
    }));
  }
  const bySlug = Object.fromEntries(serviceRecords.map((s) => [s.slug, s]));

  // ---------------- Staff (4) ----------------
  const staffDefs = [
    { slug: "maryam-k", name: "Maryam K.", role: "Founder & Master Aesthetician", bio: "Over a decade of experience in advanced skincare and brow artistry." },
    { slug: "amelie-r", name: "Amelie R.", role: "Lash Specialist", bio: "Precision lash artist specializing in natural, long-lasting sets." },
    { slug: "sofia-d", name: "Sofia D.", role: "Massage Therapist", bio: "Licensed therapist focused on deep-tissue and relaxation techniques." },
    { slug: "nadia-b", name: "Nadia B.", role: "Skin Therapist", bio: "Certified in chemical peels and results-driven facial treatments." },
  ];
  const staffRecords = [];
  for (const s of staffDefs) {
    staffRecords.push(await prisma.staff.upsert({
      where: { slug: s.slug },
      update: {},
      create: s,
    }));
  }
  const staffBySlug = Object.fromEntries(staffRecords.map((s) => [s.slug, s]));

  // ---------------- Staff <-> services ----------------
  const qualifications: Record<string, string[]> = {
    "maryam-k": ["signature-facial", "hydra-facial", "brow-lamination", "medical-peel"],
    "amelie-r": ["lash-extensions", "lash-lift", "brow-lamination"],
    "sofia-d": ["deep-tissue-massage", "relaxation-massage"],
    "nadia-b": ["signature-facial", "hydra-facial", "medical-peel", "relaxation-massage"],
  };
  for (const [staffSlug, slugs] of Object.entries(qualifications)) {
    for (const slug of slugs) {
      await prisma.staffService.upsert({
        where: { staffId_serviceId: { staffId: staffBySlug[staffSlug].id, serviceId: bySlug[slug].id } },
        update: {},
        create: { staffId: staffBySlug[staffSlug].id, serviceId: bySlug[slug].id },
      });
    }
  }

  // ---------------- Working hours (Tue-Sat, with a lunch break) ----------------
  const scheduleDefs: Array<{ staff: string; day: number; start: number; end: number; breaks?: Array<[number, number]> }> = [
    { staff: "maryam-k", day: TUE, start: h(9), end: h(17), breaks: [[h(12), h(12, 30)]] },
    { staff: "maryam-k", day: WED, start: h(9), end: h(17), breaks: [[h(12), h(12, 30)]] },
    { staff: "maryam-k", day: THU, start: h(9), end: h(17), breaks: [[h(12), h(12, 30)]] },
    { staff: "maryam-k", day: FRI, start: h(9), end: h(17), breaks: [[h(12), h(12, 30)]] },
    { staff: "maryam-k", day: SAT, start: h(9), end: h(16), breaks: [[h(12), h(12, 30)]] },
    { staff: "amelie-r", day: TUE, start: h(10), end: h(18), breaks: [[h(13), h(13, 30)]] },
    { staff: "amelie-r", day: WED, start: h(10), end: h(18), breaks: [[h(13), h(13, 30)]] },
    { staff: "amelie-r", day: FRI, start: h(10), end: h(18), breaks: [[h(13), h(13, 30)]] },
    { staff: "amelie-r", day: SAT, start: h(9), end: h(17), breaks: [[h(13), h(13, 30)]] },
    { staff: "sofia-d", day: MON, start: h(9), end: h(17), breaks: [[h(12), h(12, 30)]] },
    { staff: "sofia-d", day: TUE, start: h(9), end: h(17), breaks: [[h(12), h(12, 30)]] },
    { staff: "sofia-d", day: THU, start: h(9), end: h(17), breaks: [[h(12), h(12, 30)]] },
    { staff: "sofia-d", day: FRI, start: h(9), end: h(17), breaks: [[h(12), h(12, 30)]] },
    { staff: "nadia-b", day: WED, start: h(11), end: h(19), breaks: [[h(14), h(14, 30)]] },
    { staff: "nadia-b", day: THU, start: h(11), end: h(19), breaks: [[h(14), h(14, 30)]] },
    { staff: "nadia-b", day: FRI, start: h(11), end: h(19), breaks: [[h(14), h(14, 30)]] },
    { staff: "nadia-b", day: SAT, start: h(10), end: h(18), breaks: [[h(14), h(14, 30)]] },
    { staff: "nadia-b", day: SUN, start: h(11), end: h(16), breaks: [[h(13), h(13, 30)]] },
  ];
  for (const sd of scheduleDefs) {
    const created = await prisma.staffSchedule.upsert({
      where: { staffId_dayOfWeek_startTime: { staffId: staffBySlug[sd.staff].id, dayOfWeek: sd.day, startTime: sd.start } },
      update: {},
      create: { staffId: staffBySlug[sd.staff].id, dayOfWeek: sd.day, startTime: sd.start, endTime: sd.end },
    });
    for (const [bs, be] of sd.breaks ?? []) {
      await prisma.break.upsert({
        where: { id: `brk-${created.id}-${bs}` },
        update: {},
        create: { id: `brk-${created.id}-${bs}`, scheduleId: created.id, startTime: bs, endTime: be },
      });
    }
  }

  // ---------------- Demo days off ----------------
  const today = new Date();
  const inDays = (n: number) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() + n); return d; };
  await prisma.dayOff.upsert({
    where: { id: "dayoff-demo-1" },
    update: {},
    create: { id: "dayoff-demo-1", staffId: staffBySlug["amelie-r"].id, date: inDays(4), note: "DEMO placeholder day off" },
  });

  // ---------------- Gallery (DEMO placeholders) ----------------
  const gallery = [
    { title: "Facial treatment room", imageUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80", altText: "Demo photo of a spa treatment room interior", order: 1 },
    { title: "Brow studio", imageUrl: "https://images.unsplash.com/photo-1522335789203-aaa2f6f8b36b?w=800&q=80", altText: "Demo photo of a bright beauty studio", order: 2 },
    { title: "Skincare products", imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80", altText: "Demo photo of skincare products on a shelf", order: 3 },
    { title: "Massage room", imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db847?w=800&q=80", altText: "Demo photo of a calm massage room", order: 4 },
    { title: "Lash station", imageUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80", altText: "Demo photo of a lash and beauty station", order: 5 },
    { title: "Reception area", imageUrl: "https://images.unsplash.com/photo-1633675255053-1cc9ca99b9a0?w=800&q=80", altText: "Demo photo of a salon reception desk", order: 6 },
  ];
  for (const g of gallery) {
    await prisma.galleryItem.upsert({
      where: { id: `gallery-demo-${g.order}` },
      update: {},
      create: { id: `gallery-demo-${g.order}`, ...g },
    });
  }

  // ---------------- FAQ (DEMO editorial content, both locales) ----------------
  const faqs = [
    { en: { q: "How do I book an appointment?", a: "Choose a service, pick a specialist or \"any\", select a date and time, then enter your contact details. You will receive a confirmation email with a link to manage your booking." },
      fr: { q: "Comment prendre rendez-vous ?", a: "Choisissez un service, selectionnez un specialiste ou \"tous\", choisissez une date et une heure, puis saisissez vos coordonnees. Vous recevrez un courriel de confirmation avec un lien pour gerer votre rendez-vous." } },
    { en: { q: "What is your cancellation policy?", a: "You can cancel or reschedule free of charge up to 24 hours before your appointment using the link in your confirmation email." },
      fr: { q: "Quelle est votre politique d'annulation ?", a: "Vous pouvez annuler ou replanifier gratuitement jusqu'a 24 heures avant votre rendez-vous via le lien dans votre courriel de confirmation." } },
    { en: { q: "Do you accept walk-ins?", a: "We work mostly by appointment to guarantee each guest enough time. Contact us directly for same-day availability." },
      fr: { q: "Acceptez-vous les clients sans rendez-vous ?", a: "Nous travaillons surtout sur rendez-vous pour garantir assez de temps a chaque cliente. Contactez-nous directement pour la disponibilite du jour." } },
    { en: { q: "Which payment methods do you accept?", a: "We accept all major credit cards, debit cards and cash. Prices are shown in Canadian dollars before taxes." },
      fr: { q: "Quels modes de paiement acceptez-vous ?", a: "Nous acceptons toutes les principales cartes de credit, les cartes de debit et le comptant. Les prix sont indiques en dollars canadiens avant taxes." } },
    { en: { q: "Do you offer gift cards?", a: "Yes, gift cards are available in the clinic. Please contact us for amounts and details." },
      fr: { q: "Offrez-vous des cartes-cadeaux ?", a: "Oui, des cartes-cadeaux sont disponibles a la clinique. Contactez-nous pour les montants et les details." } },
  ];
  let faqOrder = 1;
  for (const f of faqs) {
    for (const locale of ["en", "fr"] as const) {
      await prisma.faqItem.upsert({
        where: { id: `faq-demo-${faqOrder}-${locale}` },
        update: {},
        create: {
          id: `faq-demo-${faqOrder}-${locale}`,
          question: locale === "en" ? f.en.q : f.fr.q,
          answer: locale === "en" ? f.en.a : f.fr.a,
          locale,
          order: faqOrder,
        },
      });
    }
    faqOrder += 1;
  }

  // ---------------- Testimonials (DEMO placeholders, not real reviews) ----------------
  const testimonials = [
    { en: { author: "Demo Guest A", rating: 5, text: "DEMO placeholder review. The signature facial left my skin glowing all week." },
      fr: { author: "Cliente demo A", rating: 5, text: "AVIS DEMO. Le soin signature a laisse ma peau eclatante toute la semaine." } },
    { en: { author: "Demo Guest B", rating: 5, text: "DEMO placeholder review. Calm space, attentive specialist, and beautiful results." },
      fr: { author: "Cliente demo B", rating: 5, text: "AVIS DEMO. Endroit calme, specialiste attentif et beaux resultats." } },
    { en: { author: "Demo Guest C", rating: 4, text: "DEMO placeholder review. Easy online booking and a relaxing massage." },
      fr: { author: "Cliente demo C", rating: 4, text: "AVIS DEMO. Reservation en ligne facile et massage relaxant." } },
  ];
  let revOrder = 1;
  for (const t of testimonials) {
    for (const locale of ["en", "fr"] as const) {
      await prisma.review.upsert({
        where: { id: `review-demo-${revOrder}-${locale}` },
        update: {},
        create: {
          id: `review-demo-${revOrder}-${locale}`,
          author: locale === "en" ? t.en.author : t.fr.author,
          rating: locale === "en" ? t.en.rating : t.fr.rating,
          text: locale === "en" ? t.en.text : t.fr.text,
          locale,
          source: "demo",
          order: revOrder,
        },
      });
    }
    revOrder += 1;
  }

  // ---------------- Admin user (hashed; credentials come from .env) ----------------
  const passwordHash = await bcrypt.hash(env.adminSeedPassword, 12);
  await prisma.adminUser.upsert({
    where: { email: env.adminSeedEmail },
    update: {},
    create: {
      email: env.adminSeedEmail,
      passwordHash,
      name: "Demo Admin",
      role: "admin",
    },
  });

  console.info(`Seeded: ${serviceRecords.length} services, ${staffRecords.length} staff, ${gallery.length} gallery items, ${faqs.length} FAQ pairs, ${testimonials.length} demo testimonials.`);
  console.info(`Demo admin: ${env.adminSeedEmail} (hash stored, plaintext only in .env)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });