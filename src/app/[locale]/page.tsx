import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { BOOKING_URL } from "@/lib/site-config";
import { BUSINESS, localizedHours } from "@/lib/content/business";
import { publicServices } from "@/lib/public-content";
import { prisma } from "@/lib/prisma";
import { categoryLabel, SERVICE_CATEGORIES } from "@/lib/content/services";
import { TESTIMONIALS } from "@/lib/content/testimonials";
import { TestimonialsCarousel } from "@/components/testimonials-carousel";
import { BusinessAddressLink } from "@/components/business-address-link";
import { PUBLIC_STAFF_WHERE } from "@/lib/public-staff";

export const dynamic = "force-dynamic";

const copy = {
  en: {
    title: "Maryam C Beauté | Modern beauty, considered",
    description: "A considered beauty salon for hair, skin and confidence in Brossard, Québec.",
    kicker: "Maryam C Beauté", hero: "Beauty shines from within.", book: "Book now",
    signature: "The signature work", signatureTitle: "Results that feel like you.", signatureBody: "Every look and treatment is shaped around your features, your lifestyle and the way you want to feel when you leave the studio.", explore: "Explore our services",
    aboutKicker: "About Maryam C Beauté", aboutTitle: "A calm studio. Considered care.", aboutBody: "Maryam C Beauté brings hair, makeup and aesthetic services together in a warm, personal setting in Brossard. Every visit begins with a conversation about you.",
    serviceKicker: "Featured treatment", serviceTitle: "RF Microneedling", serviceBody: "A considered skin-renewal treatment combining radiofrequency energy with precision microneedling. It supports smoother texture, refined pores and a visibly rested glow.", serviceLink: "Discover the treatment", allServices: "View all services",
    collectionKicker: "The collection", collectionTitle: "Looks made for you.", collectionBody: "Colour, movement and details from the salon. Find inspiration for your next visit.",
    teamKicker: "The team", teamTitle: "Here to make you shine.", teamBody: "Thoughtful artists, attentive care and a shared belief that beauty should feel personal.", reviewsKicker: "Verified Google reviews", reviewsTitle: "Kind words from Brossard.", reviewsLink: "Read all reviews",
    storeKicker: "The Maryam C edit", storeTitle: "Bring the studio home.", storeBody: "Discover our considered selection of professional hair and skin essentials.", storeLink: "Visit the store", contactKicker: "Come as you are", contactTitle: "Ready for your next chapter?", nav: ["Home", "About", "Services", "Contact us"],
  },
  fr: {
    title: "Maryam C Beauté | La beauté, avec intention",
    description: "Un salon raffiné pour les cheveux, la peau et la confiance à Brossard, Québec.",
    kicker: "Maryam C Beauté", hero: "La beauté vient de l'intérieur.", book: "Réserver",
    signature: "Notre signature", signatureTitle: "Des résultats qui vous ressemblent.", signatureBody: "Chaque look et chaque soin sont pensés autour de vos traits, de votre quotidien et de la façon dont vous souhaitez vous sentir en sortant du studio.", explore: "Découvrir nos services",
    aboutKicker: "À propos de Maryam C Beauté", aboutTitle: "Un studio apaisant. Un soin pensé pour vous.", aboutBody: "Maryam C Beauté réunit coiffure, maquillage et soins esthétiques dans un cadre chaleureux et personnel à Brossard. Chaque visite commence par une conversation sur vos envies.",
    serviceKicker: "Soin vedette", serviceTitle: "Microneedling RF", serviceBody: "Un soin de renouvellement qui combine la radiofréquence et le microneedling de précision pour une texture plus lisse et un teint reposé.", serviceLink: "Découvrir le soin", allServices: "Voir tous les services",
    collectionKicker: "La collection", collectionTitle: "Des looks qui vous ressemblent.", collectionBody: "Couleur, mouvement et détails du salon. Trouvez votre inspiration pour votre prochaine visite.",
    teamKicker: "L'équipe", teamTitle: "Pour révéler votre éclat.", teamBody: "Des artistes attentifs, une approche personnalisée et une même vision de la beauté.", reviewsKicker: "Avis Google vérifiés", reviewsTitle: "Les mots de notre clientèle.", reviewsLink: "Lire tous les avis",
    storeKicker: "La sélection Maryam C", storeTitle: "Le studio, chez vous.", storeBody: "Découvrez notre sélection de soins professionnels pour les cheveux et la peau.", storeLink: "Visiter la boutique", contactKicker: "Venez comme vous êtes", contactTitle: "Prête pour la suite?", nav: ["Accueil", "À propos", "Services", "Contact"],
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = copy[locale === "fr" ? "fr" : "en"];
  return { title: t.title, description: t.description, alternates: { canonical: `/${locale}` } };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = copy[locale === "fr" ? "fr" : "en"];

  const loc = locale === "fr" ? "fr" : "en";
  const services = await publicServices(loc);
  const featured = services.find(service => service.slug === "rf-microneedling");
  const questions = loc === "fr" ? [
    ["Ma demande est-elle un rendez-vous confirmé?", "Non. Votre demande reste en attente jusqu’à ce que le salon l’approuve. La date et l’heure sont vos préférences, pas une disponibilité garantie."],
    ["Comment annuler ma demande?", "Utilisez le lien sécurisé affiché après l’envoi de votre demande. Il permet d’annuler une demande en attente ou un rendez-vous confirmé."],
    ["Où puis-je en savoir plus sur un service?", "Consultez sa page pour en savoir plus. Le salon répondra à vos questions et discutera des détails avant de confirmer un rendez-vous."],
  ] : [
    ["Is my request a confirmed appointment?", "No. Your request stays pending until the salon approves it. The date and time are your preferences, not guaranteed availability."],
    ["How can I cancel my request?", "Use the secure link displayed after submitting your request. You can cancel a pending request or a confirmed appointment there."],
    ["Where can I learn more about a service?", "Visit its service page for an overview. The salon can answer questions and discuss the details before confirming a booking."],
  ];
  const [team, gallery, productCount] = await Promise.all([
    prisma.staff.findMany({ where: PUBLIC_STAFF_WHERE, orderBy: { order: "asc" } }),
    prisma.galleryItem.findMany({ where: { active: true }, orderBy: { order: "asc" }, take: 9 }),
    prisma.product.count({ where: { active: true, demo: false } }),
  ]);
  return (
    <div className="preview-page">
      <section id="top" className="salon-hero" aria-labelledby="salon-hero-title">
        <div className="salon-hero-main">
          <img className="salon-hero-image" src="/media/editorial/hero-brunette.webp" width={1672} height={940} alt={loc === "fr" ? "Inspiration coiffure : brushing brun aux ondulations douces" : "Hair inspiration: a soft brunette blowout"} fetchPriority="high" />
          <div className="salon-hero-copy">
            <p className="preview-kicker">{t.kicker} · Brossard</p>
            <h1 id="salon-hero-title">{t.hero}</h1>
            <p className="salon-hero-intro">{loc === "fr" ? "Coiffure, soins de la peau et beauté. Une approche personnelle, pensée autour de vous." : "Hair, skin and beauty. A personal approach, thoughtfully shaped around you."}</p>
            <div className="salon-hero-actions"><Link href={BOOKING_URL}>{t.book}<span aria-hidden="true">↗</span></Link><Link href="/book-online">{t.explore}</Link></div>
          </div>
        </div>
      </section>
      <section id="about" className="preview-work" data-reveal><div className="preview-work-image"><img src="/media/salon/img_8204.webp" alt={loc === "fr" ? "Couleur et ondulations au salon" : "Colour and waves at the salon"} /></div><div><p className="preview-kicker">{t.signature}</p><h2>{t.signatureTitle}</h2><p>{t.signatureBody}</p><a className="preview-text-link" href="#services">{t.explore}&nbsp; ↗</a></div></section>
      <section className="preview-parallax"><div><p className="preview-kicker">{t.aboutKicker}</p><h2>{t.aboutTitle}</h2><p className="preview-parallax-copy">{t.aboutBody}</p><Link href="/about" className="preview-text-link">{loc === "fr" ? "Découvrir le salon" : "Discover the salon"} ↗</Link></div></section>
      {featured && <section id="services" className="preview-service" data-reveal><div className="preview-service-copy"><p className="preview-kicker">{t.serviceKicker}</p><h2>{featured.name}</h2><p>{featured.summary}</p><div className="flex flex-wrap gap-5"><Link className="preview-text-link" href={`/service-page/${featured.slug}`}>{t.serviceLink}&nbsp; ↗</Link><Link className="preview-text-link" href="/book-online">{t.allServices}&nbsp; ↗</Link></div></div><div className="preview-service-image"><img className="preview-device-only" src={featured.image} alt={featured.name} loading="lazy" /></div></section>}
      <section className="home-catalog"><div className="home-section-heading"><p className="preview-kicker">{loc === "fr" ? "Le menu complet" : "The complete menu"}</p><h2>{loc === "fr" ? "Votre beauté. Votre façon." : "Your beauty. Your way."}</h2><Link href="/book-online" className="preview-text-link">{t.allServices} ↗</Link></div><div className="home-category-grid">{SERVICE_CATEGORIES.map((category) => <section key={category}><h3>{categoryLabel(category, loc)}</h3><ul>{services.filter(s => s.category === category).map(s => <li key={s.slug}><Link href={`/service-page/${s.slug}`}>{s.name}<span aria-hidden="true">↗</span></Link></li>)}</ul></section>)}</div></section>
      <section className="preview-real" data-reveal><div className="preview-gallery-grid">{gallery.slice(0, 3).map(item => <div className="salon-photo-frame" key={item.id}><img src={item.imageUrl} alt={(loc === "fr" ? item.altFr : item.altEn) ?? ""} loading="lazy" /></div>)}</div><div><p className="preview-kicker">{t.collectionKicker}</p><h2>{t.collectionTitle}</h2><p>{t.collectionBody}</p><Link href="/gallery" className="preview-text-link">{loc === "fr" ? "Voir la galerie" : "View the gallery"} ↗</Link></div></section>
      <section className="preview-team" data-reveal><div><p className="preview-kicker">{t.teamKicker}</p><h2>{t.teamTitle}</h2><p>{t.teamBody}</p><Link className="preview-text-link" href="/about">{loc === "fr" ? "Découvrir notre approche" : "Discover our approach"} ↗</Link></div><div className="salon-photo-frame"><img src="/media/salon/team.webp" alt={loc === "fr" ? "L’équipe au salon Maryam C Beauté" : "The team at Maryam C Beauté"} loading="lazy" /></div></section>
      <section className="preview-reviews" aria-labelledby="verified-reviews-title"><div className="preview-reviews-heading"><p className="preview-kicker">{t.reviewsKicker}</p><h2 id="verified-reviews-title">{t.reviewsTitle}</h2><a className="preview-text-link" href={BUSINESS.googleMapsReviewsHref} target="_blank" rel="noreferrer">{t.reviewsLink}&nbsp; ↗</a></div><TestimonialsCarousel reviews={TESTIMONIALS} locale={loc} /></section>
      {team.some(member => member.avatarUrl) && <section className="home-team-grid" aria-label={t.teamKicker}>{team.filter(member => member.avatarUrl).map(member => <article key={member.id}><img src={member.avatarUrl!} alt={member.name} loading="lazy" /><h3>{member.name}</h3><p>{(loc === "fr" ? member.bioFr : member.bio) ?? ""}</p></article>)}</section>}
      <section className="preview-store"><p className="preview-kicker">{t.storeKicker}</p><h2>{t.storeTitle}</h2><p>{productCount ? t.storeBody : loc === "fr" ? "Notre collection est en préparation. Les produits seront présentés ici dès leur publication par le salon." : "Our collection is being prepared. Products will appear here when published by the salon."}</p><Link className="preview-text-link" href="/store">{t.storeLink}&nbsp; ↗</Link></section>
      <section className="home-catalog" aria-labelledby="home-faq"><p className="preview-kicker">{loc === "fr" ? "Avant votre visite" : "Before your visit"}</p><h2 id="home-faq" className="display-heading mb-10 text-4xl sm:text-5xl">{loc === "fr" ? "Quelques réponses." : "A few answers."}</h2>{questions.map(([question, answer]) => <details key={question} className="luxury-faq"><summary className="cursor-pointer text-lg font-medium">{question}</summary><p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">{answer}</p></details>)}</section>
      {gallery.length > 0 && <section className="salon-social-gallery" aria-label={loc === "fr" ? "Détails du salon" : "Salon details"}><div><p className="preview-kicker">Maryam C Beauté · {loc === "fr" ? "Au salon" : "At the salon"}</p><Link href="/gallery" className="preview-text-link">{loc === "fr" ? "Toute la galerie" : "Explore the gallery"} ↗</Link></div><div className="salon-square-grid">{gallery.filter(item => item.category === "Hair").slice(3, 8).map(item => <Link href="/gallery" key={item.id}><img src={item.imageUrl} alt={(loc === "fr" ? item.altFr : item.altEn) ?? ""} loading="lazy" /><span>{(loc === "fr" ? item.captionFr : item.captionEn) ?? ""}</span></Link>)}</div></section>}
      <section id="contact" className="preview-contact"><p className="preview-kicker">{t.contactKicker}</p><h2>{t.contactTitle}</h2><Link className="preview-button" href={BOOKING_URL}>{t.book} <span>↗</span></Link></section>
      <section className="home-visit"><div><p className="preview-kicker">Brossard · Québec</p><h2>{loc === "fr" ? "À bientôt au salon." : "See you at the salon."}</h2><address><BusinessAddressLink className="block" /><a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></address><a href={BUSINESS.mapsHref} target="_blank" rel="noreferrer" className="preview-text-link">{loc === "fr" ? "Obtenir l’itinéraire" : "Get directions"} ↗</a><Link href="/contact" className="preview-text-link">{loc === "fr" ? "Nous contacter" : "Contact us"} ↗</Link></div><div><h3>{loc === "fr" ? "Heures d’ouverture" : "Opening hours"}</h3><ul>{localizedHours(loc).map(row => <li key={row.days}><span>{row.days}</span><span>{row.open}</span></li>)}</ul></div></section>
    </div>
  );
}
