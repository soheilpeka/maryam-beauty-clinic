"use client";
import { ContentManager } from "./content-manager";
export function GalleryAdminView({ locale }: { locale: string }) {
  const fr = locale === "fr";
  return <div className="space-y-12"><section aria-labelledby="admin-comparisons-title"><h2 id="admin-comparisons-title" className="mb-4 font-serif text-3xl">{fr ? "Avant / après" : "Before / after"}</h2><ContentManager kind="comparisons" locale={locale} /></section><section aria-labelledby="admin-salon-gallery-title"><h2 id="admin-salon-gallery-title" className="mb-4 font-serif text-3xl">{fr ? "Photos du salon" : "Salon photographs"}</h2><ContentManager kind="gallery" locale={locale} /></section></div>;
}
