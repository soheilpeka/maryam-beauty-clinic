import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PackageExperience } from "@/components/packages/package-experience";
import { SKIN_PROGRAMS } from "@/lib/content/skin-programs";
import { skinProgramDetails } from "@/lib/content/skin-program-details";

export const metadata: Metadata = { title: "Package presentation preview", robots: { index: false, follow: false } };

export default async function PackagePreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PackageExperience packages={SKIN_PROGRAMS.map(p => ({ ...p, description: skinProgramDetails(p.slug, locale)?.story ?? p.description }))} locale={locale} />;
}
