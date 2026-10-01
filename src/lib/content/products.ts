/**
 * Maryam C Beauté - demo store catalog.
 *
 * DEMO PLACEHOLDERS: these are sample retail products for the store extension. Prices are
 * in integer cents (CAD). The seed imports this so the public store and the admin list
 * share one source of truth, exactly like SERVICES does for the booking catalog.
 *
 * Images reuse the clinic's existing gallery assets in /public/images so no new binary
 * assets are required; replace them with real product photography before going live.
 */

export interface DemoProduct {
  slug: string;
  sku: string;
  name: string;
  nameFr: string;
  category: string;
  /** Price in cents (CAD) */
  price: number;
  /** Optional "was" price in cents, for sale display only */
  compareAtPrice?: number;
  description: string;
  descriptionFr: string;
  image: string;
  stock: number;
  featured?: boolean;
}

export const PRODUCT_CATEGORIES = [
  "Skincare",
  "Haircare",
  "Brow & Lash",
  "Devices",
  "Gift Cards",
] as const;

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    slug: "vitamin-c-brightening-serum",
    sku: "DEMO-SKIN-001",
    name: "Vitamin C Brightening Serum",
    nameFr: "Sérum visage à la vitamine C",
    category: "Skincare",
    price: 8500,
    compareAtPrice: 11000,
    description: "Demo catalog item: a lightweight face serum placeholder for the clinic's future retail selection.",
    descriptionFr: "Article de démonstration : un sérum visage léger servant d'exemple pour la future sélection de détail de la clinique.",
    image: "/images/gallery-facial.png",
    stock: 24,
    featured: true,
  },
  {
    slug: "hyaluronic-hydra-cream",
    sku: "DEMO-SKIN-002",
    name: "Hyaluronic Hydra Cream",
    nameFr: "Crème hydratante quotidienne",
    category: "Skincare",
    price: 6500,
    description: "Demo catalog item: a daily face cream placeholder. Replace with verified ingredients and directions before launch.",
    descriptionFr: "Article de démonstration : une crème visage quotidienne. Remplacez le texte par des ingrédients et directives vérifiés avant le lancement.",
    image: "/images/gallery-facial.png",
    stock: 40,
  },
  {
    slug: "phi-microneedling-aftercare-kit",
    sku: "DEMO-SKIN-003",
    name: "Phi Microneedling Aftercare Kit",
    nameFr: "Ensemble de soins doux",
    category: "Skincare",
    price: 9500,
    description: "Demo catalog item: a two-piece skincare set placeholder. It is not medical advice or a treatment recommendation.",
    descriptionFr: "Article de démonstration : un ensemble de soins en deux pièces. Il ne constitue ni un avis médical ni une recommandation de traitement.",
    image: "/images/gallery-microneedling.png",
    stock: 18,
  },
  {
    slug: "scalp-nutrient-tonic",
    sku: "DEMO-HAIR-001",
    name: "Scalp Nutrient Tonic",
    nameFr: "Tonique pour le cuir chevelu",
    category: "Haircare",
    price: 12000,
    description: "Demo catalog item: a leave-in haircare placeholder with no therapeutic or hair-growth claim.",
    descriptionFr: "Article de démonstration : un soin capillaire sans rinçage, sans allégation thérapeutique ni promesse de croissance.",
    image: "/images/gallery-hair.png",
    stock: 12,
    featured: true,
  },
  {
    slug: "keratin-repair-shampoo",
    sku: "DEMO-HAIR-002",
    name: "Keratin Repair Shampoo",
    nameFr: "Shampoing soin réparateur",
    category: "Haircare",
    price: 4200,
    description: "Demo catalog item: a 300 ml shampoo placeholder for a future verified retail product.",
    descriptionFr: "Article de démonstration : un shampoing de 300 ml servant d'exemple pour un futur produit de détail vérifié.",
    image: "/images/gallery-hair.png",
    stock: 60,
  },
  {
    slug: "phi-brow-fixing-gel",
    sku: "DEMO-BROW-001",
    name: "Phi Brow Fixing Gel",
    nameFr: "Gel coiffant transparent pour sourcils",
    category: "Brow & Lash",
    price: 3800,
    description: "Demo catalog item: a clear brow styling gel placeholder. Replace with verified formula details before launch.",
    descriptionFr: "Article de démonstration : un gel coiffant transparent pour sourcils. Remplacez le texte par les détails vérifiés de la formule avant le lancement.",
    image: "/images/gallery-microblading.png",
    stock: 35,
  },
  {
    slug: "lash-lift-conditioning-serum",
    sku: "DEMO-BROW-002",
    name: "Lash Lift Conditioning Serum",
    nameFr: "Sérum revitalisant pour cils",
    category: "Brow & Lash",
    price: 5400,
    description: "Demo catalog item: a cosmetic lash-conditioning placeholder with no growth or medical claim.",
    descriptionFr: "Article de démonstration : un soin cosmétique pour les cils, sans allégation de croissance ni allégation médicale.",
    image: "/images/gallery-microblading.png",
    stock: 28,
  },
  {
    slug: "sharplight-home-laser-handset",
    sku: "DEMO-ACC-001",
    name: "Sharplight Home Laser Handset",
    nameFr: "Appareil de beauté à domicile",
    category: "Devices",
    price: 29900,
    compareAtPrice: 34900,
    description: "Demo catalog item: a beauty-device placeholder. No device specifications, safety claims or clinic equivalence are asserted.",
    descriptionFr: "Article de démonstration : un appareil de beauté fictif. Aucune caractéristique, allégation de sécurité ou équivalence clinique n'est affirmée.",
    image: "/images/gallery-laser.png",
    stock: 6,
  },
  {
    slug: "facial-cleansing-brush",
    sku: "DEMO-ACC-002",
    name: "Facial Cleansing Brush",
    nameFr: "Brosse nettoyante pour le visage",
    category: "Devices",
    price: 14500,
    description: "Demo catalog item: a cosmetic cleansing accessory placeholder. Product specifications have not been supplied.",
    descriptionFr: "Article de démonstration : un accessoire de nettoyage cosmétique. Les caractéristiques du produit n'ont pas encore été fournies.",
    image: "/images/gallery-facial.png",
    stock: 0,
  },
  {
    slug: "gift-card-100",
    sku: "DEMO-GIFT-100",
    name: "Gift Card - $100",
    nameFr: "Carte-cadeau - 100 $",
    category: "Gift Cards",
    price: 10000,
    description: "Demo catalog item only. Gift-card delivery, redemption and expiry terms are not configured.",
    descriptionFr: "Article de démonstration seulement. La livraison, l'utilisation et les conditions d'expiration ne sont pas configurées.",
    image: "/images/gallery-microblading.png",
    stock: 999,
  },
  {
    slug: "gift-card-200",
    sku: "DEMO-GIFT-200",
    name: "Gift Card - $200",
    nameFr: "Carte-cadeau - 200 $",
    category: "Gift Cards",
    price: 20000,
    description: "Demo catalog item only. Gift-card delivery, redemption and expiry terms are not configured.",
    descriptionFr: "Article de démonstration seulement. La livraison, l'utilisation et les conditions d'expiration ne sont pas configurées.",
    image: "/images/gallery-1.png",
    stock: 999,
  },
];
