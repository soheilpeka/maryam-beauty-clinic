"use client";
import { useState } from "react";
import { ContentManager } from "./content-manager";
import { StoreCategoriesManager } from "./store-categories-manager";

type StoreCategory = { id: string; name: string; nameFr: string | null; order: number };

export function ProductsView({ locale }: { locale: string }) {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  return <div className="space-y-8">
    <StoreCategoriesManager locale={locale} onChange={setCategories} />
    <ContentManager kind="products" locale={locale} storeCategories={categories} />
  </div>;
}
