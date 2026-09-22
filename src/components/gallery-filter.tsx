"use client";

import { useState, useMemo } from "react";
import { GALLERY, GALLERY_TAGS } from "@/lib/content/gallery";

/**
 * Filterable results gallery. The filter tabs mirror the reference design's pattern while
 * keeping every gallery item reachable.
 */
export function GalleryFilter() {
  const [tag, setTag] = useState<(typeof GALLERY_TAGS)[number]>("All");

  const visible = useMemo(
    () => (tag === "All" ? GALLERY : GALLERY.filter((g) => g.tag === tag)),
    [tag],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {GALLERY_TAGS.map((t) => (
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
            {t}
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
                alt={g.caption}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5">
              <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
                {g.tag}
              </span>
              <p className="mt-1 font-serif text-base text-white">{g.title}</p>
              <p className="mt-1 text-xs text-white/70">{g.caption}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}