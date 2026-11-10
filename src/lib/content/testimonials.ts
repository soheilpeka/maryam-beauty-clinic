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
    quote: "I went in for a men’s haircut and was impressed by the level of care and attention I received.",
    author: "tareq tamanna",
    location: "Google Maps",
    rating: 5,
    date: "2026-10-01",
  },
  {
    quote: "I had a great laser hair removal experience with Ghazale! She is very professional, skilled, and attentive.",
    author: "Mina Yavari",
    location: "Google Maps",
    rating: 5,
    date: "2 weeks ago",
  },
  {
    quote: "I am very pleased with the results I have got. Ghazaleh is a well-trained professional who is also always very considerate…",
    author: "Mahsa Salehi",
    location: "Google Maps",
    rating: 5,
    date: "3 weeks ago",
  },
  {
    quote: "If there's anyone I'm comfortable enough to do my laser with it's Ghazaleh. She is absolutely amazing and kind.",
    author: "kimia",
    location: "Google Maps",
    rating: 5,
    date: "a month ago",
  },
  {
    quote: "Maryam et l'équipe sont très gentilles",
    author: "Najla",
    location: "Google Maps",
    rating: 5,
    date: "2026-10-02",
  },
];
