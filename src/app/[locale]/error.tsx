"use client";
import { useLocale } from "next-intl";
import { EditorialHeading } from "@/components/editorial";
import { Link } from "@/i18n/routing";
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const fr = useLocale() === "fr";
  return <div className="editorial-page editorial-container"><EditorialHeading eyebrow="Maryam C Beauté" title={fr ? "Une petite interruption." : "A brief interruption."}>{fr ? "Impossible de charger cette page pour le moment. Réessayez ou revenez à l’accueil." : "We couldn’t load this page just now. Please try again or return to the homepage."}</EditorialHeading><div className="flex flex-wrap gap-8"><button className="editorial-action" onClick={retry}>{fr ? "Réessayer" : "Try again"}</button><Link className="editorial-action" href="/">{fr ? "Accueil" : "Home"}</Link></div></div>;
}
