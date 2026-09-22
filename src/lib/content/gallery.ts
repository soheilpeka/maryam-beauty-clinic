/**
 * Gallery - real images from the live site (downloaded to /public/images).
 * Captions are the alt text used by the live site.
 */
export interface GalleryItem {
  slug: string;
  title: string;
  caption: string;
  image: string;
  /** Filter tag used by the gallery. */
  tag: "Laser" | "Skin" | "Body" | "Brows";
  span?: boolean;
}

export const GALLERY_INTRO =
  "There may be no better way to communicate what we do than through images. As you browse our site, take a few moments to let your eyes linger here, and see if you can get a feel for our signature touch.";

export const GALLERY: GalleryItem[] = [
  {
    slug: "laser-hair-removal",
    title: "Laser hair removal",
    caption: "Get visibly smooth skin with our advanced laser technology.",
    image: "/images/gallery-laser.png",
    tag: "Laser",
  },
  {
    slug: "facial-treatment",
    title: "Facial treatment",
    caption: "Our Phi certified esthetician performs organic facials.",
    image: "/images/gallery-facial.png",
    tag: "Skin",
  },
  {
    slug: "microneedling",
    title: "Microneedling",
    caption: "Phi microneedling for refined texture and renewed skin.",
    image: "/images/gallery-microneedling.png",
    tag: "Skin",
  },
  {
    slug: "body-contouring",
    title: "Body contouring",
    caption: "Advanced RF body contouring technology targets stubborn areas.",
    image: "/images/gallery-body.png",
    tag: "Body",
    span: true,
  },
  {
    slug: "hair-growth",
    title: "Hair growth",
    caption: "Our experts use state-of-the-art hair restoration technology.",
    image: "/images/gallery-hair.png",
    tag: "Skin",
  },
  {
    slug: "eyebrow-microblading",
    title: "Eyebrow Microblading",
    caption: "Our Phi Certified estheticians use new techniques.",
    image: "/images/gallery-microblading.png",
    tag: "Brows",
  },
  {
    slug: "clinic-detail-1",
    title: "The clinic",
    caption: "A calm, considered space designed around your comfort.",
    image: "/images/gallery-1.png",
    tag: "Skin",
  },
  {
    slug: "clinic-detail-2",
    title: "The clinic",
    caption: "Every visit is designed to feel unhurried and entirely your own.",
    image: "/images/gallery-2.png",
    tag: "Body",
    span: true,
  },
];

export const GALLERY_TAGS = ["All", "Laser", "Skin", "Body", "Brows"] as const;