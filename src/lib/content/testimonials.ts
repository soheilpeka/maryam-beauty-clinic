/**
 * Testimonials - VERBATIM from the live site homepage.
 * These are the reviews published by the business; not invented.
 */
export interface Testimonial {
  quote: string;
  author: string;
  location: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I am so happy with the service I received at Maryam Beauty Clinic. The staff was friendly and professional, and the results were amazing. I would definitely recommend this place to anyone looking for quality beauty treatments.",
    author: "Samantha Smith",
    location: "Thornhill",
  },
  {
    quote:
      "I recently visited Maryam Beauty Clinic for a facial, and I was blown away by the results. My skin looked and felt amazing after just one treatment. I will definitely be going back for more services in the future.",
    author: "Amy Jones",
    location: "North York",
  },
  {
    quote:
      "I had an amazing experience at Maryam Beauty Clinic. The staff was knowledgeable and professional, and the treatments were top-notch. I would highly recommend this place to anyone looking for a relaxing and rejuvenating beauty experience.",
    author: "Olivia Heart",
    location: "Richmond Hill",
  },
];