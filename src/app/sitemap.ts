import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SERVICES } from "@/lib/content/services";
import { BLOG_POSTS, BLOG_CATEGORIES } from "@/lib/content/blog";

/**
 * Sitemap covering every public route: home, booking, the full service catalog, each
 * service detail page, packages, gallery, blog index, every post and every category, plus
 * gift card and contact. Preserves the route structure of the live site so indexed URLs
 * keep their equivalents.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const now = new Date();
  const langs = (path: string) =>
    Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}${path}`]));

  const categorySlug = (c: string) =>
    encodeURIComponent(c.toLowerCase().replace(/ & /g, "-and-").replace(/ /g, "-"));

  const staticRoutes: Array<{ path: string; priority: number; change: "weekly" | "monthly" | "yearly" }> = [
    { path: "", priority: 1.0, change: "weekly" },
    { path: "/book-online", priority: 0.9, change: "monthly" },
    { path: "/booking", priority: 0.9, change: "monthly" },
    { path: "/pricing-plans/packages", priority: 0.8, change: "monthly" },
    { path: "/gallery", priority: 0.7, change: "monthly" },
    { path: "/blog", priority: 0.7, change: "weekly" },
    { path: "/gift-card", priority: 0.6, change: "yearly" },
    { path: "/contact", priority: 0.7, change: "yearly" },
  ];

  const entries: MetadataRoute.Sitemap = [];

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
    for (const s of SERVICES) {
      entries.push({
        url: `${base}/${locale}/service-page/${s.slug}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.8,
        alternates: { languages: langs(`/service-page/${s.slug}`) },
      });
    }
    for (const p of BLOG_POSTS) {
      entries.push({
        url: `${base}/${locale}/post/${p.slug}`,
        lastModified: now,
        changeFrequency: "yearly" as const,
        priority: 0.5,
        alternates: { languages: langs(`/post/${p.slug}`) },
      });
    }
    for (const c of BLOG_CATEGORIES) {
      entries.push({
        url: `${base}/${locale}/blog/categories/${categorySlug(c)}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.4,
        alternates: { languages: langs(`/blog/categories/${categorySlug(c)}`) },
      });
    }
  }

  return entries;
}