/**
 * Slug helpers. Slugs are the stable keys the public booking links are built from
 * (?service=<slug>&staff=<slug>), and they are derived from the name so the salon never has
 * to invent one. Accents are folded to ASCII so "Soins du visage" -> "soins-du-visage".
 */

/** Turn a free-form name into a URL-safe slug. Never returns an empty string. */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "item";
}

/**
 * Return `base`, or `base-2`, `base-3`... until `exists` reports it is free. Keeps the slug
 * readable while guaranteeing the unique constraint can never be violated on insert.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base);
  let slug = root;
  let n = 1;
  while (await exists(slug)) {
    n += 1;
    slug = `${root}-${n}`;
  }
  return slug;
}