"use client";
import { useId, useState } from "react";

/** Use only with an owner-approved pair of the same subject and treatment. */
export function ImageComparison({ before, after, beforeLabel, afterLabel, label }: {
  before: { src: string; alt: string }; after: { src: string; alt: string };
  beforeLabel: string; afterLabel: string; label: string;
}) {
  const id = useId();
  const [position, setPosition] = useState(50);
  return <figure className="image-comparison">
    <div className="comparison-images">
      <img src={after.src} alt={after.alt} loading="lazy" />
      <img src={before.src} alt={before.alt} loading="lazy" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }} />
      <span className="comparison-line" style={{ left: `${position}%` }} aria-hidden="true">↔</span>
      <span className="comparison-before">{beforeLabel}</span><span className="comparison-after">{afterLabel}</span>
      <input id={id} type="range" min="0" max="100" value={position} onChange={event => setPosition(Number(event.target.value))} aria-label={label} aria-valuetext={`${beforeLabel} ${position}%, ${afterLabel} ${100 - position}%`} />
    </div><figcaption><label htmlFor={id}>{label}</label></figcaption>
  </figure>;
}
