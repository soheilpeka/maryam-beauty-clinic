"use client";
import { useState } from "react";
import { ImageComparison } from "@/components/image-comparison";
import { COMPARISONS } from "@/lib/content/comparisons";
import styles from "./comparison-gallery.module.css";

const PAGE_SIZE = 6;
export function ComparisonGallery({ locale }: { locale: "en" | "fr" }) {
  const fr = locale === "fr";
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const filtered = COMPARISONS.filter(item => filter === "all" || item.family === filter);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const filters = [{ id: "all", label: fr ? "Tout" : "All" }, { id: "laser", label: "Laser" }, { id: "rf", label: fr ? "Radiofréquence" : "Radiofrequency" }];
  return <section className={styles.section} aria-labelledby="comparison-title" id="before-after">
    <header className={styles.heading}>
      <p className="eyebrow">{fr ? "UN AUTRE REGARD" : "A CLOSER LOOK"}</p>
      <h2 id="comparison-title">{fr ? "Avant & après." : "Before & after."}</h2>
      <p>{fr ? "Faites glisser pour explorer les deux images." : "Slide to explore both photographs."}</p>
    </header>
    <div className={styles.filters} role="group" aria-label={fr ? "Filtrer les comparaisons" : "Filter comparisons"}>
      {filters.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setPage(0); }}>{item.label}</button>)}
    </div>
    <p className={styles.count} role="status">{fr ? `${filtered.length} comparaisons · Page ${page + 1} sur ${pageCount}` : `${filtered.length} comparisons · Page ${page + 1} of ${pageCount}`}</p>
    <div className={styles.grid}>
      {visible.map(item => {
        const title = fr ? item.titleFr : item.title;
        const beforeLabel = fr ? "Avant" : "Before", afterLabel = fr ? "Après" : "After";
        return <article key={item.id} className={styles.card}>
          <ImageComparison before={{ src: item.image, alt: `${title} — ${beforeLabel}`, viewport: item.before }} after={{ src: item.image, alt: `${title} — ${afterLabel}`, viewport: item.after }}
            beforeLabel={beforeLabel} afterLabel={afterLabel} label={fr ? `Glisser pour comparer : ${title}` : `Drag to compare: ${title}`} aspectRatio={item.before.width / item.before.height * item.boardRatio} />
          <p className={styles.category}>{item.family === "laser" ? "Laser" : fr ? "Radiofréquence" : "Radiofrequency"}</p>
          <h3>{title}</h3>
        </article>;
      })}
    </div>
    <nav className={styles.pagination} aria-label={fr ? "Pages des comparaisons" : "Comparison pages"}>
      <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>{fr ? "Précédent" : "Previous"}</button>
      <span>{page + 1} / {pageCount}</span>
      <button type="button" disabled={page + 1 === pageCount} onClick={() => setPage(value => value + 1)}>{fr ? "Suivant" : "Next"}</button>
    </nav>
  </section>;
}
