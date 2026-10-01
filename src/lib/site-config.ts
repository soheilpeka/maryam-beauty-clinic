import { BUSINESS } from "@/lib/content/business";

/** All public booking CTAs stay on the internal request-and-approve flow. */
export const BOOKING_URL = "/booking";

export const SOCIAL_LINKS = {
  instagram: BUSINESS.instagramHref,
  facebook: BUSINESS.facebookHref,
} as const;
