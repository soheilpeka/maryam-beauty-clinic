"use client";

import { useState } from "react";
import { ServicePhotoFrame } from "@/components/service-photo-frame";
import type { ServicePhoto } from "@/lib/content/services";
import styles from "./service-photo-frame.module.css";

export function ServicePhotoGallery({ photos, locale }: { photos: ServicePhoto[]; locale: "en" | "fr" }) {
  const [index, setIndex] = useState(0);
  const fr = locale === "fr";
  if (!photos.length) return null;

  const position = index % photos.length;
  const photo = photos[position];
  const alt = fr ? photo.altFr : photo.altEn;
  const move = (offset: number) => setIndex(current => (current + offset + photos.length) % photos.length);

  return (
    <section aria-labelledby="service-photos" className={styles.photoGallery}>
      <div className={styles.galleryHeader}>
        <h3 id="service-photos" className="text-xs font-semibold uppercase tracking-widest text-brand">
          {fr ? "Photos du service" : "Service photos"}
        </h3>
        {photos.length > 1 && (
          <div className={styles.galleryControls}>
            <button type="button" aria-label={fr ? "Photo précédente" : "Previous photo"} onClick={() => move(-1)}>←</button>
            <span className={styles.galleryCount} role="status" aria-atomic="true">
              <span aria-hidden="true">{position + 1} / {photos.length}</span>
              <span className="sr-only">{fr ? `Photo ${position + 1} sur ${photos.length} : ${alt}` : `Photo ${position + 1} of ${photos.length}: ${alt}`}</span>
            </span>
            <button type="button" aria-label={fr ? "Photo suivante" : "Next photo"} onClick={() => move(1)}>→</button>
          </div>
        )}
      </div>
      <ServicePhotoFrame key={photo.id} src={photo.url} alt={alt} />
    </section>
  );
}
