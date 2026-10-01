"use client";
import { ContentManager } from "./content-manager";
export function GalleryAdminView({ locale }: { locale: string }) {
  return <ContentManager kind="gallery" locale={locale} />;
}
