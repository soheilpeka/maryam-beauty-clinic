import type { GalleryItem } from "@prisma/client";

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.id} className="group relative overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={item.altText}
            loading="lazy"
            className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <p className="text-xs font-medium text-white">{item.title}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}