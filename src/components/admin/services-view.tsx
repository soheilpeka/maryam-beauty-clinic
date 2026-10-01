"use client";
import { ContentManager } from "./content-manager";
export function ServicesView({ locale }: { locale: string }) {
  return <ContentManager kind="services" locale={locale} />;
}
