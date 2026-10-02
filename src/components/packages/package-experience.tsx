"use client";

import { useRef, useState } from "react";
import styles from "./packages.module.css";
import { packageCopy } from "@/lib/content/skin-programs-fr";

type Package = {
  slug: string; name: string; strapline: string; description: string; stats: string[];
  included: string[]; idealFor: string[]; price: string; regular: string; saving: string; payment?: string; count?: number;
};

const themes = ["Discover. Experience. Transform.", "Hydrate · Brighten · Maintain", "Prevent · Protect · Renew", "Rebuild · Renew · Restore", "Your most complete skin journey"];
const counts = ["03", "06", "06", "10", "15"];
const journeys = [
  [{ when: "01", name: "Understand your skin", text: "Advanced AI skin analysis and a personalized treatment plan." }, { when: "02", name: "Experience Hydra Facial", text: "Deep cleansing, gentle exfoliation, instant hydration and glow." }, { when: "03", name: "Explore Matrix", text: "Skin assessment, customized treatment mapping and a personalized Matrix treatment preview." }],
  [{ when: "Every 2 months", name: "Signature Hydra Facial", text: "6 treatments across 12 months. 90 minutes per session." }, { when: "Throughout", name: "Track your progress", text: "AI analysis, personalized evaluation and before-and-after progress tracking." }],
  [{ when: "Months 1–3", name: "Skin regeneration", text: "3 Matrix RF Microneedling treatments, one every month." }, { when: "6 weeks", name: "Healing period", text: "Between your final Matrix treatment and the hydration phase." }, { when: "Months 4.5 · 6 · 7.5", name: "Hydrate & maintain", text: "3 Hydra Facial treatments, one every 6 weeks." }],
  [{ when: "Months 1 · 2 · 3", name: "Matrix + RF", text: "2.5 hours each. Treatments spaced 4 weeks apart." }, { when: "6 weeks later", name: "Transition to hydration", text: "Begin your Hydra Facial phase after your Matrix + RF phase." }, { when: "Months 4 · 6 · 8 · 10 · 12", name: "Hydra Facial journey", text: "1.5 hours each, spaced 2 months apart." }],
  [{ when: "Months 1–5", name: "Rebuild & renew", text: "5 Matrix + RF sessions, 4 weeks apart. 2.5 hours each." }, { when: "Months 6.5 · 8 · 9.5 · 11 · 12.5", name: "Hydrate & maintain", text: "5 HydraFacial sessions. 1.5 hours each." }],
];

function Mark({ kind }: { kind: number }) {
  return <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
    {kind === 1 ? <><path d="M50 12C50 12 24 43 24 62a26 26 0 0 0 52 0C76 43 50 12 50 12Z" /><path d="M36 63a14 14 0 0 0 14 14" /></> : kind === 4 ? <><path d="m14 36 20-21h32l20 21-36 49-36-49Z" /><path d="M14 36h72M34 15l16 70 16-70M34 15l16 21 16-21" /></> : kind === 3 ? <><rect x="23" y="23" width="54" height="54" transform="rotate(45 50 50)" /><path d="M50 10v80M10 50h80" /></> : <><circle cx="50" cy="50" r="35" /><ellipse cx="50" cy="50" rx="16" ry="35" transform="rotate(35 50 50)" /><path d="M15 50h70" /></>}
  </svg>;
}

export function PackageExperience({ packages, locale }: { packages: Package[]; locale: string }) {
  const [selected, setSelected] = useState(() => Math.max(0, packages.findIndex(p => p.slug === "essential")));
  const t = (text: string) => packageCopy(text, locale);
  const kindOf = (p: Package) => ["discovery", "glow-renewal", "essential", "platinum", "diamond"].indexOf(p.slug);
  const countOf = (p: Package) => p.count === undefined ? counts[kindOf(p)] ?? "01" : String(p.count).padStart(2, "0");
  const monthlyOf = (p: Package) => p.payment?.split("/")[0] ?? "";
  const discovery = packages.find(p => p.slug === "discovery");
  const detail = useRef<HTMLElement>(null);
  const item = packages[selected];
  const kind = kindOf(item);
  function choose(index: number, scroll = false) {
    setSelected(index);
    if (scroll) detail.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  return <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.kicker}>{t("MARYAM C BEAUTÉ / SKIN PROGRAMS")}</p><h1>{t("Good skin.")}<br />{t("A considered")} <span>{t("journey.")}</span></h1><p className={styles.intro}>{t("From your first glow to a complete skin renewal program. Discover a treatment journey designed around you.")}</p><a href="#programs" className={styles.textLink}>{t("Find your program")} <span aria-hidden="true">↘</span></a></div>
      <div className={styles.heroArt} aria-hidden="true"><div className={styles.orbitOne} /><div className={styles.orbitTwo} /><div className={styles.orbitThree} /><span className={styles.artLabel}>{t("ASSESS / TREAT / MAINTAIN")}</span><span className={styles.artCenter}>{t("Your skin.")}<br />{t("Your pace.")}</span><span className={styles.artBottom}>{t("PERSONALIZED BY MARYAM C BEAUTÉ")}</span></div>
    </section>

    {discovery && <section className={styles.discovery} aria-labelledby="discovery-title"><div className={styles.discoveryTitle}><span className={styles.pill}>{t("FOR NEW CLIENTS")}</span><h2 id="discovery-title">{t("Start with Discovery.")}</h2><p>{t("Three premium experiences. One visit.")}</p></div><div className={styles.discoverySteps}><span>01 <strong>{t("AI Skin Analysis")}</strong></span><span>02 <strong>{t("Hydra Facial")}</strong></span><span>03 <strong>{t("Matrix Consultation")}</strong></span></div><div className={styles.discoveryPrice}><div><del>{discovery.regular}</del><strong>{discovery.price}</strong></div><button onClick={() => choose(packages.indexOf(discovery), true)}>{t("Explore Discovery")} <span aria-hidden="true">↗</span></button></div></section>}

    <section id="programs" className={styles.programs} aria-labelledby="programs-heading"><div className={styles.sectionHeading}><div><p className={styles.kicker}>{t("THE COLLECTION")}</p><h2 id="programs-heading">{t("A little care.")}<br />{t("A lasting ritual.")}</h2></div><p>{t("Choose your program to explore the treatments, your journey and payment options.")}</p></div>
      <div className={styles.selectors}>{packages.filter(p => p.slug !== "discovery").map(p => { const index = packages.indexOf(p); const cardKind = kindOf(p); return <button key={p.slug} aria-pressed={selected === index} aria-controls="package-detail" className={`${styles.selector} ${selected === index ? styles.active : ""}`} onClick={() => choose(index)}><div className={styles.selectorTop}><span className={styles.kicker}>{t(cardKind === 1 ? "GLOW & MAINTENANCE" : cardKind === 2 ? "RENEWAL & PREVENTION" : cardKind === 3 ? "ADVANCED CARE" : "COMPLETE CARE")}</span><Mark kind={cardKind} /></div><h3>{p.name.replace(" Package", "").replace("Forfait ", "")}</h3><p className={styles.theme}>{t(themes[cardKind] ?? p.strapline)}</p><div className={styles.treatmentCount}><strong>{countOf(p)}</strong><span>{t("premium")}<br />{t("treatments")}</span></div><div className={styles.selectorPrice}><div><del>{p.regular}</del><strong>{p.price}</strong></div><span>{t(p.saving)}</span></div><div className={styles.selectorFooter}><span>{p.payment ? <>{monthlyOf(p)}{t(" / month")}</> : t("Book a consultation")}</span><span aria-hidden="true">{selected === index ? "✓" : "↗"}</span></div></button>; })}</div>
    </section>

    <section id="package-detail" ref={detail} className={styles.detail} aria-labelledby="detail-title"><div className={styles.detailHeading}><div><p className={styles.kicker}>{t("YOUR PROGRAM /")} 0{selected + 1}</p><h2 id="detail-title" aria-live="polite" aria-atomic="true">{item.name.replace(" Package", "").replace("Forfait ", "")}</h2><p>{t(item.strapline)}</p></div><div className={styles.detailSeal}><Mark kind={kind} /><span>{countOf(item)} {t(kind === 0 ? "EXPERIENCES" : "TREATMENTS")}</span></div></div>
      <div className={styles.detailLayout}><div className={styles.detailBody}><p className={styles.description}>{t(item.description)}</p><div className={styles.facts}>{item.stats.map(fact => <span key={t(fact)}>{t(fact)}</span>)}</div><h3 className={styles.subheading}>{t("Everything in your program")}</h3><ul className={styles.inclusions}>{item.included.map((included, index) => <li key={t(included)}><span className={styles.check}>✓</span><span>{t(included)}</span><small>{String(index + 1).padStart(2, "0")}</small></li>)}</ul><div className={styles.journeyHeading}><p className={styles.kicker}>{t("STEP BY STEP")}</p><h3>{t("Your treatment journey")}</h3></div><ol className={styles.timeline}>{(journeys[kind] ?? [{when: "", name: "Your treatment journey", text: "Discuss your personalized schedule with the clinic."}]).map(step => <li key={t(step.when)}><div className={styles.timelineDot} /><div><span>{t(step.when)}</span><h4>{t(step.name)}</h4><p>{t(step.text)}</p></div></li>)}</ol><h3 className={styles.subheading}>{t("Designed for")}</h3><ul className={styles.concerns}>{item.idealFor.map(concern => <li key={t(concern)}>{t(concern)}</li>)}</ul></div>
      <aside className={styles.investment}><p className={styles.kicker}>{t("YOUR INVESTMENT")}</p><p className={styles.regular}>{t("Regular value")} <del>{item.regular}</del></p><p className={styles.bigPrice}>{item.price}</p><span className={styles.saving}>{t(item.saving)}</span>{item.payment && <div className={styles.payment}><span>{t("Or spread your payments")}</span><p><strong>{monthlyOf(item)}</strong>{t(" / month")}</p><small>{t(item.payment.split(" · ").slice(1).join(" · "))}</small></div>}<a href={`/${locale}/contact`} className={styles.booking}>{t("Book a consultation")} <span aria-hidden="true">↗</span></a><div className={styles.investmentBenefits}><p>{t("✓ Personalized treatment plan")}</p><p>{t("✓ Professional skin assessment")}</p><p>{t("✓ Care guided by your skin goals")}</p></div></aside></div>
    </section>
    <section className={styles.closing}><p className={styles.kicker}>{t("LET’S FIND YOUR FIT")}</p><h2>{t("Your next chapter")}<br />{t("starts with a conversation.")}</h2><a className={styles.booking} href={`/${locale}/contact`}>{t("Speak with the clinic")} <span aria-hidden="true">↗</span></a></section>
  </div>;
}
