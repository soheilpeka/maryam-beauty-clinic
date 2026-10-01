"use client";
import { ContentManager } from "./content-manager";
export function PackagesView({ locale }: { locale: string }) {
  return <ContentManager kind="packages" locale={locale} />;
}
