"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/routing";

const targets = [
  "h1", "h2", "h3", ".eyebrow", ".preview-kicker", "section > p", "section > div > p",
  ".salon-hero-actions", ".salon-photo-frame", ".preview-work-image", ".preview-service-image",
  ".service-discovery-card", ".product-editorial-card", ".gallery-photo-card",
  ".salon-square-grid > a", ".home-team-grid > article", ".home-category-grid > section",
  ".review-carousel-slide", ".booking-summary", ".commerce-summary", ".store-empty",
  "figure", ".store-hero > img", ".editorial-empty-image",
].join(",");
const groups = ".service-discovery-card,.product-editorial-card,.gallery-photo-card,.home-team-grid > article,.home-category-grid > section,figure,.review-carousel-slide";

/** Shared public motion: content stays readable without JavaScript or an observer. */
export function ScrollReveal() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.split("/").includes("admin")) return;
    const root = document.getElementById("main");
    if (!root || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;

    const tracked = new Set<HTMLElement>();
    const reveal = (element: HTMLElement) => {
      element.classList.remove("site-motion-pending");
      element.classList.add("site-motion-entered");
      observer.unobserve(element);
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) reveal(entry.target as HTMLElement);
    }, { threshold: 0.06, rootMargin: "0px 0px -24px 0px" });

    const register = () => {
      root.querySelectorAll<HTMLElement>(targets).forEach(element => {
        if (tracked.has(element) || element.closest("dialog,form,[role=alert],[aria-live],[hidden],.booking-workspace")) return;
        // Cards and figures move as one piece, without nested entrance animations.
        const group = element.closest(groups);
        if (group && group !== element) return;
        if (!element.getClientRects().length) return;
        tracked.add(element);
        const siblings = element.parentElement ? [...element.parentElement.children].filter(sibling => sibling.matches(targets)) : [];
        element.style.setProperty("--motion-delay", `${Math.min(Math.max(siblings.indexOf(element), 0), 4) * 65}ms`);
        element.dataset.siteMotion = element.matches(".salon-photo-frame,.preview-work-image,.preview-service-image,.store-hero > img,.editorial-empty-image,figure") ? "image" : "rise";
        const bounds = element.getBoundingClientRect();
        if (bounds.bottom <= 0) return;
        if (bounds.top < window.innerHeight - 24) reveal(element);
        else {
          element.classList.add("site-motion-pending");
          observer.observe(element);
        }
      });
    };
    register();
    // Filters, carousel changes and route-streamed content share the motion system.
    const mutations = new MutationObserver(register);
    mutations.observe(root, { childList: true, subtree: true });
    const showFocusedContent = (event: FocusEvent) => {
      if (event.target instanceof Element) {
        const pending = event.target.closest<HTMLElement>(".site-motion-pending");
        if (pending) {
          // Keyboard/pointer focus must not move its target during activation.
          pending.dataset.siteMotion = "none";
          reveal(pending);
        }
      }
    };
    const finishMotion = () => {
      if (preference.matches) tracked.forEach(element => element.classList.remove("site-motion-pending", "site-motion-entered"));
    };
    root.addEventListener("focusin", showFocusedContent);
    preference.addEventListener("change", finishMotion);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      root.removeEventListener("focusin", showFocusedContent);
      preference.removeEventListener("change", finishMotion);
      tracked.forEach(element => {
        element.classList.remove("site-motion-pending", "site-motion-entered");
        delete element.dataset.siteMotion;
        element.style.removeProperty("--motion-delay");
      });
    };
  }, [pathname]);
  return null;
}
