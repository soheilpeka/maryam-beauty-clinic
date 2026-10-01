"use client";

import { useState, useMemo } from "react";
import { useLocale } from "next-intl";
import { GALLERY, GALLERY_TAGS } from "@/lib/content/gallery";

export interface GalleryFilterItem { slug: string; image: string; caption: string; tag: string; title: string; alt?: string; span?: boolean }

/**
 * Filterable results gallery. The filter tabs mirror the reference design's pattern while
 * keeping every gallery item reachable.
 */
export function GalleryFilter({ items = GALLERY as GalleryFilterItem[] }: { items?: GalleryFilterItem[] }) {
  const [tag, setTag] = useState<string>("All");
  const fr = useLocale() === "fr";
  const tags = ["All", ...new Set(items.map(item => item.tag))];
  const label = (value: string) => fr ? ({ All: "Tous", Hair: "Coiffure", Treatment: "Soins" } as Record<string, string>)[value] ?? value : value;

  const visible = useMemo(
    () => (tag === "All" ? items : items.filter((g) => g.tag === tag)),
    [items, tag],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-colors sm:text-sm ${
              tag === t
                ? "bg-primary text-primary-foreground"
                : "border border-border text-foreground hover:border-brand hover:text-brand"
            }`}
            aria-pressed={tag === t}
          >
            {label(t)}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((g) => (
          <figure
            key={g.slug}
            className={`group relative overflow-hidden rounded-2xl bg-muted ${
              g.span ? "lg:col-span-2" : ""
            }`}
          >
            <div className={g.span ? "aspect-[16/10]" : "aspect-square"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.image}
                alt={g.alt ?? g.caption}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5">
              <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
                {label(g.tag)}
              </span>
              <p className="mt-1 font-serif text-base text-white">{g.title}</p>
              <p className="mt-1 text-xs text-white/70">{g.caption}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      {!visible.length && <p role="status" className="mt-8 text-muted-foreground">{fr ? "Aucune image dans cette catégorie pour le moment." : "No images in this category yet."}</p>}
    </div>
  );
}
