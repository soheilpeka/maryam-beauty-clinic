"use client";
import { useId, useRef, useState, type PointerEvent } from "react";
import type { PhotoViewport } from "@/lib/content/comparisons";
import { photoViewportStyle } from "@/lib/content/comparisons";
import styles from "./image-comparison.module.css";

/** Use only with an owner-approved pair of the same subject and treatment. */
export function ImageComparison({ before, after, beforeLabel, afterLabel, label, aspectRatio = 4 / 3 }: {
  before: { src: string; alt: string; viewport?: PhotoViewport }; after: { src: string; alt: string; viewport?: PhotoViewport };
  beforeLabel: string; afterLabel: string; label: string; aspectRatio?: number;
}) {
  const id = useId();
  const [position, setPosition] = useState(50);
  const range = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; horizontal: boolean } | null>(null);
  function move(clientX: number, element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    if (bounds.width) setPosition(Math.min(100, Math.max(0, Math.round((clientX - bounds.left) / bounds.width * 100))));
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    const horizontal = event.pointerType !== "touch";
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal };
    event.currentTarget.setPointerCapture(event.pointerId);
    range.current?.focus({ preventScroll: true });
    if (horizontal) move(event.clientX, event.currentTarget);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = Math.abs(event.clientX - current.x), dy = Math.abs(event.clientY - current.y);
    if (!current.horizontal && dx > 6 && dx > dy) current.horizontal = true;
    if (current.horizontal) move(event.clientX, event.currentTarget);
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === event.pointerId) {
      if (!drag.current.horizontal && Math.abs(event.clientY - drag.current.y) < 6) move(event.clientX, event.currentTarget);
      drag.current = null;
    }
  }
  const photo = (value: typeof before) => <img className={styles.photo} src={value.src} alt={value.alt} loading="lazy" decoding="async" draggable={false} style={value.viewport ? photoViewportStyle(value.viewport) : undefined} />;
  return <figure className={styles.comparison}>
    <div className={styles.images} style={{ aspectRatio }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
      onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      <div className={styles.layer}>{photo(after)}</div>
      <div className={styles.layer} style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>{photo(before)}</div>
      <span className={styles.line} style={{ left: `${position}%` }} aria-hidden="true"><span>↔</span></span>
      <span className={`${styles.badge} ${styles.before}`}>{beforeLabel}</span><span className={`${styles.badge} ${styles.after}`}>{afterLabel}</span>
      <input ref={range} id={id} className={styles.range} type="range" min="0" max="100" step="1" value={position} onChange={event => setPosition(Number(event.target.value))} aria-label={label} aria-valuetext={`${beforeLabel} ${position}%, ${afterLabel} ${100 - position}%`} />
    </div><figcaption className={styles.instruction}><label htmlFor={id}>{label}</label></figcaption>
  </figure>;
}
