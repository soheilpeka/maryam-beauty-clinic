import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const now = new Date();

  return routing.locales.flatMap((locale) => [
    {
      url: `${base}/${locale}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 1.0,
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}`])) },
    },
    {
      url: `${base}/${locale}/booking`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}/${l}/booking`])) },
    },
  ]);
}