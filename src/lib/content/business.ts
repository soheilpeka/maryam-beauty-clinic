/**
 * Central provisional business identity.
 *
 * Address and phone come from the owner-provided official site/Maps sources. The email and
 * current hours below are owner-supplied public details, kept in one place so every view and
 * structured-content consumer stays in sync.
 */
export const HOURS = [
  { en: "Tuesday", fr: "Mardi", open: "10:00–16:00" },
  { en: "Wednesday", fr: "Mercredi", open: "10:00–18:00" },
  { en: "Thursday–Friday", fr: "Jeudi–vendredi", open: "10:00–21:00" },
  { en: "Saturday", fr: "Samedi", open: "10:00–16:00" },
  { en: "Sunday–Monday", fr: "Dimanche–lundi", open: "Closed" },
] as const;

export function localizedHours(locale: "en" | "fr") {
  return HOURS.map((row) => ({ days: locale === "fr" ? row.fr : row.en, open: locale === "fr" && row.open === "Closed" ? "Fermé" : row.open }));
}

export const BUSINESS = {
  name: "Maryam C Beauté",
  legalName: "Maryam C Beauté",
  heroTagline: "Hair, skin and beauty care in Brossard",
  neighborhood: "Brossard",
  address: "621 Av. Stravinski, Brossard, QC J4X 1Y7",
  streetAddress: "621 Av. Stravinski",
  city: "Brossard",
  region: "QC",
  postalCode: "J4X 1Y7",
  country: "CA",
  email: "Maryam_champir@yahoo.com",
  phone: "(450) 466-3120",
  phoneHref: "tel:+14504663120",
  timezone: "America/Toronto",
  currency: "CAD",
  serviceAreas: ["Brossard", "Montréal South Shore"],
  hours: localizedHours("en") as Array<{ days: string; open: string }>,
  hoursStatus: "owner-supplied" as const,
  officialSite: "https://maryamcbeaute.ca/",
  social: [
    { label: "Instagram", href: "https://www.instagram.com/maryamchampiri/" },
    { label: "Facebook", href: "https://www.facebook.com/maryam.c.beaute/" },
  ],
  instagramHref: "https://www.instagram.com/maryamchampiri/",
  facebookHref: "https://www.facebook.com/maryam.c.beaute/",
  whatsappHref:
    "https://api.whatsapp.com/send/?phone=14388792513&text=Hi%2C+send+us+a+message+or+your+question%21&type=phone_number&app_absent=0",
  mapsHref: "https://maps.app.goo.gl/xjk753CJMQSqXuJeA",
  googleMapsReviewsHref: "https://maps.app.goo.gl/xjk753CJMQSqXuJeA",
} as const;

export type BusinessInfo = typeof BUSINESS;
