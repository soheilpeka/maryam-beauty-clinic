"use client";

import { useState } from "react";
import type { Testimonial } from "@/lib/content/testimonials";

export function TestimonialsCarousel({
  reviews,
  locale,
}: {
  reviews: Testimonial[];
  locale: "en" | "fr";
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = reviews[activeIndex];
  const french = locale === "fr";

  if (!current || reviews.length === 0) return null;

  const move = (direction: -1 | 1) => {
    setActiveIndex((index) => (index + direction + reviews.length) % reviews.length);
  };

  return (
    <div className="review-carousel" role="region" aria-label={french ? "Avis de la clientèle" : "Client reviews"} aria-roledescription={french ? "carrousel" : "carousel"}>
      <figure className="review-carousel-slide" aria-roledescription={french ? "diapositive" : "slide"} aria-label={french ? `Avis ${activeIndex + 1} sur ${reviews.length}` : `Review ${activeIndex + 1} of ${reviews.length}`} aria-live="polite" aria-atomic="true">
        <blockquote>
          <span className="review-carousel-quote-mark" aria-hidden="true">“</span>
          {current.quote}
          <span className="review-carousel-quote-mark" aria-hidden="true">”</span>
        </blockquote>
        <figcaption>
          <span className="review-carousel-avatar" aria-hidden="true">{current.author.charAt(0)}</span>
          <span className="review-carousel-author">{current.author}</span>
          <span className="review-carousel-source">{current.location}</span>
        </figcaption>
      </figure>

      <div className="review-carousel-controls" aria-label={french ? "Commandes des avis" : "Review controls"}>
        <button type="button" className="review-carousel-arrow" onClick={() => move(-1)} aria-label={french ? "Avis précédent" : "Previous review"}>
          <span aria-hidden="true">←</span>
        </button>
        <div className="review-carousel-dots" aria-label={french ? "Choisir un avis" : "Choose a review"}>
          {reviews.map((review, index) => (
            <button
              type="button"
              key={review.author}
              className={`review-carousel-dot${index === activeIndex ? " is-active" : ""}`}
              onClick={() => setActiveIndex(index)}
              aria-label={french ? `Voir l’avis ${index + 1} sur ${reviews.length}` : `Go to review ${index + 1} of ${reviews.length}`}
              aria-current={index === activeIndex ? "true" : undefined}
            />
          ))}
        </div>
        <button type="button" className="review-carousel-arrow" onClick={() => move(1)} aria-label={french ? "Avis suivant" : "Next review"}>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
