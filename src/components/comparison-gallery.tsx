"use client";
import { useState } from "react";
import { ImageComparison } from "@/components/image-comparison";
import type { GalleryComparisonGroup } from "@/lib/content/gallery-comparisons";
import styles from "./comparison-gallery.module.css";

const PAGE_SIZE = 6;
export function ComparisonGallery({ locale, groups }: { locale: "en" | "fr"; groups: GalleryComparisonGroup[] }) {
  const fr = locale === "fr";
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const filtered = groups.filter(group => filter === "all" || group.id === filter);
  const items = filtered.flatMap(group => group.items);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visible = new Set(items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(item => item.id));
  return <section className={styles.section} aria-labelledby="comparison-title" id="before-after">
    <header className={styles.heading}>
      <p className="eyebrow">{fr ? "UN AUTRE REGARD" : "A CLOSER LOOK"}</p>
      <h2 id="comparison-title">{fr ? "Avant & après." : "Before & after."}</h2>
      <p>{fr ? "Faites glisser pour explorer les deux images." : "Slide to explore both photographs."}</p>
    </header>
    <label className={styles.filter}>
      <span>{fr ? "Traitement" : "Treatment"}</span>
      <select value={filter} onChange={event => { setFilter(event.target.value); setPage(0); }}>
        <option value="all">{fr ? "Tous les traitements" : "All treatments"}</option>
        {groups.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}
      </select>
    </label>
    <p className={styles.count} role="status">{fr ? `${items.length} comparaisons · Page ${page + 1} sur ${pageCount}` : `${items.length} comparisons · Page ${page + 1} of ${pageCount}`}</p>
    {filtered.map(group => {
      const examples = group.items.filter(item => visible.has(item.id));
      if (!examples.length) return null;
      return <section key={group.id} className={styles.group} aria-labelledby={`comparison-group-${group.id}`}>
        <h3 id={`comparison-group-${group.id}`}>{group.label}</h3>
        <div className={styles.grid}>
          {examples.map(item => {
            const title = fr ? item.nameFr : item.name;
            const beforeLabel = fr ? "Avant" : "Before", afterLabel = fr ? "Après" : "After";
            return <article key={item.id} className={styles.card}>
              <ImageComparison before={{ src: item.imageUrl, alt: `${title} — ${beforeLabel}`, viewport: item.beforeCrop }} after={{ src: item.afterImageUrl, alt: `${title} — ${afterLabel}`, viewport: item.afterCrop }}
                beforeLabel={beforeLabel} afterLabel={afterLabel} label={fr ? `Glisser pour comparer : ${title}` : `Drag to compare: ${title}`} aspectRatio={item.aspectRatio} locale={locale}
                fullPhotosInitially={Boolean(item.reference && (item.imageUrl === "/media/comparisons/comparison-04.webp" || item.imageUrl.startsWith("/media/services/pigmented-lesions-laser-treatment/")))} />
              <h4>{title}</h4>
              <p>{fr ? item.descriptionFr : item.description}</p>
            </article>;
          })}
        </div>
      </section>;
    })}
    {!items.length && <p>{fr ? "Aucune comparaison dans cette catégorie." : "No comparisons in this category."}</p>}
    {pageCount > 1 && <nav className={styles.pagination} aria-label={fr ? "Pages des comparaisons" : "Comparison pages"}>
      <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>{fr ? "Précédent" : "Previous"}</button>
      <span>{page + 1} / {pageCount}</span>
      <button type="button" disabled={page + 1 === pageCount} onClick={() => setPage(value => value + 1)}>{fr ? "Suivant" : "Next"}</button>
    </nav>}
  </section>;
}
