import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { PackageExperience } from "@/components/packages/package-experience";
import { presentPackage } from "@/lib/package-presentation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const french = locale === "fr";
  return {
    title: french ? "Forfaits de soins | Maryam C Beauté" : "Skin treatment packages | Maryam C Beauté",
    description: french ? "Découvrez nos forfaits Discovery, Glow Renewal, Essential, Platinum et Diamond : soins, parcours et options de paiement." : "Explore Discovery, Glow Renewal, Essential, Platinum and Diamond skin programs, treatments, schedules and payment options.",
    robots: { index: true, follow: true },
    alternates: { languages: { en: "/en/pricing-plans/packages", fr: "/fr/pricing-plans/packages" } },
  };
}

export default async function PackagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const records = await prisma.package.findMany({
    where: { active: true, slug: { not: "demo-skin-reset" } },
    include: { services: { include: { service: true } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  if (!records.length) return <div className="editorial-page editorial-container">
    <h1 className="display-heading">{locale === "fr" ? "Forfaits de soins" : "Skin programs"}</h1>
    <p>{locale === "fr" ? "Contactez la clinique pour découvrir les programmes disponibles." : "Contact the clinic to explore available programs."}</p>
  </div>;
  return <PackageExperience packages={records.map(p => presentPackage(p, locale))} locale={locale} />;
}
