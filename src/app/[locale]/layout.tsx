import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartProvider } from "@/components/store/cart-context";
import { BUSINESS } from "@/lib/content/business";
import { publicServices } from "@/lib/public-content";
import "../globals.css";

// Navigation reads owner-managed content and must not be frozen at build time.
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://maryamcbeaute.ca";
  const title = locale === "fr" ? "Maryam C Beauté | La beauté, avec intention" : "Maryam C Beauté | Modern beauty, considered";
  const description = locale === "fr"
    ? "Coiffure, maquillage et soins esthétiques chez Maryam C Beauté à Brossard, Québec."
    : "Hair, makeup and aesthetic services at Maryam C Beauté in Brossard, Québec.";
  return {
    title,
    description,
    metadataBase: new URL(base),
    openGraph: {
      title,
      description,
      url: base,
      siteName: "Maryam C Beauté",
      locale: locale === "fr" ? "fr_CA" : "en_CA",
      type: "website",
      images: [{ url: "/preview/hero-trends-2026.png", alt: "Maryam C Beauté" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `${base}/${locale}`,
      languages: { en: `${base}/en`, fr: `${base}/fr` },
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const [messages, tNav] = await Promise.all([
    getMessages(),
    getTranslations({ locale, namespace: "Nav" }),
  ]);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://maryamcbeaute.ca";
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "@id": `${base}/#business`,
    name: BUSINESS.name,
    url: base,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    image: `${base}/preview/hero-trends-2026.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.region,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.country,
    },
    sameAs: BUSINESS.social.map((item) => item.href),
  };

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <CartProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
            >
              {tNav("skipToContent")}
            </a>
            <SiteHeader services={await publicServices(locale === "fr" ? "fr" : "en")} />
            <main id="main" className="min-h-[calc(100dvh-6rem)]">
              {children}
            </main>
            <SiteFooter />
            </CartProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
