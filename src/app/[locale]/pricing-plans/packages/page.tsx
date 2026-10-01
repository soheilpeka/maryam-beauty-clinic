import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/routing";
import { formatPrice } from "@/lib/content/format";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PackagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const french = locale === "fr";
  const packages = await prisma.package.findMany({ where: { active: true, slug: { not: "demo-skin-reset" } }, include: { services: { include: { service: true } } }, orderBy: { order: "asc" } });
  return (
    <div className="editorial-page editorial-container packages-editorial">
      <p className="eyebrow">{french ? "Forfaits" : "Packages"}</p>
      <h1 className="display-heading mt-4 text-5xl">{french ? "Forfaits" : "Packages"}</h1>
      {!packages.length && <p className="mt-6 max-w-xl text-muted-foreground">
        {french
          ? "Les forfaits et les tarifs seront publiés après l’approbation de la propriétaire."
          : "Packages and pricing will be published after owner approval."}
      </p>}
      <div className="mt-12 grid gap-8 md:grid-cols-2">{packages.map(item => <article key={item.id} className="rounded-2xl border border-border bg-card p-6">{item.imageUrl && <img src={item.imageUrl} alt={french ? item.nameFr : item.name} className="mb-6 aspect-[4/3] w-full object-cover" />}{item.badge && <p className="eyebrow">{item.badge}</p>}<h2 className="font-serif text-3xl">{french ? item.nameFr : item.name}</h2><p className="mt-4 text-muted-foreground">{french ? item.descriptionFr : item.description}</p><p className="mt-5">{item.price ? formatPrice(item.price) : french ? "Prix confirmé lors de la consultation" : "Price confirmed during consultation"} · {item.sessions} {french ? "séances" : "sessions"}</p>{item.validityDays && <p>{french ? "Validité" : "Validity"}: {item.validityDays} {french ? "jours" : "days"}</p>}<ul className="my-6 space-y-2">{item.services.filter(link => link.service.active).map(({ service }) => <li key={service.id}><Link href={`/service-page/${service.slug}`} className="underline underline-offset-4">{french ? service.nameFr ?? service.name : service.name}</Link></li>)}</ul><Link href="/contact" className="inline-block rounded-full bg-primary px-5 py-3 text-primary-foreground">{french ? "Nous contacter" : "Ask the salon"}</Link></article>)}</div>
    </div>
  );
}
