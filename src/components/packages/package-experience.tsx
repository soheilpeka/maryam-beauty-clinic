"use client";

import { useRef, useState } from "react";
import styles from "./packages.module.css";
import { packageCopy } from "@/lib/content/skin-programs-fr";
import { skinProgramDetails } from "@/lib/content/skin-program-details";

type Package = {
  slug: string; name: string; strapline: string; description: string; stats: string[];
  included: string[]; idealFor: string[]; price: string; regular: string; saving: string; payment?: string; count?: number;
};

const themes = ["Discover. Experience. Transform.", "Revive · Refresh · Radiate", "Renew · Refresh · Rejuvenate", "Rebuild · Renew · Restore", "Your most complete skin journey"];
const counts = ["03", "06", "06", "10", "15"];

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
  const extra = skinProgramDetails(item.slug, locale);
  const journey = extra?.phases ?? [{ when: "", name: t("Your treatment journey"), text: t("Discuss your personalized schedule with the clinic.") }];
  const fr = locale === "fr";
  function choose(index: number, scroll = false) {
    setSelected(index);
    if (scroll) {
      detail.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      window.requestAnimationFrame(() => detail.current?.querySelector<HTMLElement>("#detail-title")?.focus({ preventScroll: true }));
    }
  }
  return <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.kicker}>{t("MARYAM C BEAUTÉ / SKIN PROGRAMS")}</p><h1>{t("Good skin.")}<br />{t("A considered")} <span>{t("journey.")}</span></h1><p className={styles.intro}>{t("From your first glow to a complete skin renewal program. Discover a treatment journey designed around you.")}</p><a href="#programs" className={styles.textLink}>{t("Find your program")} <span aria-hidden="true">↘</span></a></div>
      <div className={styles.heroArt} aria-hidden="true"><div className={styles.orbitOne} /><div className={styles.orbitTwo} /><div className={styles.orbitThree} /><span className={styles.artLabel}>{t("ASSESS / TREAT / MAINTAIN")}</span><span className={styles.artCenter}>{t("Your skin.")}<br />{t("Your pace.")}</span><span className={styles.artBottom}>{t("PERSONALIZED BY MARYAM C BEAUTÉ")}</span></div>
    </section>

    {discovery && <section className={styles.discovery} aria-labelledby="discovery-title"><div className={styles.discoveryTitle}><span className={styles.pill}>{t("FOR NEW CLIENTS")}</span><h2 id="discovery-title">{t("Start with Discovery.")}</h2><p>{t("Three premium experiences. One visit.")}</p></div><div className={styles.discoverySteps}><span>01 <strong>{t("AI Skin Analysis")}</strong></span><span>02 <strong>{t("Hydra Facial")}</strong></span><span>03 <strong>{t("Matrix Consultation")}</strong></span></div><div className={styles.discoveryPrice}><div><del>{discovery.regular}</del><strong>{discovery.price}</strong></div><button onClick={() => choose(packages.indexOf(discovery), true)}>{t("Explore Discovery")} <span aria-hidden="true">↗</span></button></div></section>}

    <section id="programs" className={styles.programs} aria-labelledby="programs-heading"><div className={styles.sectionHeading}><div><p className={styles.kicker}>{t("THE COLLECTION")}</p><h2 id="programs-heading">{t("A little care.")}<br />{" "}{t("A lasting ritual.")}</h2></div><p>{t("Choose your program to explore the treatments, your journey and payment options.")}</p></div>
      <div className={styles.selectors}>{packages.filter(p => p.slug !== "discovery").map(p => { const index = packages.indexOf(p); const cardKind = kindOf(p); const overview = skinProgramDetails(p.slug, locale); return <button key={p.slug} aria-pressed={selected === index} aria-controls="package-detail" className={`${styles.selector} ${selected === index ? styles.active : ""}`} onClick={() => choose(index, true)}><div className={styles.selectorTop}><span className={styles.kicker}>{t(cardKind === 1 ? "GLOW & MAINTENANCE" : cardKind === 2 ? "RENEWAL & PREVENTION" : cardKind === 3 ? "ADVANCED CARE" : "COMPLETE CARE")}</span><Mark kind={cardKind} /></div><h3>{p.name.replace(" Package", "").replace("Forfait ", "")}</h3><p className={styles.theme}>{t(themes[cardKind] ?? p.strapline)}</p>{overview && <ul className={styles.selectorBreakdown}>{overview.summary.map(line => <li key={line}>{line}</li>)}</ul>}<div className={styles.treatmentCount}><strong>{countOf(p)}</strong><span>{t("premium")}<br />{t("treatments")}</span></div><div className={styles.selectorPrice}><div><del>{p.regular}</del><strong>{p.price}</strong></div><span>{t(p.saving)}</span></div><div className={styles.selectorFooter}><span>{p.payment ? <>{monthlyOf(p)}{t(" / month")}</> : t("Book a consultation")}</span><span aria-hidden="true">{selected === index ? "✓" : "↗"}</span></div></button>; })}</div>
    </section>

    <section id="package-detail" ref={detail} className={styles.detail} aria-labelledby="detail-title"><div className={styles.detailHeading}><div><p className={styles.kicker}>{t("YOUR PROGRAM /")} 0{selected + 1}</p><h2 id="detail-title" tabIndex={-1} aria-live="polite" aria-atomic="true">{item.name.replace(" Package", "").replace("Forfait ", "")}</h2><p>{t(item.strapline)}</p>{extra && <p className={styles.motto}>{extra.motto}</p>}</div><div className={styles.detailSeal}><Mark kind={kind} /><span>{countOf(item)} {t(kind === 0 ? "EXPERIENCES" : "TREATMENTS")}</span></div></div>
      {extra && <div className={styles.highlights}>{extra.highlights.map((benefit, i) => <article key={benefit.title}><span className={styles.benefitNumber}>{String(i + 1).padStart(2, "0")}</span><div><h3>{benefit.title}</h3><p>{benefit.text}</p></div></article>)}</div>}
      <div className={styles.detailLayout}><div className={styles.detailBody}><p className={styles.description}>{t(item.description)}</p><div className={styles.facts}>{item.stats.map(fact => <span key={t(fact)}>{t(fact)}</span>)}</div><h3 className={styles.subheading}>{t("Everything in your program")}</h3>{extra?.experiences ? <div className={styles.experiences}>{extra.experiences.map((experience, i) => <article key={experience.title}><div className={styles.experienceHeader}><span>{String(i + 1).padStart(2, "0")}</span><h4>{experience.title}</h4></div><ul>{experience.points.map(point => <li key={point}><span aria-hidden="true">✓</span>{point}</li>)}</ul></article>)}</div> : <ul className={styles.inclusions}>{item.included.map((included, index) => <li key={t(included)}><span className={styles.check}>✓</span><span>{t(included)}</span><small>{String(index + 1).padStart(2, "0")}</small></li>)}</ul>}{kind !== 0 && <><div className={styles.journeyHeading}><p className={styles.kicker}>{t("STEP BY STEP")}</p><h3>{t("Your treatment journey")}</h3></div><ol className={styles.timeline}>{journey.map(step => <li key={t(step.when)}><div className={styles.timelineDot} /><div><span>{t(step.when)}</span><h4>{t(step.name)}</h4><p>{t(step.text)}</p></div></li>)}</ol>{extra?.visits && <details className={styles.visitDetails} key={item.slug}><summary><div><span className={styles.kicker}>{fr ? "VOTRE CALENDRIER" : "YOUR TIMETABLE"}</span><strong>{fr ? "Voir chaque rendez-vous" : "See every appointment"}</strong><p>{extra.appointmentSummary}</p></div><span className={styles.expandIcon} aria-hidden="true">+</span></summary><ol className={styles.visitList}>{extra.visits.map((visit, i) => <li key={`${visit.when}-${i}`}><div className={styles.visitWhen}><span>{String(i + 1).padStart(2, "0")}</span><strong>{visit.when}</strong></div><div className={styles.visitTreatment}><h4>{visit.treatment}</h4><p>{visit.interval}</p></div><span className={styles.visitDuration}>{visit.duration}</span></li>)}</ol></details>}</>}
      <h3 className={styles.subheading}>{t("Designed for")}</h3><ul className={styles.concerns}>{[...item.idealFor, ...(extra?.extraConcerns ?? [])].map(concern => <li key={t(concern)}>{t(concern)}</li>)}</ul>{extra && <section className={styles.results} aria-labelledby="skin-goals-title"><p className={styles.kicker}>{fr ? "VOS OBJECTIFS" : "YOUR SKIN GOALS"}</p><h3 id="skin-goals-title">{fr ? "Ce que votre programme vise à soutenir" : "What your program is designed to support"}</h3><ul>{extra.goals.map((goal, i) => <li key={goal}><span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><strong>{goal}</strong></li>)}</ul><p className={styles.careNote}>{fr ? "Les soins sont personnalisés après l’évaluation de votre peau. Les résultats et le temps de récupération varient selon la personne et le traitement." : "Care is personalized after your skin assessment. Results and downtime vary by person and treatment."}</p></section>}</div>
      <aside className={styles.investment}><p className={styles.kicker}>{t("YOUR INVESTMENT")}</p>{item.regular && <p className={styles.regular}>{t("Regular value")} <del>{item.regular}</del></p>}<p className={styles.bigPrice}>{item.price}</p>{item.saving && <span className={styles.saving}>{t(item.saving)}</span>}{extra?.offer && <p className={styles.offerNote}>{extra.offer}</p>}{item.payment && <div className={styles.payment}><span>{t("Or spread your payments")}</span><p><strong>{monthlyOf(item)}</strong>{t(" / month")}</p><small>{t(item.payment.split(" · ").slice(1).join(" · "))}<span className={styles.financeNote}>{fr ? "Financement sans intérêt · paiements faciles" : "No-interest financing · easy monthly payments"}</span></small></div>}<a href={`/${locale}/contact`} className={styles.booking}>{t("Book a consultation")} <span aria-hidden="true">↗</span></a><div className={styles.investmentBenefits}><p>{t("✓ Professional skin assessment")}</p><p>{t("✓ Care guided by your skin goals")}</p></div>{extra && <blockquote className={styles.programQuote}><p>{extra.quote}</p><cite>MARYAM C BEAUTÉ</cite></blockquote>}</aside></div>
    </section>
    <section className={styles.closing}><p className={styles.kicker}>{t("LET’S FIND YOUR FIT")}</p><h2>{extra ? extra.closing : <>{t("Your next chapter")}<br />{t("starts with a conversation.")}</>}</h2><a className={styles.booking} href={`/${locale}/contact`}>{t("Speak with the clinic")} <span aria-hidden="true">↗</span></a></section>
  </div>;
}
