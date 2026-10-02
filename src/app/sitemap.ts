import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SERVICES } from "@/lib/content/services";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

/**
 * Sitemap covering every public route: home, booking, the full service catalog, each
 * service detail page, packages, gallery, blog index, every post and every category, plus
 * gift card and contact. Preserves the route structure of the live site so indexed URLs
 * keep their equivalents.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://maryamcbeaute.ca";
  const now = new Date();
  const langs = (path: string) =>
    Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`]));

  const staticRoutes: Array<{ path: string; priority: number; change: "weekly" | "monthly" | "yearly" }> = [
    { path: "", priority: 1.0, change: "weekly" },
    { path: "/book-online", priority: 0.9, change: "monthly" },
    { path: "/booking", priority: 0.9, change: "monthly" },
    { path: "/gallery", priority: 0.7, change: "monthly" },
    { path: "/contact", priority: 0.7, change: "yearly" },
    { path: "/about", priority: 0.8, change: "monthly" },
    { path: "/store", priority: 0.8, change: "weekly" },
    { path: "/pricing-plans/packages", priority: 0.8, change: "monthly" },
  ];

  const entries: MetadataRoute.Sitemap = [];
  const products = await prisma.product.findMany({
    where: { active: true, demo: false },
    select: { slug: true, updatedAt: true, imageUrl: true },
    orderBy: { order: "asc" },
  });
  const services = await prisma.service.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } });

  for (const locale of routing.locales) {
    for (const r of staticRoutes) {
      entries.push({
        url: `${base}/${locale}${r.path}`,
        lastModified: now,
        changeFrequency: r.change,
        priority: r.priority,
        alternates: { languages: langs(r.path) },
      });
    }
    for (const s of services) {
      entries.push({
        url: `${base}/${locale}/service-page/${s.slug}`,
        lastModified: s.updatedAt ?? now,
        changeFrequency: "monthly" as const,
        priority: 0.8,
        alternates: { languages: langs(`/service-page/${s.slug}`) },
      });
    }
    for (const product of products) {
      entries.push({
        url: `${base}/${locale}/store/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: { languages: langs(`/store/${product.slug}`) },
        images: product.imageUrl ? [product.imageUrl] : undefined,
      });
    }
  }

  return entries;
}
