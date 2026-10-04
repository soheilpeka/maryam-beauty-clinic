/** Short excerpts from reviews on the salon's Google listing, cross-checked against its public review profile. */
export interface Testimonial {
  quote: string;
  author: string;
  location: string;
  rating: 5;
  date: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "Maryam is very professional. She does her work with great care and precision.",
    author: "Hilda Teymoorzadeh",
    location: "Google Maps",
    rating: 5,
    date: "5 months ago",
  },
  {
    quote: "Laser hair removal with Ghazaleh is amazing. She is so sweet and friendly and the treatment was so worth it.",
    author: "Amanda De Melo",
    location: "Google Maps",
    rating: 5,
    date: "4 months ago",
  },
  {
    quote: "Really appreciate my experience for hair removal Lazer with Ghazaleh, she took the time to explain clearly and she is very professional.",
    author: "Minakshi Fagoo",
    location: "Google Maps",
    rating: 5,
    date: "3 months ago",
  },
  {
    quote: "I had a great experience at Maryam C Beauté!",
    author: "Tareq Tamanna",
    location: "Google Maps",
    rating: 5,
    date: "2026-10-01",
  },
  {
    quote: "Amazing experience at Maryam C Beauté!",
    author: "Soheil",
    location: "Google Maps",
    rating: 5,
    date: "2026-10-01",
  },
  {
    quote: "Maryam et l'équipe sont très gentilles",
    author: "Najla",
    location: "Google Maps",
    rating: 5,
    date: "2026-10-02",
  },
];
