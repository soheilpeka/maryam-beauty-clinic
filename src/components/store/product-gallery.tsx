"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

export interface GalleryImage {
  url: string;
  alt: string;
}

export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const t = useTranslations("Store");
  const [selected, setSelected] = useState(0);
  const image = images[selected] ?? images[0];

  if (!image) return null;

  return (
    <div aria-label={t("galleryLabel")}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-border bg-card">
        <Image
          src={image.url}
          alt={image.alt}
          fill
          priority
          unoptimized={image.url.startsWith("https://")}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((item, index) => (
            <button
              key={`${item.url}-${index}`}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={t("selectImage", { number: index + 1 })}
              aria-pressed={selected === index}
              className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-muted transition-colors ${
                selected === index ? "border-brand" : "border-transparent hover:border-border"
              }`}
            >
              <Image src={item.url} alt="" fill unoptimized={item.url.startsWith("https://")} sizes="8rem" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
