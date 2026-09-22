/**
 * Packages and special offers - VERBATIM from the live site
 * (https://www.maryambeautyclinic.ca/pricing-plans/packages and the homepage offers).
 */
export interface Package {
  slug: string;
  name: string;
  /** Booking price in integer cents (CAD). */
  price: number;
  /** Display price string, as shown on the live site. */
  priceLabel: string;
  cadence: string;
  validity: string;
  /** Included features, as listed on the live site. */
  features: string[];
  /** Highlight badge on the live site, if any. */
  badge?: string;
  /** Marketing summary. */
  summary: string;
}

export const PACKAGES: Package[] = [
  {
    slug: "microneedling-package",
    name: "Microneedling",
    price: 50000,
    priceLabel: "$500",
    cadence: "3 Sessions",
    validity: "Valid for 3 months",
    features: ["3 Treatments", "Free consultation"],
    badge: "Best Value",
    summary:
      "A curated series of three microneedling sessions with a complimentary consultation, designed for progressive skin renewal.",
  },
  {
    slug: "hair-removal-full-body",
    name: "Hair Removal Full Body",
    price: 150000,
    priceLabel: "$1,500",
    cadence: "1 Year",
    validity: "Valid for 12 months",
    features: ["Free consultation"],
    summary:
      "A full year of laser hair removal across the whole body, beginning with a complimentary consultation.",
  },
  {
    slug: "monthly-facial",
    name: "Monthly Facial",
    price: 0,
    priceLabel: "$0",
    cadence: "Free Consultation",
    validity: "Free Plan",
    features: ["4 + 1 Session Free", "Types of Facials"],
    summary:
      "Begin with a free consultation: buy four monthly facials and the fifth session is on us, across our range of facials.",
  },
];

/**
 * Homepage special offer section - copy verbatim from the live site.
 */
export const SPECIAL_OFFER = {
  eyebrow: "Special Offers",
  heading: "Get exciting discount on our services",
  banner: "January Special:",
} as const;