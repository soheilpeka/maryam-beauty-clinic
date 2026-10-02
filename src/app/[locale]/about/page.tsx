import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { BUSINESS, localizedHours } from "@/lib/content/business";
import { BusinessAddressLink } from "@/components/business-address-link";

export const dynamic = "force-dynamic";

const copy = {
  en: {
    title: "About Maryam C Beauté | Brossard",
    description: "Discover the calm, personal approach at Maryam C Beauté in Brossard.",
    eyebrow: "About the studio", heading: "Beauty, with room to breathe.",
    body: "Maryam C Beauté is a beauty studio in Brossard where hair, skin and beauty services come together in a calm, personal setting. Every visit begins with a conversation about what you want and how you want to feel.",
    video: "A look inside the studio", videoFallback: "Your browser does not support the studio video.",
    visit: "Plan your visit", book: "Request an appointment", contact: "Contact the studio",
    hours: "Opening hours",
  },
  fr: {
    title: "À propos de Maryam C Beauté | Brossard",
    description: "Découvrez l'approche calme et personnalisée de Maryam C Beauté à Brossard.",
    eyebrow: "À propos du studio", heading: "La beauté, avec de l'espace pour respirer.",
    body: "Maryam C Beauté est un studio de beauté à Brossard où coiffure, soins de la peau et beauté se réunissent dans un cadre calme et personnel. Chaque visite commence par une conversation sur vos envies et la façon dont vous souhaitez vous sentir.",
    video: "À l'intérieur du studio", videoFallback: "Votre navigateur ne prend pas en charge la vidéo du studio.",
    visit: "Préparer votre visite", book: "Demander un rendez-vous", contact: "Contacter le studio",
    hours: "Heures d'ouverture",
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = copy[locale === "fr" ? "fr" : "en"];
  return { title: t.title, description: t.description, alternates: { canonical: `/${locale}/about`, languages: { en: "/en/about", fr: "/fr/about" } } };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = copy[locale === "fr" ? "fr" : "en"];
  const hours = localizedHours(locale === "fr" ? "fr" : "en");
  return <div className="editorial-page about-editorial"><section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[.85fr_1.15fr] lg:gap-20 lg:px-8 lg:py-24"><div className="self-center"><p className="eyebrow">{t.eyebrow}</p><h1 className="display-heading mt-4 text-5xl sm:text-6xl">{t.heading}</h1><p className="mt-8 max-w-xl text-base leading-8 text-muted-foreground">{t.body}</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/booking" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">{t.book}</Link><Link href="/contact" className="rounded-full border border-border px-6 py-3 text-sm font-medium">{t.contact}</Link></div></div><figure className="overflow-hidden rounded-3xl border border-border bg-black"><video className="aspect-[4/3] w-full object-cover" controls preload="metadata" poster="/media/salon/salon.webp"><source src="/media/about.mp4" type="video/mp4" />{t.videoFallback}</video><figcaption className="px-5 py-4 text-xs uppercase tracking-[.18em] text-white/70">{t.video}</figcaption></figure></section><section className="border-y border-border bg-card"><div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-20"><div><p className="eyebrow">{t.visit}</p><h2 className="display-heading mt-3 text-4xl"><BusinessAddressLink /></h2><p className="mt-5 text-sm leading-7 text-muted-foreground">{BUSINESS.phone} · {BUSINESS.email}</p><a href={BUSINESS.mapsHref} target="_blank" rel="noreferrer" className="mt-6 inline-flex text-sm font-medium text-brand underline underline-offset-4">{locale === "fr" ? "Voir l'itinéraire" : "Get directions"}</a></div><div><h2 className="font-serif text-2xl">{t.hours}</h2><ul className="mt-5 space-y-2 text-sm text-muted-foreground">{hours.map((row) => <li key={row.days} className="flex justify-between gap-6 border-b border-border py-2"><span>{row.days}</span><span className="text-foreground">{row.open}</span></li>)}</ul></div></div></section></div>;
}
