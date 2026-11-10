"use client";

import { useId, useState } from "react";
import { ImageComparison } from "@/components/image-comparison";
import type { ServiceComparison } from "@/lib/content/service-comparisons";
import styles from "./service-results.module.css";

export function ServiceResults({ items, locale, serviceName }: { items: ServiceComparison[]; locale: "en" | "fr"; serviceName: string }) {
  const id = useId();
  const [index, setIndex] = useState(0);
  const fr = locale === "fr";
  if (!items.length) return null;
  const currentIndex = Math.min(index, items.length - 1);
  const item = items[currentIndex];
  const title = fr ? item.nameFr : item.name;
  const before = fr ? "Avant" : "Before", after = fr ? "Après" : "After";
  return <section className={styles.section} aria-labelledby={id}>
    <header className={styles.heading}>
      <p className={styles.eyebrow}>{serviceName}</p>
      <h2 id={id}>{fr ? "Avant & après." : "Before & after."}</h2>
      <p>{fr ? "Comparez les photos côte à côte ou explorez-les avec le curseur." : "View the photographs side by side, or explore them with the slider."}</p>
    </header>
    <div className={styles.card} style={{ maxWidth: `${Math.max(13, item.aspectRatio * 36)}rem` }}>
      <div className={styles.caption}><h3>{title}</h3><span role="status" aria-live="polite" aria-atomic="true">{currentIndex + 1} / {items.length}</span></div>
      <div className={styles.viewer}>
        <ImageComparison key={item.id} before={{ src: item.imageUrl, alt: `${title} — ${before}`, viewport: item.beforeCrop }} after={{ src: item.afterImageUrl, alt: `${title} — ${after}`, viewport: item.afterCrop }} beforeLabel={before} afterLabel={after} label={fr ? `Glisser pour comparer : ${title}` : `Drag to compare: ${title}`} aspectRatio={item.aspectRatio} locale={locale} fullPhotosInitially={false} />
      </div>
      {items.length > 1 && <nav className={styles.navigation} aria-label={fr ? "Exemples avant et après" : "Before and after examples"}>
        <button type="button" disabled={currentIndex === 0} onClick={() => setIndex(currentIndex - 1)} aria-label={fr ? "Exemple précédent" : "Previous example"}>←</button>
        {items.length <= 4 ? <div className={styles.dots}>{items.map((example, i) => <button key={example.id} type="button" aria-label={fr ? `Afficher l’exemple ${i + 1}` : `Show example ${i + 1}`} aria-current={currentIndex === i ? "true" : undefined} onClick={() => setIndex(i)}><span /></button>)}</div> : <div className={styles.progress} aria-hidden="true"><span style={{ width: `${(currentIndex + 1) / items.length * 100}%` }} /></div>}
        <button type="button" disabled={currentIndex === items.length - 1} onClick={() => setIndex(currentIndex + 1)} aria-label={fr ? "Exemple suivant" : "Next example"}>→</button>
      </nav>}
    </div>
    <p className={styles.note}>{fr ? "Photos de référence fournies. Les résultats varient d’une personne à l’autre." : "Supplied reference photographs. Individual results vary."}</p>
  </section>;
}
