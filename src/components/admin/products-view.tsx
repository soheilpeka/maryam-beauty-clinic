"use client";
import { ContentManager } from "./content-manager";
export function ProductsView({ locale }: { locale: string }) {
  return <ContentManager kind="products" locale={locale} />;
}
