/**
 * Business information - VERBATIM from the live site.
 * These are the real contact details; do not alter them.
 */
export const BUSINESS = {
  name: "Maryam Beauty Clinic",
  /** Hero tagline on the live site. */
  heroTagline: "Experience the Best of Beauty Treatments",
  neighborhood: "Yonge & Steeles",
  address: "180 Steeles Avenue West #27, Thornhill, ON, Canada",
  email: "maryamvares@gmail.com",
  phone: "647-615-8051",
  /** Phone formatted for tel: links. */
  phoneHref: "tel:+16476158051",
  smsHref: "sms:+16476158051",
  timezone: "America/Toronto",
  currency: "CAD",
  /** Service areas listed across the live site's pages. */
  serviceAreas: [
    "Toronto",
    "Markham",
    "Vaughan",
    "Richmond Hill",
    "North York",
    "Thornhill",
  ],
  hours: [
    { days: "Mon - Fri", open: "10am - 5pm" },
    { days: "Saturday", open: "11am - 4pm" },
    { days: "Sunday", open: "Closed" },
  ],
  social: [
    { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61551878311257" },
    { label: "Instagram", href: "https://www.instagram.com/maryambeauty_clinic/" },
  ],
  /** Google Maps directions query for the Get Directions link. */
  mapsHref: "https://www.google.com/maps/search/?api=1&query=Maryam+Beauty+Clinic+180+Steeles+Avenue+West+Thornhill",
} as const;

export type BusinessInfo = typeof BUSINESS;