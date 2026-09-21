import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import { ServiceList } from "@/components/sections/service-list";
import { StaffList } from "@/components/sections/staff-list";
import { GalleryGrid } from "@/components/sections/gallery-grid";
import { ReviewList } from "@/components/sections/review-list";
import { FaqList } from "@/components/sections/faq-list";
import { ContactSection } from "@/components/sections/contact-section";
import { HeroSection } from "@/components/sections/hero-section";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Sections" });

  const [services, staff, gallery, reviews, faqs, setting] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.staff.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.galleryItem.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.review.findMany({ where: { active: true, locale }, orderBy: { order: "asc" } }),
    prisma.faqItem.findMany({ where: { active: true, locale }, orderBy: { order: "asc" } }),
    prisma.businessSetting.findUnique({ where: { id: "default" } }),
  ]);

  return (
    <div className="flex flex-col">
      <HeroSection locale={locale} />

      <section id="services" className="scroll-mt-20 bg-[#faf8f6] py-20 dark:bg-[#17130f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl dark:text-stone-50">
              {t("servicesTitle")}
            </h2>
            <p className="mt-4 text-stone-600 dark:text-stone-400">{t("servicesSubtitle")}</p>
          </div>
          <ServiceList services={services} locale={locale} />
          <div className="mt-10 text-center">
            <Link
              href="/booking"
              className="inline-block rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 hover:bg-brand-700"
            >
              {locale === "fr" ? "Reserver maintenant" : "Book now"}
            </Link>
          </div>
        </div>
      </section>

      <section id="team" className="scroll-mt-20 bg-white py-20 dark:bg-[#1c1713]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl dark:text-stone-50">
              {t("staffTitle")}
            </h2>
            <p className="mt-4 text-stone-600 dark:text-stone-400">{t("staffSubtitle")}</p>
          </div>
          <StaffList staff={staff} locale={locale} />
        </div>
      </section>

      <section id="gallery" className="scroll-mt-20 bg-[#faf8f6] py-20 dark:bg-[#17130f]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl dark:text-stone-50">
              {t("galleryTitle")}
            </h2>
            <p className="mt-4 text-stone-600 dark:text-stone-400">{t("gallerySubtitle")}</p>
          </div>
          <GalleryGrid items={gallery} />
        </div>
      </section>

      <section id="reviews" className="scroll-mt-20 bg-white py-20 dark:bg-[#1c1713]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl dark:text-stone-50">
              {t("reviewsTitle")}
            </h2>
            <p className="mt-4 text-stone-600 dark:text-stone-400">{t("reviewsSubtitle")}</p>
          </div>
          <ReviewList reviews={reviews} />
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 bg-[#faf8f6] py-20 dark:bg-[#17130f]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl dark:text-stone-50">
              {t("faqTitle")}
            </h2>
          </div>
          <FaqList items={faqs} />
        </div>
      </section>

      <section id="contact" className="scroll-mt-20 bg-white py-20 dark:bg-[#1c1713]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl dark:text-stone-50">
              {t("contactTitle")}
            </h2>
            <p className="mt-4 text-stone-600 dark:text-stone-400">{t("contactSubtitle")}</p>
          </div>
          <ContactSection setting={setting} locale={locale} />
        </div>
      </section>
    </div>
  );
}