import "server-only";
import { prisma } from "@/lib/prisma";

export type StoreCategoryView = {
  id: string;
  name: string;
  nameFr: string | null;
  order: number;
};

/**
 * Keep pre-feature product categories visible until an administrator renames or manages
 * them. These legacy rows are virtual; reading the public catalog never writes to the DB.
 */
export async function listStoreCategories(includeHiddenProducts = false): Promise<StoreCategoryView[]> {
  const productWhere = includeHiddenProducts ? undefined : { active: true, demo: false };
  const [managed, products] = await Promise.all([
    prisma.storeCategory.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    prisma.product.findMany({ where: productWhere, select: { category: true }, distinct: ["category"] }),
  ]);

  const known = new Set(managed.map((category) => category.name.toLocaleLowerCase("en")));
  const nextLegacyOrder = managed.length ? Math.max(...managed.map((category) => category.order)) + 1 : 0;
  const legacy = products
    .map((product) => product.category.trim())
    .filter((name) => name && !known.has(name.toLocaleLowerCase("en")))
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((name, index) => ({
      id: legacyStoreCategoryId(name),
      name,
      nameFr: null,
      order: nextLegacyOrder + index,
    }));

  return [...managed, ...legacy].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "en"));
}

export function legacyStoreCategoryId(name: string): string {
  return `legacy-${Buffer.from(name, "utf8").toString("base64url")}`;
}

export function categoryNameFromLegacyId(id: string): string | null {
  if (!id.startsWith("legacy-")) return null;
  try {
    const name = Buffer.from(id.slice("legacy-".length), "base64url").toString("utf8").trim();
    return name || null;
  } catch {
    return null;
  }
}
