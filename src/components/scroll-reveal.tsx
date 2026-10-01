"use client";

import { useEffect } from "react";

/** Content remains visible without JS, under reduced motion, and when the observer fails. */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const elements = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    elements.forEach(element => {
      // Animate only approaching sections, not the visible hero or offscreen content.
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
