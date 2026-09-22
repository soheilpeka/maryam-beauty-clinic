/**
 * Maryam Beauty Clinic - complete service catalog.
 *
 * SOURCE OF TRUTH: the live site (https://www.maryambeautyclinic.ca/book-online and the
 * five /service-page/* detail pages). Names, price labels, booking prices and durations
 * are verbatim. Nothing here is invented.
 *
 * - priceLabel: the marketing price as displayed on the live site (e.g. "From $70").
 * - price: the booking price in integer cents (CAD), used by the booking engine.
 *   For three services the live site's label and its booking price differ; both are kept.
 * - duration: treatment duration in minutes.
 * - detail: long-form copy, present for the five services that have a real detail page.
 */
import type { Locale } from "@/i18n/routing";

export type ServiceCategory =
  | "Laser"
  | "Hair"
  | "Microneedling"
  | "Facial"
  | "Eyebrow & Lash";

export interface ServiceDetail {
  /** Short standfirst shown under the title. */
  tagline: string;
  /** Long-form description paragraphs, verbatim from the live detail page. */
  paragraphs: string[];
  /** Highlights / key points rendered as a list. */
  highlights: string[];
}

export interface Service {
  slug: string;
  name: string;
  category: ServiceCategory;
  priceLabel: string;
  /** Booking price in integer cents (CAD). */
  price: number;
  /** Treatment duration in minutes. */
  duration: number;
  /** One-line summary for cards. */
  summary: string;
  /** Gallery image in /public/images. */
  image: string;
  /** Full detail-page content, when the live site has one. */
  detail?: ServiceDetail;
  order: number;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Laser",
  "Microneedling",
  "Facial",
  "Hair",
  "Eyebrow & Lash",
];

export const CATEGORY_LABEL: Record<ServiceCategory, { en: string; fr: string }> = {
  Laser: { en: "Laser", fr: "Laser" },
  Hair: { en: "Hair", fr: "Cheveux" },
  Microneedling: { en: "Microneedling", fr: "Microneedling" },
  Facial: { en: "Facial", fr: "Soin du visage" },
  "Eyebrow & Lash": { en: "Eyebrow & Lash", fr: "Sourcils & Cils" },
};

export function categoryLabel(cat: ServiceCategory, locale: Locale): string {
  return CATEGORY_LABEL[cat][locale];
}

export const SERVICES: Service[] = [
  {
    slug: "womens-laser-hair-removal",
    name: "Women's Laser Hair removal",
    category: "Laser",
    priceLabel: "From $70 (depends on the area)",
    price: 7000,
    duration: 30,
    summary:
      "Long-term hair reduction for women with Sharplight DPC laser technology, tailored to your skin and comfort.",
    image: "/images/gallery-laser.png",
    order: 1,
    detail: {
      tagline: "Smooth skin. Less maintenance.",
      paragraphs: [
        "Come to know how soft skin can be achieved at Maryam Beauty Clinic, which is conveniently located on Yonge & Steeles and serves clients from Toronto, Markham, Vaughan, Richmond Hill, North York and Thornhill. Our clinic has specialized in removing hair for women using a sophisticated technology called Sharplight DPC (Dynamic Pulse Control) laser that will provide you with the required results.",
        "To give you the best outcome possible, our team of experts is committed to offer you with a comfortable safe environment. We are here to help whether it's about getting rid of unwanted hair or boosting your natural skin glow through various services we offer just for you that make your self-confidence increase and leave you looking beautiful.",
        "Forget about the old methods of eliminating hair and welcome Sharplight DPC technology that accurately targets hair follicles thus giving a lasting solution to unwanted hairs. We have treatments for all types of skins as well as colored hairs where we always engage experienced therapist who will tailor make one for you.",
        "We at Maryam Beauty Clinic believe beauty should be easily accessible. This is why our beauty salon is placed in such a way that it can easily be reached from many areas around Toronto. Make advance booking today and see the difference on yourself. Join several other clients who have used us thereby improving their looks and confidence levels. Begin your journey towards flawless skin by visiting Maryam Beauty Clinic today.",
      ],
      highlights: [
        "Sharplight DPC (Dynamic Pulse Control) laser technology",
        "Treatments for all skin types and hair colours",
        "Serving Toronto, Markham, Vaughan, Richmond Hill, North York & Thornhill",
        "Experienced therapists, tailored treatment plans",
      ],
    },
  },
  {
    slug: "mens-laser-hair-removal",
    name: "Men's Laser Hair Removal",
    category: "Laser",
    priceLabel: "From $70 (depends on the area)",
    price: 7000,
    duration: 30,
    summary:
      "Long-term hair reduction for men with Sharplight DPC laser, tailored to your skin type and comfort.",
    image: "/images/gallery-laser.png",
    order: 2,
  },
  {
    slug: "acne-treatment",
    name: "Acne Treatment",
    category: "Laser",
    priceLabel: "From $100 (depends on the area)",
    price: 10000,
    duration: 30,
    summary:
      "Targeted laser and light therapy to clear active breakouts and calm acne-prone skin.",
    image: "/images/gallery-facial.png",
    order: 3,
  },
  {
    slug: "photo-facial-treatment",
    name: "Photo Facial Treatment",
    category: "Laser",
    priceLabel: "From $100 (Face, Neck, Hang)",
    price: 10000,
    duration: 30,
    summary:
      "Intense pulsed light treatment for face, neck and decolletage to even tone and boost radiance.",
    image: "/images/gallery-facial.png",
    order: 4,
  },
  {
    slug: "spot-treatment",
    name: "Spot Treatment",
    category: "Laser",
    priceLabel: "From $100 (depends on the number)",
    price: 10000,
    duration: 30,
    summary:
      "Precise laser treatment for individual spots, sun damage and pigmentation.",
    image: "/images/gallery-laser.png",
    order: 5,
  },
  {
    slug: "carbon-laser",
    name: "Carbon Laser (Hollywood peeling)",
    category: "Laser",
    priceLabel: "From $100 (depends on the area)",
    price: 20000,
    duration: 30,
    summary:
      "The 'Hollywood peel' - a carbon-assisted laser facial for instantly brighter, smoother skin.",
    image: "/images/gallery-facial.png",
    order: 6,
  },
  {
    slug: "face-vascular-lesion-treatment",
    name: "Face Vascular Lesion Treatment",
    category: "Laser",
    priceLabel: "From $100 (depends on the area)",
    price: 10000,
    duration: 30,
    summary:
      "Laser treatment for facial vascular lesions, spider veins and redness.",
    image: "/images/gallery-laser.png",
    order: 7,
  },
  {
    slug: "hair-growth-treatment",
    name: "Hair growth Treatment",
    category: "Hair",
    priceLabel: "From $200 (depends on the area)",
    price: 20000,
    duration: 30,
    summary:
      "Mesotherapy for hair - a non-surgical treatment delivering vitamins and nutrients to the scalp to support healthy hair growth.",
    image: "/images/gallery-hair.png",
    order: 8,
    detail: {
      tagline: "Support fuller, healthier hair over time.",
      paragraphs: [
        "Hair loss can be very damaging to one's self-esteem and confidence. That is why we are committed to finding effective personalized solutions for this challenging condition. Mesotherapy is a cutting-edge treatment, which is non-surgical and aims at combating hair loss while promoting healthy hair growth.",
        "Located at Yonge & Steeles, our clinic is the ultimate destination for clients seeking hair restoration solutions in the Greater Toronto Area including Toronto, Markham, Vaughan, Richmond Hill, North York and Thornhill.",
        "Mesotherapy involves injecting a customized blend of vitamins, minerals and other nutrients directly into the scalp using this new technique of precision. This direct application method guarantees quick absorption for maximum efficiency of the treatment.",
        "At Maryam Beauty Clinic our experienced specialists take it upon themselves to walk along with you through your hair loss journey. We recognize that individual needs vary considerably necessitating us to formulate specific treatments plans for each patient's individual goals or concerns. If your concern is thinning of hair or patchy hair loss then our Mesotherapy will help bring your scalp back to life and promote vibrant healthy hairs all over it.",
        "The greatest aspect about Mesotherapy results from its ability to nourish and rejuvenate the follicles within. This way we can tackle various underlying causes such as nutrient deficiencies hormonal imbalances or even problems related to the scalp by supplying essential nutrients where they are needed most.",
        "Mesotherapy has become famous due to minimal invasion hence more efficient procedures. With no surgeries involved, mesotherapies provide gentle experiences which are also comforting meaning that they may not need much time off work. This means that you could have these treatments done without interrupting your daily activities in any way since they fit well with people who have little or no free time due to their busy lifestyles.",
      ],
      highlights: [
        "Non-surgical Mesotherapy for hair",
        "Customized blend of vitamins, minerals and nutrients",
        "Targets thinning and patchy hair loss",
        "Minimal invasion, no downtime",
      ],
    },
  },
  {
    slug: "microneedling",
    name: "Microneedling",
    category: "Microneedling",
    priceLabel: "From $200 (depends on the area)",
    price: 20000,
    duration: 90,
    summary:
      "Phi Microneedling to refine texture, soften fine lines and restore a smooth, luminous complexion.",
    image: "/images/gallery-microneedling.png",
    order: 9,
    detail: {
      tagline: "Refine texture. Restore radiance.",
      paragraphs: [
        "Phi Microneedling provided by Maryam Beauty Clinic is perfect for bringing your skin back to life with visible improvements of a clean, radiant complexion. We are conveniently located at Yonge & Steeles, allowing us to serve customers from Markham, Toronto, Richmond Hill, Vaughan, Thornhill as well as North York, and provide them with high-quality laser treatments and skincare services individually developed based on their specific needs.",
        "Phi Microneedling is an innovative procedure that employs little needles that create small microchannels within the epidermis. It's basically a noninvasive technique aimed at increasing the amount of collagen produced by the body which is a protein responsible for maintaining young-looking and tight skin. Phi Microneedling strengthens collagen levels in order to minimize fine lines, wrinkles, scars while also reducing roughness and improving complexion tone.",
        "In addition to stimulating collagen production, these microchannels assist in more effective penetration of topical skincare products during the Phi Microneedling process. This means that all the useful elements contained in your cosmetics will be able to get deeper into your dermal layers so that they can perform better resulting in a more transformed look for you.",
        "Throughout treatment at Maryam Beauty Clinic we ensure that our clients feel comfortable and satisfied. We pay attention to each client's personal needs by analyzing their unique type of skin before designing individualized therapy courses just for them. We employ highly trained professionals using modern tools who render safe and convenient techniques of intervention.",
        "Look forward to having fresh glowing skin instead of dull lifeless one thanks to Phi Microneedling treatment being done on you. Make appointments with us at Maryam Beauty Clinic now in order to start moving towards achieving a healthy pretty skin you always dreamt about.",
      ],
      highlights: [
        "Phi Microneedling technique",
        "Stimulates collagen and elastin production",
        "Minimizes fine lines, wrinkles and scars",
        "Enhances absorption of topical skincare",
      ],
    },
  },
  {
    slug: "mini-facial",
    name: "Mini Facial",
    category: "Facial",
    priceLabel: "$70",
    price: 7000,
    duration: 30,
    summary: "A quick, refreshing facial to cleanse, exfoliate and hydrate.",
    image: "/images/gallery-facial.png",
    order: 10,
  },
  {
    slug: "facial-classic",
    name: "Facial Classic",
    category: "Facial",
    priceLabel: "$100",
    price: 10000,
    duration: 60,
    summary:
      "Our signature facial: skin analysis, cleanse, exfoliation and deep moisturizing for every skin type.",
    image: "/images/gallery-facial.png",
    order: 11,
    detail: {
      tagline: "A signature skincare treatment, personalized for you.",
      paragraphs: [
        "Yonge & Steels' Maryam Beauty Clinic has the Facial Classic, which is an extraordinary skincare treat. Personalized and effective sessions are offered by this signature treatment for every type of skin. We serve clients from Toronto, Markham, Vaughan, Richmond Hill, North York, and Thornhill in our clinic with expert estheticians providing luxurious treatments.",
        "The facial begins with a comprehensive skin analysis by our professional estheticians. Through this crucial step we are able to customize treatments for your specific skin type or condition such as the reduction of fine lines and wrinkles, increase in hydration or giving you a healthy skin appearance.",
        "Then comes the relaxation and rejuvenation once we have established what your skin needs. Our estheticians will cleanse your skin thoroughly just to remove any impurities so that it can be ready for next stage. This is followed by exfoliation which eliminates dead cells on top of your skin exposing a smoother clearer layer below it. Apart from enhancing one's looks through improved texture of their skins surface this also boosts the ability of his/her body to take up beneficial ingredients that are used subsequently.",
        "The final step in treating a customer in Facial Classic is deep moisturizing whose main purpose is to maintain balance within her/his dermis so that it feels soft supple besides making someone look fresh always. As determined during the analysis process where your individual needs were identified; we select high quality moisturizers according to particular types of skins ensuring that each ingredient gives maximum benefits to your skin.",
        "More than just another beauty therapy session, Facial Classic at Maryam Beauty Clinic offers you complete care experience which makes you feel relaxed while leaving your face rejuvenated. The facial classic can help fight aging signs on the face and neck area among others leading to beautiful looking skins at all times.",
      ],
      highlights: [
        "Begins with a comprehensive skin analysis",
        "Deep cleanse and exfoliation",
        "Deep moisturizing with high-quality products",
        "Personalized for every skin type",
      ],
    },
  },
  {
    slug: "facial-vip",
    name: "Facial VIP",
    category: "Facial",
    priceLabel: "$200",
    price: 20000,
    duration: 90,
    summary:
      "Our most indulgent facial: extended analysis, advanced techniques and premium skincare.",
    image: "/images/gallery-facial.png",
    order: 12,
  },
  {
    slug: "carboxy-therapy",
    name: "Carboxy Therapy",
    category: "Facial",
    priceLabel: "$200",
    price: 20000,
    duration: 90,
    summary:
      "Carbon dioxide therapy to improve skin elasticity, dark circles and texture.",
    image: "/images/gallery-facial.png",
    order: 13,
  },
  {
    slug: "chemical-peeling",
    name: "Chemical Peeling",
    category: "Facial",
    priceLabel: "$200",
    price: 20000,
    duration: 60,
    summary:
      "A chemical peel to renew the skin surface, even tone and soften imperfections.",
    image: "/images/gallery-facial.png",
    order: 14,
  },
  {
    slug: "high-frequency-facial",
    name: "High Frequency Facial",
    category: "Facial",
    priceLabel: "$150",
    price: 15000,
    duration: 60,
    summary:
      "High-frequency current facial to treat acne, fine lines and promote circulation.",
    image: "/images/gallery-facial.png",
    order: 15,
  },
  {
    slug: "eye-treatment",
    name: "Eye Treatment",
    category: "Facial",
    priceLabel: "$80 (darkness, puffiness, wrinkle)",
    price: 8000,
    duration: 45,
    summary:
      "Targeted eye treatment for darkness, puffiness and wrinkles.",
    image: "/images/gallery-facial.png",
    order: 16,
  },
  {
    slug: "facial-contouring",
    name: "Facial Contouring",
    category: "Facial",
    priceLabel: "From $100 (depends on the area)",
    price: 10000,
    duration: 30,
    summary:
      "Non-invasive facial contouring to sculpt, lift and define your natural features.",
    image: "/images/gallery-facial.png",
    order: 17,
  },
  {
    slug: "body-contouring",
    name: "Body Contouring",
    category: "Facial",
    priceLabel: "From $100 (depends on the area)",
    price: 10000,
    duration: 30,
    summary:
      "Advanced RF body contouring technology to sculpt, tighten and define with natural results.",
    image: "/images/gallery-body.png",
    order: 18,
  },
  {
    slug: "shaping-eyebrow",
    name: "Shaping Eyebrow",
    category: "Eyebrow & Lash",
    priceLabel: "$50",
    price: 5000,
    duration: 30,
    summary: "Professional eyebrow shaping to frame your face.",
    image: "/images/gallery-microblading.png",
    order: 19,
  },
  {
    slug: "brow-laminate-lift",
    name: "Brow Laminate & Lift",
    category: "Eyebrow & Lash",
    priceLabel: "$100",
    price: 10000,
    duration: 30,
    summary:
      "Brow lamination and lift for fuller, perfectly groomed brows that last.",
    image: "/images/gallery-microblading.png",
    order: 20,
  },
  {
    slug: "microblading",
    name: "Microblading",
    category: "Eyebrow & Lash",
    priceLabel: "From $450",
    price: 55000,
    duration: 120,
    summary:
      "Phi Microblading - semi-permanent eyebrow tattooing that creates full, natural-looking brows for up to two years.",
    image: "/images/gallery-microblading.png",
    order: 21,
    detail: {
      tagline: "Perfectly sculpted brows, for up to two years.",
      paragraphs: [
        "In Maryam Beauty Clinic, at the intersection of Yonge and Steeles we offer Phi Microblading Eyebrows. This service is ideal for customers residing in Thornhill, North York, Richmond Hill Markham, Toronto Vaughan and other places across the GTA. Our experienced Phi technicians are specialized in this semi-permanent tattooing technique that makes brows look full thus appearing natural for up to two years.",
        "Microblading is right for you if you want to change the way your eyebrows look like. Maybe they have been reduced to nothing by plucking or just naturally thin, sparse and uneven, our Phi microblading will make them into looking full shaping perfectly sculpted eyebrows. Precisely each brow hair is created using a fine blade and pigment packed into the skin replicating how your own hair grows naturally throughout the detailed process.",
        "They act as frames on your face highlighting eyes being very first thing people see about it which is why we understand brows' significance in Maryam beauty clinic. We also take much time when consulting with our clients so that we can understand their preferences plus desired styles.",
        "Sick of having to draw in your eye brows every morning? Then let us transform them with our Phi microblading service so that you can go without maintenance having flawless ones hence saves time spent during beautifying yourself while keeping on top of your appearance all day long.",
        "Make an appointment now with Maryam Beauty Clinic where perfect brows are made possible rather than wished upon. Many clients trust us with reshaping their brows and you also can be a part of them to experience the long-lasting advantages that our expert Phi microblading provides.",
      ],
      highlights: [
        "Phi Microblading technique",
        "Semi-permanent results for up to two years",
        "Each brow hair drawn to replicate natural growth",
        "Detailed consultation on shape and style",
      ],
    },
  },
  {
    slug: "eyelash-extensions",
    name: "Eyelash Extensions",
    category: "Eyebrow & Lash",
    priceLabel: "From $100",
    price: 10000,
    duration: 30,
    summary:
      "Professional eyelash extensions for length, volume and a natural finish.",
    image: "/images/gallery-microblading.png",
    order: 22,
  },
  {
    slug: "lash-lift-laminate",
    name: "Lash Lift & Laminate",
    category: "Eyebrow & Lash",
    priceLabel: "From $100",
    price: 10000,
    duration: 30,
    summary:
      "Lash lift and lamination for curled, defined, low-maintenance lashes.",
    image: "/images/gallery-microblading.png",
    order: 23,
  },
  {
    slug: "tattoo-removal",
    name: "Tattoo removal",
    category: "Eyebrow & Lash",
    priceLabel: "From $150",
    price: 10000,
    duration: 30,
    summary:
      "Laser tattoo removal using Q-switched and picosecond technology for safe, gradual fading.",
    image: "/images/gallery-laser.png",
    order: 24,
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function servicesByCategory(category: ServiceCategory): Service[] {
  return SERVICES.filter((s) => s.category === category).sort((a, b) => a.order - b.order);
}

export function featuredServices(): Service[] {
  return [
    getServiceBySlug("womens-laser-hair-removal")!,
    getServiceBySlug("hair-growth-treatment")!,
    getServiceBySlug("microneedling")!,
    getServiceBySlug("facial-classic")!,
    getServiceBySlug("microblading")!,
  ];
}