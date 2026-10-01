/** Short excerpts verified directly on the owner-provided Google Maps listing. */
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
];
