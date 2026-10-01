import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function GiftCardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const french = locale === "fr";
  return (
    <div className="editorial-page editorial-container unavailable-editorial">
      <p className="eyebrow">{french ? "Cartes-cadeaux" : "Gift cards"}</p>
      <h1 className="display-heading mt-4 text-5xl">{french ? "Bientôt disponible." : "Coming soon."}</h1>
      <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
        {french
          ? "Les conditions des cartes-cadeaux doivent être confirmées avant leur mise en vente."
          : "Gift-card terms must be confirmed before they are offered for sale."}
      </p>
    </div>
  );
}
